import express from "express";
import { Resend } from "resend";
import bodyParser from "body-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';
import session from 'express-session';
import nodemailer from 'nodemailer';
import flash from 'connect-flash';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from "express-rate-limit";
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { Queue } from 'bullmq';
import https from "https";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = process.env.PORT || 3000;
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const app = express();
const resend = new Resend(process.env.API_RESEND);

const isHttps = process.env.USE_HTTPS === 'true';
console.log("http", isHttps)

let pool;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(helmet());

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 5 * 60 * 1000
      }
  
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"]  
    }
  }
}));

app.use(flash());

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/');
}

function checkIfInSession(req, res, next){
  if(req.session && req.session.user){
    return res.redirect(req.session.user.usrAdmin ? "/adminpage" : `/userpage?id=${req.session.user.id}`);
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    res.redirect("/")
  }
  if (!req.session.user.usrAdmin) {
    res.redirect("/")
  }
  next();
}

const keyPath = "./server.key";
const certPath = "./server.cert";

async function initializeDatabase() {
  try {
    pool = await sql.connect(config);
    console.log("Connected to database");

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      https.createServer(options, app).listen(443, () => {
        console.log("HTTPS server running at https://localhost/login");
      });
    } else {
      app.listen(port, () => {
        console.log(` HTTPS files not found. HTTP server running at http://localhost:${port}`);
      });
    }
  } catch (err) {
    console.error("SQL connection error", err);
    process.exit(1);
  }
}

initializeDatabase();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 10,
  message: "Too many login attempts. Please try again later."
});


app.get('/login', checkIfInSession,(req, res) => {
  res.render('login.ejs');
});


app.post("/login", loginLimiter, async (req, res) => {
  let { username, password } = req.body;

  // Simple sanitization
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Invalid input." });
  }

  username = username.trim().toLowerCase();
  password = password.trim();

  try {
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT usrID, usrDesc, DepartmentID, usrAdmin 
        FROM tblUsers 
        WHERE LOWER(usrEmail) = @username AND usrPWD = @password
      `);

    if (result.recordset.length === 1) {
      const user = result.recordset[0];

      req.session.user = {
        id: user.usrID,
        name: user.usrDesc,
        usrAdmin: user.usrAdmin,
        DepartmentId: user.DepartmentID
      };

      return res.json({
        success: true,
        redirect: user.usrAdmin ? "/adminpage" : "/workFlowDash"
      });
    } else {
      return res.json({ success: false, message: "Invalid username or password" });
    }

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get("/addPackage", isAdmin,async (req, res) => {
res.render("packagefrom.ejs");
});


app.get("/workFlowDash",ensureAuthenticated ,async (req, res) => {
  try {
    const projects = await pool.request().query("SELECT projectID, projectName FROM tblProject");
    const package1 = await pool.request().query("SELECT * FROM tblPackages");
    const process = await pool.request().query("SELECT * FROM tblProcess")
    const isAdmin = req.session.user.usrAdmin
 

    res.render("workflowdashboard.ejs", { projects: projects.recordset, usrAdmin:isAdmin , packages: package1.recordset, processes:process.recordset });
  } catch (err) {
    console.error("Error loading projects:", err);
    res.status(500).send("Error loading dashboard");
  }
});


app.get('/api/users', async (req, res) => {
  const depId = req.query.depId;

  try {
    let query = `
      SELECT usrID, usrDesc
      FROM tblUsers
    `;
    if (depId) {
      query += ` WHERE DepartmentID = @depId`;
    }

    const request = pool.request();
    if (depId) request.input('depId', sql.Int, depId);

    const result = await request.query(query);

    res.json({ users: result.recordset });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});



app.get("/api/workFlowDashData", ensureAuthenticated, async (req, res) => {
  const projectID = req.query.projectID;
  const isAdmin = req.session.user.usrAdmin;
  const userDeptId = req.session.user.DepartmentId;

  try {
    // ✅ Mark workflows as completed if all tasks are done
   await pool.request().query(`
  UPDATE hdr
  SET 
    hdr.completionDate = GETDATE(),
    hdr.status = 'Completed',
    hdr.DaysDone = DATEDIFF(DAY, hdr.startDate, GETDATE())
  FROM tblWorkflowHdr hdr
  WHERE EXISTS (
      SELECT 1 FROM tblWorkflowDtl dtl
      WHERE dtl.workFlowHdrId = hdr.workFlowID
  )
  AND NOT EXISTS (
      SELECT 1 FROM tblWorkflowDtl dtl
      WHERE dtl.workFlowHdrId = hdr.workFlowID
        AND dtl.TimeFinished IS NULL
  )
  AND hdr.status != 'Completed'
  AND hdr.startDate IS NOT NULL
`);


    let query = `
      SELECT 
        hdr.WorkFlowID AS HdrID,
        p.ProcessName,
        pk.PkgeName AS PackageName,
        prj.projectID,
        prj.ProjectName,
        hdr.Status,
        hdr.completionDate,
        hdr.startDate,
        hdr.DaysDone,
        hdr.createdDate
      FROM tblWorkflowHdr hdr
      LEFT JOIN tblProcess p ON hdr.ProcessID = p.NumberOfProccessID
      LEFT JOIN tblPackages pk ON hdr.PackageID = pk.PkgeID
      LEFT JOIN tblProject prj ON hdr.ProjectID = prj.ProjectID
    `;

    const whereClauses = [];
    const request = pool.request();

    if (projectID) {
      request.input('ProjectID', sql.Int, projectID);
      whereClauses.push(`hdr.ProjectID = @ProjectID`);
    }

    if (!isAdmin) {
      request.input('UserDeptId', sql.Int, userDeptId);
      whereClauses.push(`
        EXISTS (
          SELECT 1 FROM tblProcessDepartment pd
          WHERE pd.ProcessID = hdr.ProcessID
            AND pd.DepartmentID = @UserDeptId
        )
      `);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += `
      ORDER BY 
        CASE WHEN hdr.Status = 'Pending' THEN 0 ELSE 1 END,
        hdr.Status ASC
    `;

    const result = await request.query(query);
    res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching workflow dashboard data:", err);
    res.status(500).json({ error: "Failed to fetch workflow dashboard data" });
  }
});








app.get("/userpage/:hdrId", async (req, res) => {
  const hdrId = req.params.hdrId;
  const sessionUser = req.session.user;

 if (!sessionUser) {
  return res.status(401).send("Unauthorized or session expired");
}

if (!sessionUser.usrAdmin && !sessionUser.DepartmentId) {
  return res.status(401).send("Unauthorized: Department not set for non-admin user");
}


  const DepId = sessionUser.DepartmentId;
  const usrId = sessionUser.id;

  try {
    const request1 = pool.request();
    request1.input('HdrID', sql.Int, hdrId);
    request1.input('DepId', sql.Int, DepId);
const tasksResult = await request1.query(`
  SELECT 
  t.TaskID,
  t.TaskName,
  t.TaskPlanned,
  t.IsTaskSelected,
  t.PlannedDate,
  t.DepId,
  t.Priority,
  t.PredecessorID,
  t.DaysRequired,
  t.WorkFlowHdrID,
  t.linkTasks,
  d.WorkflowDtlId,
  d.WorkflowName,
  d.TimeStarted,
  d.TimeFinished,
  d.DelayReason,
  d.Delay,
  d.assignUser,
  pr.NumberOfProccessID,
  pr.ProcessName,
  pj.ProjectID,
  pj.ProjectName,
  pk.PkgeName,
  dp.DeptName,
  pd.StepOrder 
FROM tblWorkflowDtl d
INNER JOIN tblTasks t ON d.TaskID = t.TaskID
INNER JOIN tblWorkflowHdr hdr ON d.workFLowHdrId = hdr.WorkFlowID
INNER JOIN tblProcess pr ON hdr.ProcessID = pr.NumberOfProccessID
INNER JOIN tblProject pj ON hdr.ProjectID = pj.ProjectID
INNER JOIN tblPackages pk ON pk.PkgeId = hdr.packageID
INNER JOIN tblDepartments dp ON dp.DepartmentID = t.DepId
INNER JOIN tblProcessDepartment pd ON pd.DepartmentID = t.DepId AND pd.ProcessID = pr.NumberOfProccessID 
WHERE d.workFLowHdrId = @HdrID
ORDER BY pd.StepOrder ASC, t.Priority ASC

`);

    const request2 = pool.request();
    request2.input('DepartmentID', sql.Int, DepId);

    const departmentResult = await request2.query(`
      SELECT DepartmentID, DeptName 
      FROM tblDepartments 
      WHERE DepartmentID = @DepartmentID
    `);

    const department = departmentResult.recordset[0] || { DeptName: 'Admin' };

    const user = {
      id: usrId,
      name: sessionUser.name,
      usrAdmin: sessionUser.usrAdmin,
      DepartmentId: sessionUser.DepartmentId,
      DeptName: department.DeptName
    };


    res.render("userpage.ejs", {
      tasks: tasksResult.recordset,
      hdrId,
      user
    });
  } catch (err) {
    console.error("Error loading user page with department info:", err);
    res.status(500).send("Failed to load user page.");
  }
});





app.get("/addProcess", isAdmin, async (req, res) => {
  try {
    const processesResult = await pool.request().query(`
      SELECT NumberOfProccessID, ProcessName, processDesc
      FROM tblProcess
    `);

    const processes = processesResult.recordset;

    const stepsResult = await pool.request().query(`
      SELECT p.ProcessID, p.StepOrder, d.DeptName
      FROM tblProcessDepartment p
      JOIN tblDepartments d ON p.DepartmentID = d.DepartmentID
      ORDER BY p.ProcessID, p.StepOrder
    `);

    const stepsByProcess = {};
    stepsResult.recordset.forEach(step => {
      if (!stepsByProcess[step.ProcessID]) stepsByProcess[step.ProcessID] = [];
      stepsByProcess[step.ProcessID].push(step);
    });

    const departmentsResult = await pool.request().query(`
      SELECT DepartmentID, DeptName FROM tblDepartments
    `);

    res.render("process", {
      processes,
      stepsByProcess,
      departments: departmentsResult.recordset,
      isAdmin: req.session.user.usrAdmin,
      departmentId: req.session.user.DepartmentID,
      errorMessage: null,
      successMessage:null
      
    });
  } catch (err) {
    console.error("Error loading processes:", err);

  res.render("process", {
  processes,
  stepsByProcess,
  departments: departmentsResult.recordset,
  isAdmin: req.session.user.usrAdmin,
  departmentId: req.session.user.DepartmentID,
  errorMessage: req.flash("error"),
  successMessage: req.flash("success")
});

  }
});




app.get('/api/tasks/by-department/:departmentID/by-process/:processID', async (req, res) => {
  const { departmentID, processID } = req.params;

  const query = `
    SELECT 
      T.TaskID,
      T.TaskName,
      T.PlannedDate,
      T.TaskPlanned,
      T.DaysRequired
    FROM tblTasks T
    WHERE T.DepId = @departmentID AND T.proccessID = @processID
    ORDER BY T.Priority;
  `;

  try {
    const result = await pool.request()
      .input('departmentID', sql.Int, departmentID)
      .input('processID', sql.Int, processID)
      .query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching tasks by department:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




app.get("/addWorkflow", isAdmin, async (req, res) => {
  try {
    const users = await pool.request().query("SELECT usrID, usrDesc FROM tblUsers");
    const tasks = await pool.request().query("SELECT TaskID, TaskName FROM tblTasks");
    const packages = await pool.request().query("SELECT PkgeID, PkgeName FROM tblPackages");

    res.render("assignWorkflow.ejs", {
      users: users.recordset,
      tasks: tasks.recordset,
      packages: packages.recordset
    });
  } catch (err) {
    console.error("Error loading workflow form:", err);
    res.status(500).send("Failed to load form data.");
  }
});

app.get("/addUser", isAdmin, async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT DepartmentID, DeptName FROM tblDepartments
    `);
    const departments = result.recordset;

    res.render("addUser", { departments }); 
  } catch (err) {
    console.error("Failed to load departments:", err);
    res.status(500).send("Error loading form");
  }
});

app.get('/userpage', ensureAuthenticated, async (req, res) => {
    const sessionUserId = req.session.user.id
    try {
        const userResult = await pool
            .request()
            .input('userId', sessionUserId)
            .query('SELECT usrDesc, DepartmentID FROM tblUsers WHERE usrID = @userId');

        const usrDetails = userResult.recordset[0];

        if (!usrDetails) {
            return res.status(404).send('User not found');
        }

        const { usrDesc, DepartmentID } = usrDetails;

        const deptResult = await pool
            .request()
            .input('DepId', DepartmentID)
            .query('SELECT DeptName DepartmentID FROM tblDepartments WHERE DepartmentID = @DepId');

        const deptDetails = deptResult.recordset[0];

        if (!deptDetails) {
            return res.status(404).send('Department not found');
        }

       

       
        const getProjects = await pool
                                 .request()
                                 .query('SELECT * FROM tblProject');
        const projects = getProjects.recordset;

        res.render('userpage', {
            userId: sessionUserId,
            departmentID: DepartmentID,
            usrDesc,
            department: deptDetails.DepartmentID,
            projects
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/api/tasks/my-department', async (req, res) => {
  try {
    const userId = req.session.user?.usrID || req.query.userId; // fallback if no session
    if (!userId) return res.status(400).json({ error: 'No user ID' });

    const pool = await sql.connect(config);

    // Get user's department
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT DepartmentID FROM tblUsers WHERE usrID = @userId');

    const departmentId = userResult.recordset[0]?.DepartmentID;
    if (!departmentId) return res.status(404).json({ error: 'Department not found' });

    // Get tasks from that department
    const taskResult = await pool.request()
      .input('DepId', sql.Int, departmentId)
      .query(`
        SELECT TaskName, TaskPlanned, Priority
        FROM tblTasks
        WHERE DepId = @DepId
        ORDER BY Priority ASC
      `);

    res.json(taskResult.recordset);
  } catch (err) {
    console.error('❌ Error fetching tasks:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



app.get('/process/:processId/tasks', async (req, res) => {
  const processId = req.params.processId;
  const userId = req.query.userId;

  try {
    const userResult = await pool
      .request()
      .input('userId', userId)
      .query('SELECT DepartmentID FROM tblUsers WHERE usrID = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDeptId = userResult.recordset[0].DepartmentID;

 const processDeptResult = await pool
  .request()
  .input('processId', processId)
  .input('departmentId', userDeptId)
  .query(`
    SELECT IsActive FROM tblProcessDepartment
    WHERE ProcessID = @processId AND DepartmentID = @departmentId
  `);
if (processDeptResult.recordset.length === 0) {
  return res.status(403).json({ error: 'User not in process-related department' });
}

const isActive = processDeptResult.recordset[0].IsActive;
if (!isActive) {
  return res.status(403).json({ error: 'Process not currently active in your department' });
}


   const tasksResult = await pool
  .request()
  .input('processId', processId)
  .input('departmentId', userDeptId)
  .query(
    `SELECT T.TaskID,T.TaskName,T.TaskPlanned, T.DepId,T.PlannedDate,T.isTaskSelected, T.isDateFixed,T.DaysRequired, W.Delay,W.TimeStarted,W.TimeFinished, W.DelayReason
     FROM tblTasks T
     JOIN tblWorkflowDtl W ON W.TaskID = T.TaskID
     JOIN tblProcessDepartment P ON P.DepartmentID = @departmentId AND P.ProcessID = @processId
     WHERE T.DepId = @departmentId
     ORDER BY Priority
    `
  );


    res.json(tasksResult.recordset);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/add-task', ensureAuthenticated, async (req, res) => {
  const processId = parseInt(req.query.processId, 10);
  const processName = req.query.process;

  let workflowDetails = null;
  let processSteps = [];
  let departments = [];
  let hasWorkflow = false; 

  try {

    let processName = req.query.process;

if (!processName) {
  const processNameResult = await pool.request()
    .input('processId', sql.Int, processId)
    .query(`
      SELECT ProcessName
      FROM tblProcess
      WHERE NumberOfProccessID = @processId
    `);

  if (processNameResult.recordset.length > 0) {
    processName = processNameResult.recordset[0].ProcessName;
  }
}

    // Check if process has workflow
    const workflowCheck = await pool.request()
      .input('processId', sql.Int, processId)
      .query(`
        SELECT TOP 1 processID
        FROM tblWorkflowHdr
        WHERE processID = @processId
      `);

    hasWorkflow = workflowCheck.recordset.length > 0;

    // Get process steps
    const stepsResult = await pool.request()
      .input('processId', sql.Int, processId)
      .query(`
        SELECT d.StepOrder, dp.DeptName, dp.DepartmentID
        FROM tblProcessDepartment d
        JOIN tblDepartments dp ON d.DepartmentID = dp.DepartmentID
        WHERE d.ProcessID = @processId
        ORDER BY d.StepOrder
      `);

    processSteps = stepsResult.recordset;

    departments = processSteps.map(step => ({
      DepartmentID: step.DepartmentID,
      DeptName: step.DeptName
    }));

    workflowDetails = {
      ProcessName: processName,
      ProcessID: processId,
    };

    if (departments.length === 0) {
      const departmentsResult = await pool.request().query(`SELECT * FROM tblDepartments`);
      departments = departmentsResult.recordset;
    }

    const workflowHdrResult = await pool.request().query(`SELECT * FROM tblWorkflowHdr`);

    res.render('task.ejs', {
      workflowDetails,
      workflow: workflowHdrResult.recordset,
      departments,
      processSteps,
      isAdmin: req.session.user.usrAdmin,
      departmentId: req.session.user.DepartmentID,
      success: null,
      hasWorkflow 
    });

  } catch (err) {
    console.error("Error in /add-task:", err);
    res.status(500).send("Server error");
  }
});



app.get('/api/tasks', ensureAuthenticated, async (req, res) => {
  try {
    const processId = parseInt(req.query.processId);
    if (!processId) {
      return res.status(400).json({ error: 'processId is required' });
    }

    const result = await pool.request()
      .input('processId', sql.Int, processId)
      .query(`
        SELECT 
          t.TaskID,
          t.TaskName,
          t.TaskPlanned,
          t.IsTaskSelected,
          t.PlannedDate,
          t.DaysRequired,
          t.DepId,
          d.DeptName,
          t.Priority,
          t.PredecessorID,
          t.linkTasks,
          t.WorkFlowHdrID,
          wd.TimeStarted,
          wd.TimeFinished,
          wd.DelayReason,
          wd.Delay,
          wd.assignUser
        FROM tblTasks t
        LEFT JOIN tblWorkflowDtl wd 
          ON t.TaskID = wd.TaskID
        JOIN tblDepartments d 
          ON t.DepId = d.DepartmentID
        WHERE t.proccessID = @processId
        ORDER BY t.DepId, t.Priority, t.TaskID
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching tasks by processId:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



app.get('/department/:departmentId/tasks', async (req, res) => {
  const { departmentId } = req.params;

  try {
    const result = await pool
      .request()
      .input('departmentId', departmentId)
      .query(`
        SELECT T.TaskID, T.TaskName, T.TaskPlanned, T.PlannedDate, W.TimeFinished, W.TimeStarted,
               T.DepId, T.IsDateFixed,T.DaysRequired,
                W.Delay, W.DelayReason
        FROM tblTasks T
        LEFT JOIN tblWorkflowDtl W ON T.TaskID = W.TaskID
        WHERE T.DepID = @departmentId
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching department tasks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



 
app.get("/getWorkflow", async (req, res) => {
  const { TaskID, PkgeID } = req.query;

  if (!TaskID || !PkgeID) {
    return res.status(400).send({ error: "Missing TaskID or PkgeID" });
  }

  try {
    const result = await pool.request()
      .input("TaskID", sql.Int, TaskID)
      .input("PkgeID", sql.Int, PkgeID)
      .query(`
        SELECT TOP 1 * FROM tblWorkflowDtl
        WHERE TaskID = @TaskID AND PkgeID = @PkgeID
      `);

    if (result.recordset.length === 0) {
      return res.status(200).send(null); 
    }

    res.status(200).send(result.recordset[0]);
  } catch (err) {
    console.error("Error fetching workflow:", err);
    res.status(500).send({ error: "Database error" });
  }
});


app.get("/adminpage", ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  const desc_user = req.session.user.name
  if (!user || !user.usrAdmin) {
    return res.status(403).send("Forbidden: Admins only");
  }

  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT NumberOfProccessID, ProcessName, processDesc
      FROM tblProcess
      ORDER BY NumberOfProccessID
    `);
    res.render("homepage.ejs", {
      user,
      desc_user,
      processes: result.recordset 
    });
  } catch (err) {
    console.error("Error fetching processes:", err);
    res.status(500).send("Server error");
  }
});

app.get("/process/:id/departments", async (req, res) => {
  const processId = req.params.id;
  try {
    const request = pool.request();
    request.input("processId", processId);
    const result = await request.query(`
      SELECT 
        pd.ProcessID,
        pd.DepartmentID,
        pd.StepOrder,
        pd.IsActive,
        d.DeptName
      FROM tblProcessDepartment pd
      JOIN tblDepartments d ON d.DepartmentID = pd.DepartmentID
      WHERE pd.ProcessID = @processId
      ORDER BY pd.StepOrder
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching departments for process:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/departments", async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT DepartmentID, DeptName FROM tblDepartments
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error loading departments:", err);
    res.status(500).json({ error: "Failed to load departments" });
  }
});


app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.post('/assign-user-to-task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { userId } = req.body;

  try {
    const userEmailResult = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT usrEmail, usrDesc
        FROM tblUsers
        WHERE usrID = @userId
      `);

    if (userEmailResult.recordset.length > 0) {
      const assignedUser = userEmailResult.recordset[0];

      await pool.request()
        .input("taskID", sql.Int, taskId)
        .input("userDesc", assignedUser.usrDesc)
        .query(`
          UPDATE tblWorkflowDtl
          SET assignUser = @userDesc
          WHERE TaskID = @taskID

        `);

      //  Only works if "to" is your own Resend account email
      const emailResponse = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: "nabilgreen500@gmail.com",  // need to buy a domain 
        subject: 'Task Assigned to You',
        html: `
          <p>Hello ${assignedUser.usrDesc},</p>
          <p>A task with ID <strong>${taskId}</strong> has been assigned to you.</p>
          <p>Please log in to the Engineering Portal to begin your task.</p>
          <p>Regards,<br>Engineering Project Dashboard</p>
        `
      });

      console.log('Email sent:', emailResponse);
      return res.status(200).json({ message: 'Email sent successfully' });

    } else {
      return res.status(404).json({ error: 'User not found' });
    }

  } catch (error) {
    console.error('Error assigning user to task:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});




app.post('/tasks/:id/update', async (req, res) => {
  const { id } = req.params; 
  const { PlannedDate, DelayReason, usrID } = req.body;

  try {
    await sql.query`
      UPDATE tblTasks
      SET PlannedDate = CASE WHEN IsDateFixed = 0 THEN ${PlannedDate} ELSE PlannedDate END
      WHERE TaskID = ${id}
    `;

    await sql.query`
      UPDATE tblWorkflowDtl
      SET DelayReason = ${DelayReason}
      WHERE TaskID = ${id} AND usrID = ${usrID}
    `;

    res.status(200).send('Task and workflow updated');
  } catch (err) {
    console.error(err);
    res.status(500).send('Update failed');
  }
});




app.post("/addPackage", async (req, res) => {
  const {
    packageName,
    duration,
    division,
    selected = false,
    standard = false,
    synched = false,
    trade,
    'file-upload': fileUpload
  } = req.body;

  try {
    const result = await pool.request()
      .input('packageName', sql.VarChar, packageName)
      .input('duration', sql.Int, duration)
      .input('division', sql.VarChar, division)
      .input('selected', sql.Bit, selected ? 1 : 0)
      .input('standard', sql.Bit, standard ? 1 : 0)
      .input('trade', sql.VarChar, trade)
      .input('fileUpload', sql.VarChar, fileUpload)
      .input('synched', sql.Bit, synched ? 1 : 0)
      .query(`
        INSERT INTO tblPackages (PkgeName, Duration, Division, Selected, Standard, Trade, FilePath, IsSynched,insertDate)
        VALUES (@packageName, @duration, @division, @selected, @standard, @trade, @fileUpload, @synched, GETDATE())
      `);

    res.status(200).json({ message: 'Package added successfully' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Database insertion failed' });
  }
});

app.post('/add-task', ensureAuthenticated, async (req, res) => {
  const {
    TaskName,
    TaskPlanned,
    PlannedDate,
    DaysRequired,
    DepId,
    ProcessID,
    PredecessorTaskID,
    Priority,
  } = req.body;

  try {
    const poolConn = await pool.connect();

    // 1. Check for duplicate
    const duplicateCheck = await poolConn.request()
      .input('TaskName', sql.NVarChar, TaskName)
      .input('DepId', sql.Int, DepId)
      .input('ProcessID', sql.Int, ProcessID)
      .query(`
        SELECT COUNT(*) AS DuplicateCount
        FROM tblTasks
        WHERE TaskName = @TaskName AND DepId = @DepId AND proccessID = @ProcessID
      `);

    if (duplicateCheck.recordset[0].DuplicateCount > 0) {
      return res.status(400).send('Task already exists for this department and process.');
    }

    // 2. Get StepOrder
    const stepOrderResult = await poolConn.request()
      .input('DepId', sql.Int, DepId)
      .input('ProcessID', sql.Int, ProcessID)
      .query(`
        SELECT StepOrder
        FROM tblProcessDepartment
        WHERE DepartmentID = @DepId AND ProcessID = @ProcessID
      `);

    if (stepOrderResult.recordset.length === 0) {
      return res.status(400).send('Invalid department or process.');
    }

    const StepOrder = stepOrderResult.recordset[0]?.StepOrder ?? null;

    // 3. Prevent adding tasks in higher steps without StepOrder 1 tasks
    if (StepOrder > 1) {
      const step1Count = await poolConn.request()
        .input('ProcessID', sql.Int, ProcessID)
        .query(`
          SELECT COUNT(*) AS Count
          FROM tblTasks t
          JOIN tblProcessDepartment pd ON t.DepId = pd.DepartmentID
          WHERE pd.StepOrder = 1 AND pd.ProcessID = @ProcessID
        `);

      if (step1Count.recordset[0].Count === 0) {
        return res.status(400).send('You must add at least one task in StepOrder 1 first.');
      }
    }

    // 4. Check if it's the first task for department + process
    const taskCountResult = await poolConn.request()
      .input('DepId', sql.Int, DepId)
      .input('ProcessID', sql.Int, ProcessID)
      .query(`
        SELECT COUNT(*) AS TaskCount
        FROM tblTasks
        WHERE DepId = @DepId AND proccessID = @ProcessID
      `);
    const isFirstTask = taskCountResult.recordset[0].TaskCount === 0;

    // 5. Determine IsTaskSelected and PlannedDate
    let IsTaskSelected = 0;
    let PlannedDateToInsert = PlannedDate;
    let DaysRequiredInserted = parseInt(DaysRequired || 0, 10);

    if (isFirstTask && StepOrder === 1 && !PredecessorTaskID) {
      IsTaskSelected = 1;
      const now = new Date();
      now.setDate(now.getDate() + DaysRequiredInserted);
      PlannedDateToInsert = now.toISOString().split('T')[0];
    } else if (PredecessorTaskID) {
      // If predecessor is set, schedule after it
      const predResult = await poolConn.request()
        .input('PredecessorTaskID', sql.Int, PredecessorTaskID)
        .query(`
          SELECT PlannedDate, DaysRequired
          FROM tblTasks
          WHERE TaskID = @PredecessorTaskID
        `);

      const predDateStr = predResult.recordset[0]?.PlannedDate;
      const predDays = predResult.recordset[0]?.DaysRequired ?? 0;

      if (predDateStr) {
        const predDate = new Date(predDateStr);
        predDate.setDate(predDate.getDate() + predDays);
        PlannedDateToInsert = predDate.toISOString().split('T')[0];
      }
    } else {
      // Fallback: after last planned date
      const lastTaskResult = await poolConn.request()
        .input('ProcessID', sql.Int, ProcessID)
        .query(`
          SELECT TOP 1 PlannedDate, DaysRequired
          FROM tblTasks
          WHERE proccessID = @ProcessID AND PlannedDate IS NOT NULL
          ORDER BY PlannedDate DESC
        `);

      const lastPlannedDateStr = lastTaskResult.recordset[0]?.PlannedDate;
      const lastDaysRequired = lastTaskResult.recordset[0]?.DaysRequired ?? 0;

      if (lastPlannedDateStr) {
        const lastPlannedDate = new Date(lastPlannedDateStr);
        lastPlannedDate.setDate(lastPlannedDate.getDate() + lastDaysRequired);
        PlannedDateToInsert = lastPlannedDate.toISOString().split('T')[0];
      }
    }

    // 6. Get next Priority if not provided
    let finalPriority = Priority;
    if (!Priority) {
      const priorityResult = await poolConn.request()
        .input('DepId', sql.Int, DepId)
        .input('ProcessID', sql.Int, ProcessID)
        .query(`
          SELECT ISNULL(MAX(Priority), 0) + 1 AS NewPriority
          FROM tblTasks
          WHERE DepId = @DepId AND proccessID = @ProcessID
        `);
      finalPriority = priorityResult.recordset[0].NewPriority;
    }

    // 7. Get PredecessorID from existing logic if not provided
    let PredecessorID = PredecessorTaskID || null;
    if (!isFirstTask && !PredecessorID) {
      const predResult = await poolConn.request()
        .input('DepId', sql.Int, DepId)
        .input('ProcessID', sql.Int, ProcessID)
        .query(`
          SELECT TOP 1 TaskID
          FROM tblTasks
          WHERE DepId = @DepId AND proccessID = @ProcessID
          ORDER BY Priority DESC
        `);
      PredecessorID = predResult.recordset[0]?.TaskID ?? null;
    }

    // 8. Get WorkflowHdrID if exists
    const hdrResult = await poolConn.request()
      .input('ProcessID', sql.Int, ProcessID)
      .query(`
        SELECT TOP 1 WorkFlowID
        FROM tblWorkflowHdr
        WHERE ProcessID = @ProcessID
      `);
    const workflowHdrId = hdrResult.recordset.length > 0
      ? hdrResult.recordset[0].WorkFlowID
      : null;

    // 9. Insert into tblTasks
    const insertRequest = poolConn.request()
      .input('TaskName', sql.NVarChar, TaskName)
      .input('TaskPlanned', sql.NVarChar, TaskPlanned)
      .input('IsTaskSelected', sql.Bit, IsTaskSelected)
      .input('PlannedDate', sql.Date, PlannedDateToInsert)
      .input('DepId', sql.Int, DepId)
      .input('Priority', sql.Int, finalPriority)
      .input('PredecessorID', PredecessorID)
      .input('DaysRequired', sql.Int, DaysRequiredInserted)
      .input('ProcessID', sql.Int, ProcessID)

    if (workflowHdrId) {
      insertRequest.input('WorkFlowHdrID', sql.Int, workflowHdrId);
    }

    const insertResult = await insertRequest.query(`
      INSERT INTO tblTasks (
        TaskName, TaskPlanned, IsTaskSelected, PlannedDate,
        DepId, Priority, PredecessorID, DaysRequired, proccessID
        ${workflowHdrId ? ', WorkFlowHdrID' : ''}
      )
      OUTPUT INSERTED.TaskID
      VALUES (
        @TaskName, @TaskPlanned, @IsTaskSelected, @PlannedDate,
        @DepId, @Priority, @PredecessorID, @DaysRequired, @ProcessID
        ${workflowHdrId ? ', @WorkFlowHdrID' : ''}
      )
    `);

    const newTaskId = insertResult.recordset[0].TaskID;

    // 10. Insert into tblWorkflowDtl if needed
    if (workflowHdrId) {
      await poolConn.request()
        .input('WorkflowName', sql.NVarChar, TaskName)
        .input('TaskID', sql.Int, newTaskId)
        .input('WorkFlowHdrID', sql.Int, workflowHdrId)
        .query(`
          INSERT INTO tblWorkflowDtl (WorkflowName, TaskID, WorkFlowHdrID)
          VALUES (@WorkflowName, @TaskID, @WorkFlowHdrID)
        `);
    }

// 11. Enhanced cascading planned dates logic
    const allTasksInCurrentDept = await poolConn.request()
      .input('DepId', sql.Int, DepId)
      .input('ProcessID', sql.Int, ProcessID)
      .query(`
        SELECT TaskID, DaysRequired, Priority
        FROM tblTasks
        WHERE DepId = @DepId AND proccessID = @ProcessID
        ORDER BY Priority ASC
      `);

    // Initialize newStartDate with the new task's planned date
    let newStartDate = PlannedDateToInsert ? new Date(PlannedDateToInsert) : new Date();

    // Find the position where our new task was inserted
    let newTaskPosition = allTasksInCurrentDept.recordset.findIndex(
      t => t.TaskID === newTaskId
    );

    if (newTaskPosition > 0) {
      // Get the previous task's end date as our starting point
      const prevTask = allTasksInCurrentDept.recordset[newTaskPosition - 1];
      const prevTaskDate = await poolConn.request()
        .input('TaskID', sql.Int, prevTask.TaskID)
        .query(`
          SELECT PlannedDate FROM tblTasks WHERE TaskID = @TaskID
        `);
      newStartDate = new Date(prevTaskDate.recordset[0].PlannedDate);
      newStartDate.setDate(newStartDate.getDate() + prevTask.DaysRequired);
    }

    // Update dates for current and subsequent tasks in this department
    for (let i = newTaskPosition; i < allTasksInCurrentDept.recordset.length; i++) {
      const task = allTasksInCurrentDept.recordset[i];
      const taskDateStr = newStartDate.toISOString().split('T')[0];
      
      await poolConn.request()
        .input('TaskID', sql.Int, task.TaskID)
        .input('NewPlannedDate', sql.Date, taskDateStr)
        .query(`
          UPDATE tblTasks
          SET PlannedDate = @NewPlannedDate
          WHERE TaskID = @TaskID
        `);

      newStartDate.setDate(newStartDate.getDate() + task.DaysRequired);
    }

    // 12. Cascade to subsequent departments
    const subsequentDepts = await poolConn.request()
      .input('CurrentStepOrder', sql.Int, StepOrder)
      .input('ProcessID', sql.Int, ProcessID)
      .query(`
        SELECT DepartmentID, StepOrder
        FROM tblProcessDepartment
        WHERE StepOrder > @CurrentStepOrder AND ProcessID = @ProcessID
        ORDER BY StepOrder ASC
      `);

    let currentEndDate = new Date(newStartDate); // Initialize with last calculated date

    for (const dept of subsequentDepts.recordset) {
      // Get all tasks in next department ordered by priority
      const tasksNextDept = await poolConn.request()
        .input('DepId', sql.Int, dept.DepartmentID)
        .input('ProcessID', sql.Int, ProcessID)
        .query(`
          SELECT TaskID, PlannedDate, DaysRequired
          FROM tblTasks
          WHERE DepId = @DepId AND proccessID = @ProcessID
          ORDER BY Priority ASC
        `);

      if (tasksNextDept.recordset.length > 0) {
        // Check if first task needs adjustment
        const firstTaskDate = new Date(tasksNextDept.recordset[0].PlannedDate);
        if (firstTaskDate < currentEndDate) {
          let newDeptStartDate = new Date(currentEndDate);

          // Update all tasks in this department
          for (const task of tasksNextDept.recordset) {
            const taskDateStr = newDeptStartDate.toISOString().split('T')[0];
            
            await poolConn.request()
              .input('TaskID', sql.Int, task.TaskID)
              .input('NewPlannedDate', sql.Date, taskDateStr)
              .query(`
                UPDATE tblTasks
                SET PlannedDate = @NewPlannedDate
                WHERE TaskID = @TaskID
              `);

            newDeptStartDate.setDate(newDeptStartDate.getDate() + task.DaysRequired);
          }
          currentEndDate = new Date(newDeptStartDate);
        } else {
          // No adjustment needed, just update currentEndDate
          const lastTask = tasksNextDept.recordset[tasksNextDept.recordset.length - 1];
          currentEndDate = new Date(lastTask.PlannedDate);
          currentEndDate.setDate(currentEndDate.getDate() + lastTask.DaysRequired);
        }
      }
    }

    res.redirect(`/add-task?processId=${ProcessID}`);
  } catch (err) {
    console.error('❌ Error adding task:', err);
    res.status(500).send('Failed to add task');
  }
});


app.get('/task-selected', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    
    const joinedQuery = await pool.request().query(`
      SELECT
        t.TaskID,
        t.TaskName,
        t.TaskPlanned,
        t.IsTaskSelected,
        t.IsDateFixed,
        t.PlannedDate,
        t.DepId,
        t.Priority,
        t.PredecessorID,
        t.DaysRequired,
        t.linkTasks,
        w.WorkflowDtlId,
        w.WorkflowName,
        w.TimeStarted,
        w.TimeFinished,
        w.DelayReason,
        w.Delay,
        d.DeptName
      FROM tblTasks t
      LEFT JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
      LEFT JOIN tblDepartments d ON t.DepId = d.DepartmentID
      ORDER BY t.DepId, t.TaskID ASC
    `);

    if (!joinedQuery.recordset || joinedQuery.recordset.length === 0) {
      return res.status(404).render('selectTask.ejs', {
        taskWorkflows: [],
        message: 'No tasks found'
      });
    }

    res.render('selectTask.ejs', {
      taskWorkflows: joinedQuery.recordset
    });

  } catch (err) {
    console.error('Database error:', err);
  
  } 
});



app.get('/edit-task/:id', async (req, res) => {
  const taskId = req.params.id;

  try {
    const result = await pool
      .request()
      .input('TaskID', sql.Int, taskId)
      .query(`
        SELECT t.*, w.TimeFinished 
        FROM tblTasks t
        LEFT JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
        WHERE t.TaskID = @TaskID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).send('Task not found');
    }

    const task = result.recordset[0];
    
    // Check if task is finished
    if (task.TimeFinished) {
      return res.status(403).send('Cannot edit finished tasks');
    }

    res.render('edittasks.ejs', { task });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});



app.delete('/delete-task/:taskId', async (req, res) => {
  const taskId = parseInt(req.params.taskId);

  try {
    const pool = await sql.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = transaction.request();
      request.input('TaskID', sql.Int, taskId);

      await request.query(`
        UPDATE tblTasks
        SET PredecessorID = NULL
        WHERE PredecessorID = @TaskID
      `);

      await request.query(`
        DELETE FROM tblWorkflowDtl
        WHERE TaskID = @TaskID
      `);

      await request.query(`
        DELETE FROM tblTasks
        WHERE TaskID = @TaskID
      `);

      await transaction.commit();
      res.status(200).json({ message: 'Task and its workflows deleted successfully' });

    } catch (error) {
      await transaction.rollback();
      console.error('Transaction error:', error);
      res.status(500).json({ error: 'Failed to delete task and workflow due to task dependency' });
    }

  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.post('/update-task/:id', async (req, res) => {
  const taskId = req.params.id;
  const { TaskName, TaskPlanned, IsDateFixed, PlannedDate } = req.body;

  try {
    await pool
      .request()
      .input('TaskID', sql.Int, taskId)
      .input('TaskName', sql.NVarChar, TaskName)
      .input('TaskPlanned', sql.NVarChar, TaskPlanned)
      .input('IsDateFixed', sql.Bit, IsDateFixed)
      .input('PlannedDate', sql.DateTime, PlannedDate)
      .query(`UPDATE tblTasks SET 
        TaskName = @TaskName, 
        TaskPlanned = @TaskPlanned, 
        IsDateFixed = @IsDateFixed, 
        PlannedDate = @PlannedDate 
        WHERE TaskID = @TaskID`);

    res.redirect("/adminpage"); 
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating task');
  }
});

app.get("/workflow/new", async (req, res) => {
  try {
    const [processes, projects, packages] = await Promise.all([
      pool.request().query("SELECT NumberOfProccessID AS ProcessID, ProcessName FROM tblProcess"),
      pool.request().query("SELECT ProjectID, ProjectName FROM tblProject"),
      pool.request().query("SELECT PkgeID, PkgeName FROM tblPackages")
    ]);

    res.render("addworkflow.ejs", {
      processes: processes.recordset,
      projects: projects.recordset,
      packages: packages.recordset
    });
  } catch (err) {
    console.error("Error loading form data:", err);
    res.status(500).send("Failed to load workflow form.");
  }
});

app.post('/api/workflows', async (req, res) => {
  const { processID, projectID, packageID, status } = req.body;

  // Validate input
  if (!processID || isNaN(processID)) {
    return res.status(400).json({
      error: 'Invalid processID: Must be a non-empty numeric value'
    });
  }

  try {
    const poolRequest = pool.request();

    // 1️⃣ Confirm the process exists in tblTasks at all
    const processCheck = await poolRequest
      .input('processID', sql.Int, processID)
      .query(`
        SELECT TOP 1 TaskID 
        FROM tblTasks 
        WHERE proccessID = @processID
      `);

    if (processCheck.recordset.length === 0) {
      return res.status(400).json({
        error: 'No tasks found for the specified processID'
      });
    }

    // 2️⃣ Get ALL departments for the process from tblProcessDepartment (without filtering IsActive)
    const depRes = await pool.request()
      .input('processID', sql.Int, processID)
      .query(`
        SELECT DepartmentID
        FROM tblProcessDepartment
        WHERE ProcessID = @processID
      `);

    const expectedDeps = depRes.recordset.map(row => row.DepartmentID);

    if (expectedDeps.length === 0) {
      return res.status(400).json({
        error: 'No departments are defined for this process in tblProcessDepartment'
      });
    }

    // 3️⃣ For each DepartmentID, check that there is at least one task in tblTasks
    const missingDeps = [];
    for (const depId of expectedDeps) {
      const taskCheck = await pool.request()
        .input('processID', sql.Int, processID)
        .input('depId', sql.Int, depId)
        .query(`
          SELECT TOP 1 TaskID
          FROM tblTasks
          WHERE proccessID = @processID AND DepId = @depId
        `);
      
      if (taskCheck.recordset.length === 0) {
        missingDeps.push(depId);
      }
    }

    if (missingDeps.length > 0) {
      return res.status(400).json({
        error: `Cannot create workflow: No tasks found for department(s): ${missingDeps.join(', ')}`
      });
    }

    // 4️⃣ Check if workflow already exists
    const existingWorkflow = await pool.request()
      .input('processID', sql.Int, processID)
      .query(`
        SELECT workFlowID
        FROM tblWorkflowHdr
        WHERE processID = @processID
      `);

    if (existingWorkflow.recordset.length > 0) {
      return res.status(400).json({
        error: 'A workflow already exists for this process'
      });
    }

    // 5️⃣ Insert workflow header
    const insertResult = await pool.request()
      .input('processID', sql.Int, processID)
      .input('projectID', sql.Int, projectID)
      .input('packageID', sql.Int, packageID)
      .input('status', sql.NVarChar, status)
      .query(`
        INSERT INTO tblWorkflowHdr (
          processID,
          projectID,
          packageID,
          status,
          createdDate
        )
        OUTPUT INSERTED.workFlowID
        VALUES (
          @processID,
          @projectID,
          @packageID,
          @status,
          GETDATE()
        )
      `);

    const newWorkflowID = insertResult.recordset[0].workFlowID;

    // 6️⃣ Update tblTasks with the new WorkFlowHdrID
    await pool.request()
      .input('workflowID', sql.Int, newWorkflowID)
      .input('processID', sql.Int, processID)
      .query(`
        UPDATE tblTasks
        SET WorkFlowHdrID = @workflowID
        WHERE proccessID = @processID
      `);

    // 7️⃣ Get all tasks for this process to update workflow details
    const tasks = await pool.request()
      .input('processID', sql.Int, processID)
      .query(`
        SELECT TaskID, TaskName
        FROM tblTasks
        WHERE proccessID = @processID
      `);

    // 8️⃣ First update existing workflow detail records
    await pool.request()
      .input('workflowID', sql.Int, newWorkflowID)
      .input('processID', sql.Int, processID)
      .query(`
        UPDATE d
        SET d.workFlowHdrId = @workflowID
        FROM tblWorkflowDtl d
        INNER JOIN tblTasks t ON d.TaskID = t.TaskID
        WHERE t.proccessID = @processID
      `);

    // 9️⃣ Then insert new records for any tasks missing from workflow details
    await pool.request()
      .input('workflowID', sql.Int, newWorkflowID)
      .input('processID', sql.Int, processID)
      .query(`
        INSERT INTO tblWorkflowDtl (
          workFlowHdrId,
          TaskID,
          WorkflowName,
          TimeStarted,
          TimeFinished,
          DelayReason,
          Delay,
          assignUser
        )
        SELECT 
          @workflowID,
          t.TaskID,
          t.TaskName,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL
        FROM tblTasks t
        LEFT JOIN tblWorkflowDtl d ON t.TaskID = d.TaskID
        WHERE t.proccessID = @processID
        AND d.TaskID IS NULL
      `);

    res.status(201).json({
      message: 'Workflow created and tasks updated successfully',
      workflowID: newWorkflowID,
      tasksUpdated: tasks.recordset.length
    });

  } catch (err) {
    console.error('Error inserting workflow:', err);
    res.status(500).json({ 
      error: 'Database operation failed',
      details: err.message 
    });
  }
});






app.post("/postProcess", async (req, res) => {
  const { ProcessName, Steps } = req.body;

  if (!Steps || Steps.length === 0) {
    req.flash("error", "No departments selected.");
    return res.redirect("/addProcess");
  }

  const departmentIDs = Array.isArray(Steps)
    ? Steps.map(id => parseInt(id))
    : [parseInt(Steps)];

  const seenCombinations = new Set();
  let stepNumber = 1;
  for (const deptID of departmentIDs) {
    const key = `${deptID}-${stepNumber}`;
    if (seenCombinations.has(key)) {
      req.flash("error", `Duplicate department-step combination: DepartmentID ${deptID} at Step ${stepNumber}`);
      return res.redirect("/addProcess");
    }
    seenCombinations.add(key);
    stepNumber++;
  }

  try {
    const duplicateCheck = await pool.request()
      .input("ProcessName", sql.NVarChar, ProcessName.trim())
      .query(`
        SELECT COUNT(*) AS DuplicateCount
        FROM tblProcess
        WHERE UPPER(LTRIM(RTRIM(ProcessName))) = UPPER(LTRIM(RTRIM(@ProcessName)))
      `);

    if (duplicateCheck.recordset[0].DuplicateCount > 0) {
      req.flash("error", "A process with this name already exists.");
      return res.redirect("/addProcess");
    }

    const processResult = await pool.request()
      .input("ProcessName", sql.VarChar(100), ProcessName.trim())
      .query(`
        INSERT INTO tblProcess (ProcessName)
        OUTPUT INSERTED.NumberOfProccessID AS ProcessID
        VALUES (@ProcessName)
      `);

    const ProcessID = processResult.recordset[0].ProcessID;

    stepNumber = 1;
    for (const deptID of departmentIDs) {
      const IsActive = stepNumber === 1 ? 1 : 0;

      await pool.request()
        .input("ProcessID", sql.Int, ProcessID)
        .input("DepartmentID", sql.Int, deptID)
        .input("StepNumber", sql.Int, stepNumber)
        .input("IsActive", sql.Bit, IsActive)
        .query(`
          INSERT INTO tblProcessDepartment (ProcessID, DepartmentID, StepOrder, IsActive)
          VALUES (@ProcessID, @DepartmentID, @StepNumber, @IsActive)
        `);

      stepNumber++;
    }

    req.flash("success", "Process added successfully.");
    res.redirect("/addProcess");
  } catch (err) {
    console.error("Error assigning process:", err);
    req.flash("error", "Failed to assign process.");
    res.redirect("/addProcess");
  }
});






app.post("/postWorkflow", async (req, res) => {
  const { WorkflowName, usrID, TaskID, PkgeID, TimeStarted, TimeFinished } = req.body;
  if (!WorkflowName || !TaskID || !PkgeID || !TimeStarted) {
    return res.status(400).send({ error: 'Missing required fields' });
  }

  const usrIDValue = usrID && usrID.trim() !== '' ? usrID : null;

  const timeStartedFormatted = TimeStarted
    ? new Date(TimeStarted).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const timeFinishedFormatted = TimeFinished
    ? new Date(TimeFinished).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  try {
    const existing = await pool.request()
      .input('TaskID', sql.Int, TaskID)
      .input('PkgeID', sql.Int, PkgeID)
      .query(`
        SELECT TOP 1 * FROM tblWorkflowDtl
        WHERE TaskID = @TaskID AND PkgeID = @PkgeID
      `);

    if (existing.recordset.length > 0) {
      const existingWorkflow = existing.recordset[0];

      const shouldUpdate =
        (timeFinishedFormatted && timeFinishedFormatted !== existingWorkflow.TimeFinished?.toISOString().slice(0, 19).replace('T', ' ')) ||
        (usrIDValue !== existingWorkflow.usrID) ||
        (timeStartedFormatted !== existingWorkflow.TimeStarted?.toISOString().slice(0, 19).replace('T', ' '));

      if (shouldUpdate) {
        await pool.request()
          .input('WorkflowName', sql.VarChar(100), WorkflowName)
          .input('usrID', sql.VarChar(10), usrIDValue)
          .input('TimeStarted', sql.DateTime, timeStartedFormatted)
          .input('TimeFinished', sql.DateTime, timeFinishedFormatted)
          .input('TaskID', sql.Int, TaskID)
          .input('PkgeID', sql.Int, PkgeID)
          .query(`
            UPDATE tblWorkflowDtl
            SET WorkflowName = @WorkflowName,
                usrID = @usrID,
                TimeStarted = @TimeStarted,
                TimeFinished = @TimeFinished
            WHERE TaskID = @TaskID AND PkgeID = @PkgeID
          `);

        return res.status(200).send({ message: 'Workflow updated successfully' });
      } else {
        return res.status(200).send({ message: 'No changes detected; workflow remains unchanged' });
      }
    } else {
      await pool.request()
        .input('WorkflowName', sql.VarChar(100), WorkflowName)
        .input('usrID', sql.VarChar(10), usrIDValue)
        .input('TaskID', sql.Int, TaskID)
        .input('PkgeID', sql.Int, PkgeID)
        .input('TimeStarted', sql.DateTime, timeStartedFormatted)
        .input('TimeFinished', sql.DateTime, timeFinishedFormatted)
        .query(`
          INSERT INTO tblWorkflowDtl (
            WorkflowName, usrID, TaskID, PkgeID, TimeStarted, TimeFinished
          )
          VALUES (
            @WorkflowName, @usrID, @TaskID, @PkgeID, @TimeStarted, @TimeFinished
          )
        `);

      return res.status(201).send({ message: 'Workflow created successfully' });
    }
  } catch (err) {
    console.error('SQL error:', err);
    res.status(500).send({ error: 'Database operation failed' });
  }
});




app.post("/addUser", async (req, res) => {
  const {
    usrID,
    usrDesc,
    usrPWD,
    usrAdmin,
    usrSTID,
    DepartmentID,
    AllowAccess,
    Export,
    usrEmail,
    usrSignature,
    emailSignature,
    usrReadPolicy
  } = req.body;

  // Basic validation
  if (!usrID || !usrDesc || !usrPWD || !DepartmentID) {
    return res.status(400).send("usrID, usrDesc, usrPWD, and DepartmentID are required.");
  }

  if (usrDesc.length > 40) return res.status(400).send("usrDesc exceeds 40 characters.");
  if (usrEmail && usrEmail.length > 50) return res.status(400).send("usrEmail exceeds 50 characters.");
  if (usrSignature && usrSignature.length > 100) return res.status(400).send("usrSignature exceeds 100 characters.");

  const insertDate = new Date();
  const lastUpdate = new Date();

  try {
    // Hash the password
    const hashedPwd = await bcrypt.hash(usrPWD, 10);

    // Insert user
    await pool.request()
      .input("usrID", sql.VarChar(10), usrID)
      .input("usrDesc", sql.VarChar(40), usrDesc)
      .input("usrPWD", sql.VarChar(255), hashedPwd)
      .input("usrAdmin", sql.Bit, usrAdmin ? 1 : 0)
      .input("usrSTID", sql.SmallInt, usrSTID || null)
      .input("DepartmentID", sql.Int, parseInt(DepartmentID))
      .input("AllowAccess", sql.Bit, AllowAccess ? 1 : 0)
      .input("Export", sql.SmallInt, Export || 0)
      .input("LastUpdate", sql.DateTime, lastUpdate)
      .input("usrEmail", sql.VarChar(50), usrEmail || null)
      .input("usrSignature", sql.VarChar(100), usrSignature || null)
      .input("emailSignature", sql.Text, emailSignature || null)
      .input("usrReadPolicy", sql.TinyInt, usrReadPolicy || 0)
      .input("insertDate", sql.DateTime, insertDate)
      .query(`
        INSERT INTO tblUsers (
          usrID, usrDesc, usrPWD, usrAdmin, usrSTID, DepartmentID,
          AllowAccess, Export, LastUpdate, usrEmail, usrSignature,
          emailSignature, usrReadPolicy, insertDate
        )
        VALUES (
          @usrID, @usrDesc, @usrPWD, @usrAdmin, @usrSTID, @DepartmentID,
          @AllowAccess, @Export, @LastUpdate, @usrEmail, @usrSignature,
          @emailSignature, @usrReadPolicy, @insertDate
        )
      `);

    res.status(201).send("User added successfully.");
  } catch (err) {
    console.error("Error inserting user:", err);
    res.status(500).send("Failed to add user.");
  }
});


// app.get('/process/:processId/tasks', async (req, res) => {
//   const processId = req.params.processId;
//   const userId = req.query.userId;

//   try {
//     // 1. Get the user's department
//     const userResult = await pool
//       .request()
//       .input('userId', userId)
//       .query('SELECT DepartmentID FROM tblUsers WHERE usrID = @userId');

//     if (userResult.recordset.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const userDeptId = userResult.recordset[0].DepartmentID;

//     // 2. Get tasks assigned to the user's department, ordered by Priority
//     const tasksResult = await pool
//       .request()
//       .input('DepId', userDeptId)
//       .query(`
//         SELECT 
//           TaskID,
//           TaskName,
//           TaskPlanned,
//           PlannedDate,
//           IsDateFixed,
//           isTaskSelected,
//           DepId,
//           Priority,
//           PredecessorID,
//           DaysFinished,
//           Delay
//         FROM tblTasks
//         WHERE DepId = @DepId
//         ORDER BY Priority ASC
//       `);

//     const tasks = tasksResult.recordset;

//     if (tasks.length === 0) {
//       return res.json([]); // No tasks
//     }

//     // 3. Get latest workflow for all task IDs
//     const taskIds = tasks.map(t => t.TaskID);
//     const workflowRequest = pool.request();

//     taskIds.forEach((id, i) => {
//       workflowRequest.input(`task${i}`, id);
//     });

//     const workflowQuery = `
//       WITH LatestWorkflow AS (
//         SELECT 
//           TaskID,
//           TimeStarted,
//           TimeFinished,
//           Delay,
//           DelayReason,
//           ROW_NUMBER() OVER (PARTITION BY TaskID ORDER BY WorkflowID DESC) AS rn
//         FROM tblWorkflow
//         WHERE TaskID IN (${taskIds.map((_, i) => `@task${i}`).join(',')})
//       )
//       SELECT * FROM LatestWorkflow WHERE rn = 1
//     `;

//     const workflowResult = await workflowRequest.query(workflowQuery);

//     // 4. Merge workflow data into tasks
//     const tasksWithWorkflow = tasks.map(task => {
//       const workflow = workflowResult.recordset.find(w => w.TaskID === task.TaskID);
//       return {
//         ...task,
//         IsUserDept: task.DepId === userDeptId ? 1 : 0,
//         TimeStarted: workflow?.TimeStarted || null,
//         TimeFinished: workflow?.TimeFinished || null,
//         Delay: workflow?.Delay ?? task.Delay ?? null,
//         DelayReason: workflow?.DelayReason || null
//       };
//     });

//     console.log("🎯 Sorted Tasks:", tasksWithWorkflow.map(t => ({ TaskID: t.TaskID, Priority: t.Priority })));

//     res.json(tasksWithWorkflow);

//   } catch (error) {
//     console.error('❌ Error fetching tasks:', error);
//     res.status(500).json({ error: 'Server error' });
//   }
// });



app.post('/get-project-processes', async (req, res) => {
  const { projectId, departmentId } = req.body; 
  try {
    const result = await pool
      .request()
      .input('projectId', sql.Int, projectId)
      .input('departmentId', sql.Int, departmentId)
      .query(`
     SELECT DISTINCT 
    P.NumberOfProccessID, 
    P.ProcessName, 
    P.processDesc,
    PA.PkgeName,
    PO.ProjectName
FROM 
    tblProcess P
JOIN 
    tblProcessWorkflow PW ON P.NumberOfProccessID = PW.processID
JOIN 
    tblPackages PA ON PA.pkgeID = PW.packageID
JOIN 
    tblProject PO ON PO.projectID = PW.projectID
JOIN 
    tblProcessDepartment PD ON P.NumberOfProccessID = PD.ProcessID
WHERE 
    PW.projectID = @projectId
    AND PD.DepartmentID = @departmentId;

      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching processes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



app.put('/save-task-updates', async (req, res) => {
  const { updates } = req.body;
  console.log("Received updates: ", updates);

  const updatedTasks = [];

  try {
    for (const update of updates) {
      const { taskId, field, value, usrID } = update;
      console.log("Processing field:", field);

      if (field === 'daysRequired') {
        // Check IsDateFixed and PlannedDate
        const check = await pool
          .request()
          .input('taskId', sql.Int, taskId)
          .query('SELECT IsDateFixed, PlannedDate FROM tblTasks WHERE TaskID = @taskId');

        const task = check.recordset[0];
        const isFixed = task?.IsDateFixed;
        const plannedDate = task?.PlannedDate;

        if (!isFixed) {
          // Update DaysRequired
          await pool
            .request()
            .input('taskId', sql.Int, taskId)
            .input('value', sql.Int, value)
            .query('UPDATE tblTasks SET DaysRequired = @value WHERE TaskID = @taskId');
            console.log(plannedDate)
       if (plannedDate !== null) {
  await pool
    .request()
    .input('taskId', sql.Int, taskId)
    .input('days', sql.Int, value)
    .query(`
      UPDATE tblTasks 
      SET PlannedDate = DATEADD(DAY, @days + 1, CAST(GETDATE() AS DATE))
      WHERE TaskID = @taskId
    `);
}
        }
      }

      if (field === 'delayReason') {
        await pool
          .request()
          .input('taskId', sql.Int, taskId)
          .input('usrID',  usrID)
          .input('value', sql.NVarChar, value)
          .query(`
            UPDATE tblWorkflowDtl
            SET DelayReason = @value
            WHERE TaskID = @taskId AND WorkflowDtlId = (
              SELECT TOP 1 WorkflowDtlId
              FROM tblWorkflowDtl
              WHERE TaskID = @taskId
              ORDER BY WorkflowDtlId DESC
            );
          `);
      }

      // Fetch the updated task
      const updatedTask = await pool
        .request()
        .input('taskId', sql.Int, taskId)
        .query(`SELECT * FROM tblTasks WHERE TaskID = @taskId`);

      updatedTasks.push(updatedTask.recordset[0]);
    }

    res.json({ success: true, updatedTasks });

  } catch (err) {
    console.error('Error saving updates:', err);
    res.status(500).json({ error: 'Server error' });
  }
});





app.get('/addProject', async (req, res) => {
  try {
    const [packagesResult, processesResult] = await Promise.all([
      pool.request().query("SELECT * FROM tblPackages WHERE Selected = 1"),
      pool.request().query("SELECT * FROM tblProcess") 
    ]);

    res.render('project.ejs', {
      packages: packagesResult.recordset,
      processes: processesResult.recordset
    });
  } catch (err) {
    console.error('Error loading data:', err);
    res.status(500).send('Server error');
  }
});

app.post('/projects/add', async (req, res) => {
  const { projectName, packageID, processID } = req.body;

  try {
    const insertProject = await pool.request()
      .input('projectName', sql.VarChar, projectName)
      .query('INSERT INTO tblProject (projectName) OUTPUT INSERTED.projectID VALUES (@projectName)');

    const newProjectID = insertProject.recordset[0].projectID;

    await pool.request()
      .input('processID', sql.Int, processID)
      .input('projectID', sql.Int, newProjectID)
      .input('packageID', sql.Int, packageID)
      .query(`INSERT INTO tblProcessWorkflow (processID, projectID, packageID)
              VALUES (@processID, @projectID, @packageID)`);

    res.redirect('/adminpage');
  } catch (err) {
    console.error('Insert failed:', err);
    res.status(500).send('Error adding project');
  }
});


app.post('/start-task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { startTime } = req.body;

  try {
    const sqlTransaction = await pool.transaction();
    await sqlTransaction.begin();

    // 1️⃣ Update the task start time
    const reqUpdate = sqlTransaction.request();
    await reqUpdate
      .input('taskId', taskId)
      .input('startTime', startTime)
      .query(`
        UPDATE tblWorkflowDtl
        SET TimeStarted = @startTime
        WHERE TaskID = @taskId AND TimeStarted IS NULL
      `);

    // 2️⃣ Retrieve WorkFlowHdrID via tblTasks
    const reqHdr = sqlTransaction.request();
    const hdrResult = await reqHdr
      .input('taskId', taskId)
      .query(`
        SELECT t.WorkFlowHdrID
        FROM tblTasks t
        WHERE t.TaskID = @taskId
      `);

    const workflowHdrId = hdrResult.recordset[0]?.WorkFlowHdrID;

    if (workflowHdrId) {
      // 3️⃣ Check if startDate is NULL
      const reqStartDate = sqlTransaction.request();
      const startDateResult = await reqStartDate
        .input('workflowHdrId', workflowHdrId)
        .query(`
          SELECT startDate
          FROM tblWorkflowHdr
          WHERE workFlowID = @workflowHdrId
        `);

      const startDate = startDateResult.recordset[0]?.startDate;

      if (!startDate) {
        // 4️⃣ If startDate is NULL, set it
        const reqUpdateHdr = sqlTransaction.request();
        await reqUpdateHdr
          .input('workflowHdrId', workflowHdrId)
          .query(`
            UPDATE tblWorkflowHdr
            SET startDate = GETDATE()
            WHERE workFlowID = @workflowHdrId
          `);

        console.log('✅ startDate set on tblWorkflowHdr');
      }
    }

    // 5️⃣ Get DepId of the current task
    const reqDep = sqlTransaction.request();
    const depResult = await reqDep
      .input('taskId', taskId)
      .query(`
        SELECT DepId
        FROM tblTasks
        WHERE TaskID = @taskId
      `);

    const currentDepId = depResult.recordset[0]?.DepId;

    // 6️⃣ Find the next task in the same department
    const reqNextTask = sqlTransaction.request();
    const nextTaskResult = await reqNextTask
      .input('depId', currentDepId)
      .query(`
        SELECT TOP 1 TaskID, DepId
        FROM tblTasks
        WHERE DepId = @depId
          AND IsTaskSelected = 0
        ORDER BY Priority ASC, TaskID ASC
      `);

    let nextDepId = null;
    if (nextTaskResult.recordset.length > 0) {
      nextDepId = nextTaskResult.recordset[0].DepId;
    }

    await sqlTransaction.commit();

    res.status(200).json({
      message: 'Task started successfully',
      nextDepId: nextDepId
    });

  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({ error: 'Failed to start task' });
  }
});




app.post('/finish-task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { finishTime, workFlowHdrId, processID } = req.body;
console.log(req.body)
  if (!workFlowHdrId) {
    return res.status(400).json({ error: 'Missing workFlowHdrId' });
  }

  try {
    const finished = new Date(finishTime);

    // Get task info
    const taskResult = await pool.request()
      .input('taskId', taskId)
      .query(`
        SELECT t.PlannedDate, t.DepId, t.DaysRequired
        FROM tblTasks t
        WHERE t.TaskID = @taskId
      `);

    if (taskResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
const { PlannedDate, DepId, DaysRequired } = taskResult.recordset[0];
const planned = new Date(PlannedDate);

const plannedDateOnly = new Date(planned);
const finishedDateOnly = new Date(finished);
plannedDateOnly.setHours(0, 0, 0, 0);
finishedDateOnly.setHours(0, 0, 0, 0);

const delay = Math.max(0, Math.ceil((finishedDateOnly - plannedDateOnly) / (1000 * 60 * 60 * 24)));


    // Mark workflow detail as finished
    await pool.request()
      .input('taskId', taskId)
      .input('finishTime', finishTime)
      .input('delay', delay)
      .input('workFlowHdrId', workFlowHdrId)
      .query(`
        UPDATE tblWorkflowDtl
        SET TimeFinished = @finishTime, Delay = @delay
        WHERE TaskID = @taskId AND workFlowHdrId = @workFlowHdrId
      `);

    // Unselect the completed task
    await pool.request()
      .input('taskId', taskId)
      .query(`UPDATE tblTasks SET IsTaskSelected = 0 WHERE TaskID = @taskId`);

    // Select the next task in this department and workflow
    const nextTaskResult = await pool.request()
      .input('depId', DepId)
      .input('workFlowHdrId', workFlowHdrId)
      .query(`
        SELECT TOP 1 t.TaskID, t.DaysRequired
        FROM tblTasks t
        JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
        WHERE t.DepId = @depId
          AND w.workFlowHdrId = @workFlowHdrId
          AND t.IsTaskSelected = 0
          AND w.TimeFinished IS NULL
        ORDER BY t.Priority ASC, t.TaskID ASC
      `);

    if (nextTaskResult.recordset.length > 0) {
      const nextTaskId = nextTaskResult.recordset[0].TaskID;
      const nextTaskDays = nextTaskResult.recordset[0].DaysRequired || 1;

      const nextPlanned = new Date(finished);
      nextPlanned.setDate(nextPlanned.getDate() + 1 + nextTaskDays);


      // Update any linked tasks
      const linkedTasks = await pool.request()
        .input('linkTo', nextTaskId)
        .query(`SELECT TaskID FROM tblTasks WHERE linkTasks = @linkTo`);

      for (const row of linkedTasks.recordset) {
        await pool.request()
          .input('plannedDate', nextPlanned.toISOString().split('T')[0])
          .input('linkedId', row.TaskID)
          .query(`UPDATE tblTasks SET PlannedDate = @plannedDate WHERE TaskID = @linkedId`);
      }
    }

    // Mark the next task in this department and workflow as selected
    await pool.request()
      .input('depId', DepId)
      .input('workFlowHdrId', workFlowHdrId)
      .query(`
        ;WITH NextTask AS (
          SELECT TOP 1 t.TaskID
          FROM tblTasks t
          JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
          WHERE t.DepId = @depId
            AND w.workFlowHdrId = @workFlowHdrId
            AND t.IsTaskSelected = 0
            AND w.TimeFinished IS NULL
          ORDER BY t.Priority ASC, t.PlannedDate ASC
        )
        UPDATE tblTasks
        SET IsTaskSelected = 1
        FROM tblTasks t
        JOIN NextTask nt ON t.TaskID = nt.TaskID
      `);

    // Check if all tasks in this department and workflow are finished
    const remaining = await pool.request()
      .input('depId', DepId)
      .input('workFlowHdrId', workFlowHdrId)
      .query(`
        SELECT COUNT(*) AS Remaining
        FROM tblTasks t
        JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
        WHERE t.DepId = @depId
          AND w.workFlowHdrId = @workFlowHdrId
          AND w.TimeFinished IS NULL
      `);
 
    if (remaining.recordset[0].Remaining === 0) {
      // All tasks in this department are finished—activate the next department
      const processInfo = await pool.request()
        .input('depId', DepId)
        .input('processID', processID)
        .query(`
          SELECT ProcessID, StepOrder
          FROM tblProcessDepartment
          WHERE DepartmentID = @depId AND ProcessID = @processID
        `);

      if (processInfo.recordset.length > 0) {
        const { ProcessID, StepOrder } = processInfo.recordset[0];

        const nextDeptResult = await pool.request()
          .input('processId', ProcessID)
          .input('nextStep', StepOrder + 1)
          .query(`
            UPDATE tblProcessDepartment
            SET IsActive = 1
            OUTPUT INSERTED.DepartmentID
            WHERE ProcessID = @processId AND StepOrder = @nextStep
          `);

        if (nextDeptResult.recordset.length > 0) {
          const nextDepId = nextDeptResult.recordset[0].DepartmentID;

         const usersEmailResult = await pool.request()
  .input('depId', nextDepId)
  .query(`
    SELECT usrEmail 
    FROM tblUsers 
    WHERE DepartmentID = @depId AND usrEmail IS NOT NULL
  `);

const userEmails = usersEmailResult.recordset.map(row => row.usrEmail);
console.log("emails", userEmails)
// Send to each email via Resend
    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'Nabilgreen500@gmail.com',
        subject: 'New Process Activated for Your Department',
        text: `Hello,\n\nYour department has been activated for the next step in the project workflow.\n\nRegards,\nEngineering Project Dashboard`
      });
      console.log(`Email sent to via Resend`);
    } catch (err) {
      console.error(`Resend email error for :`, err);
    }
  
     await pool.request()
            .input('nextDepId', nextDepId)
            .input('workFlowHdrId', workFlowHdrId)
            .query(`
              ;WITH NextTask AS (
                SELECT TOP 1 t.TaskID
                FROM tblTasks t
                JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
                WHERE t.DepId = @nextDepId
                  AND w.workFlowHdrId = @workFlowHdrId
                  AND t.IsTaskSelected = 0
                  AND w.TimeFinished IS NULL
                ORDER BY t.Priority ASC, t.PlannedDate ASC
              )
              UPDATE tblTasks
              SET IsTaskSelected = 1
              FROM tblTasks t
              JOIN NextTask nt ON t.TaskID = nt.TaskID
            `);

          // (ADDED) Set planned date for that first task in the new department
          const nextDeptTask = await pool.request()
            .input('nextDepId', nextDepId)
            .input('workFlowHdrId', workFlowHdrId)
            .query(`
              SELECT TOP 1 t.TaskID, t.DaysRequired
              FROM tblTasks t
              JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
              WHERE t.DepId = @nextDepId
                AND w.workFlowHdrId = @workFlowHdrId
                AND t.IsTaskSelected = 1
                AND w.TimeFinished IS NULL
              ORDER BY t.Priority ASC, t.TaskID ASC
            `);

          if (nextDeptTask.recordset.length > 0) {
            const nextDeptTaskId = nextDeptTask.recordset[0].TaskID;
            const nextDeptDays = nextDeptTask.recordset[0].DaysRequired || 1;

            const plannedDate = new Date(finished);
            plannedDate.setDate(plannedDate.getDate() + 1 + nextDeptDays);

            // Update linked tasks
            const linked = await pool.request()
              .input('linkTo', nextDeptTaskId)
              .query(`SELECT TaskID FROM tblTasks WHERE linkTasks = @linkTo`);

            for (const row of linked.recordset) {
              await pool.request()
                .input('plannedDate', plannedDate.toISOString().split('T')[0])
                .input('linkedId', row.TaskID)
                .query(`UPDATE tblTasks SET PlannedDate = @plannedDate WHERE TaskID = @linkedId`);
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error finishing task:', error);
    res.status(500).json({ error: 'Failed to finish task' });
  }
});





app.get('/is-first-task/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const taskResult = await pool.request()
      .input('taskId', taskId)
      .query('SELECT DepId FROM tblTasks WHERE TaskID = @taskId');

    if (taskResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const depId = taskResult.recordset[0].DepId;

    const countResult = await pool.request()
      .input('depId', depId)
      .query(`
        SELECT COUNT(*) AS selectedCount
        FROM tblTasks
        WHERE DepId = @depId AND IsTaskSelected = 1
      `);

    const isFirst = countResult.recordset[0].selectedCount === 0;
    res.json({ isFirst });
  } catch (err) {
    console.error('Error checking first task:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});


app.post('/select-task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { plannedDate } = req.body;

  try {
    const taskResult = await pool.request()
      .input('taskId', taskId)
      .query('SELECT DepId FROM tblTasks WHERE TaskID = @taskId');

    if (taskResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const depId = taskResult.recordset[0].DepId;

    const countResult = await pool.request()
      .input('depId', depId)
      .query(`
        SELECT COUNT(*) AS selectedCount
        FROM tblTasks
        WHERE DepId = @depId AND IsTaskSelected = 1
      `);

    const isFirst = countResult.recordset[0].selectedCount === 0;

    if (isFirst) {
      if (!plannedDate) {
        return res.status(400).json({ error: 'Planned date is required for first task' });
      }

      await pool.request()
        .input('taskId', taskId)
        .input('plannedDate', plannedDate)
        .query(`
          UPDATE tblTasks
          SET IsTaskSelected = 1, PlannedDate = @plannedDate
          WHERE TaskID = @taskId
        `);
    } else {
      await pool.request()
        .input('taskId', taskId)
        .query('UPDATE tblTasks SET IsTaskSelected = 1 WHERE TaskID = @taskId');
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error selecting task:', err);
    res.status(500).json({ error: 'Failed to select task' });
  }
});



app.post('/api/tasks/switch-details', async (req, res) => {
  const { taskIdA, taskIdB } = req.body;

  try {
    const pool = await sql.connect(config);

    // Fetch planned date and other swappable fields for both tasks
    const taskA = await pool.request()
      .input('taskIdA', sql.Int, taskIdA)
      .query(`
        SELECT PlannedDate, IsTaskSelected, IsDateFixed, Priority, PredecessorID
        FROM tblTasks WHERE TaskID = @taskIdA
      `);

    const taskB = await pool.request()
      .input('taskIdB', sql.Int, taskIdB)
      .query(`
        SELECT PlannedDate, IsTaskSelected, IsDateFixed, Priority, PredecessorID
        FROM tblTasks WHERE TaskID = @taskIdB
      `);

    const a = taskA.recordset[0];
    const b = taskB.recordset[0];

    // Check if either task has a planned date
    if (a.PlannedDate || b.PlannedDate) {
      return res.status(400).json({
        success: false,
        message: "Swap not allowed: one or both tasks already have a PlannedDate."
      });
    }

    // Swap fields
    await pool.request()
      .input('taskIdA', sql.Int, taskIdA)
      .input('IsTaskSelected', sql.Bit, b.IsTaskSelected)
      .input('IsDateFixed', sql.Bit, b.IsDateFixed)
      .input('Priority', sql.Int, b.Priority)
      .input('PredecessorID', sql.Int, b.PredecessorID)
      .query(`
        UPDATE tblTasks SET
          IsTaskSelected = @IsTaskSelected,
          IsDateFixed = @IsDateFixed,
          Priority = @Priority,
          PredecessorID = @PredecessorID
        WHERE TaskID = @taskIdA
      `);

    await pool.request()
      .input('taskIdB', sql.Int, taskIdB)
      .input('IsTaskSelected', sql.Bit, a.IsTaskSelected)
      .input('IsDateFixed', sql.Bit, a.IsDateFixed)
      .input('Priority', sql.Int, a.Priority)
      .input('PredecessorID', sql.Int, a.PredecessorID)
      .query(`
        UPDATE tblTasks SET
          IsTaskSelected = @IsTaskSelected,
          IsDateFixed = @IsDateFixed,
          Priority = @Priority,
          PredecessorID = @PredecessorID
        WHERE TaskID = @taskIdB
      `);

    res.json({ success: true, message: "Task fields swapped successfully." });

  } catch (err) {
    console.error("❌ Error swapping task fields:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
