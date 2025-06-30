import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';
import session from 'express-session';
import { isDate } from "util/types";
import nodemailer from 'nodemailer';

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

let pool;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static("public"));
app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));

async function initializeDatabase() {
  try {
    pool = await sql.connect(config);
    console.log('Connected to database');
    
    app.listen(port, () => {
      console.log("Listening on port", port);
    });
  } catch (err) {
    console.error("SQL connection error", err);
    process.exit(1); 
  }
}

initializeDatabase();

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login'); 
}

function checkIfInSession(req, res, next){
  if(req.session && req.session.user){
    return res.redirect(req.session.user.usrAdmin ? "/adminpage":`/userpage?id=${req.session.user.id}`);
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).send("Unauthorized: Please log in.");
  }

  if (!req.session.user.usrAdmin) {
    return res.status(403).send("Forbidden: Admins only.");
  }

  next();
}


app.use(session({
  secret: 'cat keyboard 10',
  resave: false,
  saveUninitialized: true,
}));


app.get("/login",checkIfInSession ,async(req,res) =>{    
  const result = await pool.request()
                          .query("SELECT * FROM tblProject")
  res.render("login.ejs", {project:result.recordset})
})

app.post("/login", async (req, res) => {
  const { username, password, projectId } = req.body;

  try {
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password) 
      .query(`
        SELECT usrID, usrDesc, DepartmentID, usrAdmin 
        FROM tblUsers 
        WHERE usrEmail = @username AND usrPWD = @password
      `);
      
    const project = await pool.request()
      .input('projectID', sql.Int, projectId)
      .query("SELECT * FROM tblProject WHERE projectID = @projectID");
      
    if (result.recordset.length === 1) {
      const user = result.recordset[0];
      const projectName = project.recordset[0].projectName;
      const proID = project.recordset[0].projectID;

      req.session.user = {
        id: user.usrID,
        name: user.usrDesc,
        usrAdmin: user.usrAdmin,
        DepartmentId: user.DepartmentID,
        projectName: projectName,
        projectID: proID
      };

      return res.json({ success: true, redirect: user.usrAdmin ? "/adminpage" : "/workFlowDash" });
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

app.get("/addTask",isAdmin, async (req, res) => {
  res.render("task.ejs");
});

app.get("/workFlowDash", async (req, res) => {
  try {
    const projects = await pool.request().query("SELECT projectID, projectName FROM tblProject");
    res.render("workflowdashboard.ejs", { projects: projects.recordset });
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



app.get("/api/workFlowDashData", async (req, res) => {
  const projectID = req.query.projectID;

  try {

        await pool.request().query(`
      UPDATE hdr
      SET hdr.completionDate = GETDATE(), hdr.status = 'Completed'
      FROM tblWorkflowHdr hdr
      WHERE NOT EXISTS (
        SELECT 1
        FROM tblWorkflowDtl dtl
        WHERE dtl.workFlowHdrId = hdr.workFlowID
          AND dtl.TimeFinished IS NULL
      )
      AND hdr.status != 'Completed'
    `);

    const request = pool.request();
    let query = `
      SELECT 
        hdr.WorkFlowID AS HdrID,
        p.ProcessName,
        pk.PkgeName AS PackageName,
        prj.projectID,
        prj.ProjectName,
        hdr.Status,
        hdr.completionDate
      FROM tblWorkflowHdr hdr
      LEFT JOIN tblProcess p ON hdr.ProcessID = p.NumberOfProccessID
      LEFT JOIN tblPackages pk ON hdr.PackageID = pk.PkgeID
      LEFT JOIN tblProject prj ON hdr.ProjectID = prj.ProjectID
    `;

    if (projectID) {
      request.input('ProjectID', sql.Int, projectID);
      query += ` WHERE hdr.ProjectID = @ProjectID`;
    }

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

  if (!sessionUser || !sessionUser.DepartmentId) {
    return res.status(401).send("Unauthorized or session expired");
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
    t.IsDateFixed,
    t.PlannedDate,
    t.DepId,
    t.Priority,
    t.PredecessorID,
    t.DaysRequired,
    t.linkTasks,
    d.WorkflowDtlId,
    d.WorkflowName,
    d.TimeStarted,
    d.TimeFinished,
    d.DelayReason,
    d.Delay,
    pr.NumberOfProccessID,
    pr.ProcessName,
    pj.ProjectID,
    pj.ProjectName,
    pk.PkgeName,
    dp.DeptName
  FROM tblWorkflowDtl d
  INNER JOIN tblTasks t ON d.TaskID = t.TaskID
  INNER JOIN tblWorkflowHdr hdr ON d.workFLowHdrId = hdr.WorkFlowID
  INNER JOIN tblProcess pr ON hdr.ProcessID = pr.NumberOfProccessID
  INNER JOIN tblProject pj ON hdr.ProjectID = pj.ProjectID
  INNER JOIN tblPackages pk ON pk.PkgeId = hdr.packageID
  INNER JOIN tblDepartments dp ON dp.DepartmentID = t.DepId
  WHERE d.workFLowHdrId = @HdrID
  ORDER BY t.Priority ASC
`);
console.log(tasksResult.recordset)

    const request2 = pool.request();
    request2.input('DepartmentID', sql.Int, DepId);

    const departmentResult = await request2.query(`
      SELECT DepartmentID, DeptName 
      FROM tblDepartments 
      WHERE DepartmentID = @DepartmentID
    `);

    const department = departmentResult.recordset[0] || { DeptName: 'Unknown' };

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
    const result = await pool.request().query("SELECT DepartmentID, DeptName FROM tblDepartments");
    const departments = result.recordset;
    res.render("process.ejs", { departments }); 
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    res.status(500).send("Error loading departments.");
  }
});

app.get('/api/tasks/by-department/:departmentID', async (req, res) => {
  const { departmentID } = req.params;

  const query = `
    SELECT 
    T.TaskID,
      T.TaskName,
      T.PlannedDate,
      T.DaysRequired,
      W.TimeFinished AS DateFinished,
      W.DelayReason,
      W.Delay
    FROM tblTasks T
    LEFT JOIN (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY TaskID ORDER BY TimeFinished DESC) AS rn
      FROM tblWorkflowDtl
    ) W ON T.TaskID = W.TaskID AND W.rn = 1
    WHERE T.DepId = @departmentID
    ORDER BY T.Priority;
  `;

  try {
    const result = await pool.request()
      .input('departmentID', sql.Int, departmentID)
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
  const isAdmin = req.session.user.usrAdmin; 
  const sessionDepId = req.session.DepartmentId;
  let departmentId = parseInt(req.query.DepartmentId);
  if (!departmentId && !isAdmin) {
    departmentId = sessionDepId;
  }

  if (!departmentId && !isAdmin) {
    return res.status(400).send('Missing or invalid DepartmentId');
  }

  try {
    const taskResult = await pool.request()
      .input('DepId', sql.Int, departmentId)
      .query(`
        SELECT TaskID, TaskName
        FROM tblTasks
        WHERE DepId = @DepId
      `);

    const isFirstTask = taskResult.recordset.length === 0;

    let departments = [];
    if (isAdmin) {
      const deptResult = await pool.request()
        .query('SELECT DepartmentID, DeptName FROM tblDepartments');
      departments = deptResult.recordset;
    }

    res.render('task.ejs', {
      isAdmin,
      departmentId,
      departments,
      predecessorTasks: taskResult.recordset,
      isFirstTask 
    });

  } catch (err) {
    console.error('Error loading add-task page:', err);
    res.status(500).send('Failed to load page');
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
  const { userId } = req.body; // read userId from body

  try {
    // Get user email by userId (not by task)
    const userEmailResult = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT usrEmail, usrDesc
        FROM tblUsers
        WHERE usrID = @userId
      `);

    if (userEmailResult.recordset.length > 0) {
      const assignedUser = userEmailResult.recordset[0];

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'Nabilgreen500@gmail.com',
          pass: 'ruoh nygp ewxd slad'
        }
      });

      const mailOptions = {
        from: 'Nabilgreen500@gmail.com',
        to: assignedUser.usrEmail,
        subject: 'Task Assigned to You',
        text: `Hello ${assignedUser.usrDesc},

A task with ID ${taskId} has been assigned to you.

Please log in to the Engineering Portal to begin your task.

Regards,
Engineering Project Dashboard`
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Error sending email to assigned user:', err);
          return res.status(500).json({ error: 'Failed to send email' });
        } else {
          console.log('Notification email sent to assigned user:', info.response);
          return res.status(200).json({ message: 'Email sent successfully' });
        }
      });
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

app.post('/add-task', async (req, res) => {
const { TaskName, TaskPlanned, PlannedDate, DepId, DaysRequired } = req.body;
  const IsDateFixed = req.body.IsDateFixed == '1' ? 1 : 0;

  try {
    const duplicateCheck = await pool.request()
      .input('TaskName', sql.NVarChar, TaskName)
      .input('DepId', sql.Int, DepId)
      .query(`
        SELECT COUNT(*) AS DuplicateCount
        FROM tblTasks
        WHERE TaskName = @TaskName AND DepId = @DepId
      `);

    if (duplicateCheck.recordset[0].DuplicateCount > 0) {
      return res.status(400).send('A task with the same name already exists in this department.');
    }

    const existingTasksResult = await pool.request()
      .input('DepId', sql.Int, DepId)
      .query(`
        SELECT COUNT(*) AS TaskCount
        FROM tblTasks
        WHERE DepId = @DepId
      `);

    const isFirstTask = existingTasksResult.recordset[0].TaskCount === 0;
    const IsTaskSelected = isFirstTask ? 1 : 0;

    const priorityResult = await pool.request()
      .input('DepId', sql.Int, DepId)
      .query(`
        SELECT ISNULL(MAX(Priority), 0) + 1 AS NewPriority
        FROM tblTasks
        WHERE DepId = @DepId
      `);

    const newPriority = priorityResult.recordset[0].NewPriority;

    let PredecessorID = null;

    if (!isFirstTask) {
      const predecessorResult = await pool.request()
        .input('DepId', sql.Int, DepId)
        .query(`
          SELECT TOP 1 TaskID 
          FROM tblTasks
          WHERE DepId = @DepId
          ORDER BY Priority DESC
        `);

      if (predecessorResult.recordset.length > 0) {
        PredecessorID = predecessorResult.recordset[0].TaskID;
      }
    }

    const taskInsertResult = await pool.request()
      .input('TaskName', sql.NVarChar, TaskName)
      .input('TaskPlanned', sql.NVarChar, TaskPlanned)
      .input('IsTaskSelected', sql.Bit, IsTaskSelected)
      .input('IsDateFixed', sql.Bit, IsDateFixed)
.input('PlannedDate', sql.DateTime, PlannedDate)
      .input('DepId', sql.Int, DepId)
      .input('Priority', sql.Int, newPriority)
      .input('PredecessorID', sql.Int, PredecessorID)
      .input('DaysRequired', sql.Int, DaysRequired)
      .query(`
        INSERT INTO tblTasks
(TaskName, TaskPlanned, IsTaskSelected, IsDateFixed, PlannedDate, DepId, Priority, PredecessorID, DaysRequired)
OUTPUT INSERTED.TaskID
VALUES (@TaskName, @TaskPlanned, @IsTaskSelected, @IsDateFixed, @PlannedDate, @DepId, @Priority, @PredecessorID, @DaysRequired)
      `);

    const newTaskId = taskInsertResult.recordset[0].TaskID;

    const workflowName = `${TaskName}`;

    await pool.request()
      .input('WorkflowName', sql.NVarChar, workflowName)
      .input('TaskID', sql.Int, newTaskId)
      .query(`
        INSERT INTO tblWorkflowDtl (WorkflowName, TaskID)
        VALUES (@WorkflowName, @TaskID)
      `);
if(!req.session.user.usrAdmin){
    res.redirect('/userpage');
}
else{
  res.redirect("/adminpage")
}

  } catch (err) {
    console.error('Error adding task:', err);
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


app.post("/postProcess", async (req, res) => {
  const { ProcessName, Departments } = req.body;

  const departmentIDs = Array.isArray(Departments) ? Departments : [Departments];

  try {
    const processResult = await pool.request()
      .input("ProcessName", sql.VarChar(100), ProcessName)
      .query("INSERT INTO tblProcess (ProcessName) OUTPUT INSERTED.NumberOfProccessID AS ProcessID VALUES (@ProcessName)");

    const ProcessID = processResult.recordset[0].ProcessID;

    for (const deptID of departmentIDs) {
      await pool.request()
        .input("ProcessID", sql.Int, ProcessID)
        .input("DepartmentID", sql.Int, deptID)
        .query(`
          INSERT INTO tblProcessDepartment (ProcessID, DepartmentID)
          VALUES (@ProcessID, @DepartmentID)
        `);
    }

    res.status(201).send({ message: "Process and departments assigned successfully" });
  } catch (err) {
    console.error("Error assigning process:", err);
    res.status(500).send({ error: "Failed to assign process" });
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

  const insertDate = new Date();
  const lastUpdate = new Date();

  try {
    await pool.request()
      .input("usrID", sql.VarChar(10), usrID)
      .input("usrDesc", sql.VarChar(40), usrDesc)
      .input("usrPWD", sql.VarChar(15), usrPWD)
      .input("usrAdmin", sql.Bit, usrAdmin ? 1 : 0)
      .input("usrSTID", sql.SmallInt, usrSTID || null)
      .input("DepartmentID", sql.Int, parseInt(DepartmentID))
      .input("AllowAccess", sql.Bit, AllowAccess ? 1 : 0)
      .input("Export", sql.SmallInt, Export || 0)
      .input("LastUpdate", sql.DateTime, lastUpdate)
      .input("usrEmail", sql.VarChar(50), usrEmail)
      .input("usrSignature", sql.VarChar(100), usrSignature)
      .input("emailSignature", sql.Text, emailSignature)
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
  try {
    for (const update of updates) {
      const { taskId, field, value, usrID } = update;
      if (field === 'daysRequired') {
        const check = await pool
          .request()
          .input('taskId', sql.Int, taskId)
          .query('SELECT IsDateFixed FROM tblTasks WHERE TaskID = @taskId');

        const isFixed = check.recordset[0]?.IsDateFixed;
        if (!isFixed) {
          await pool
            .request()
            .input('taskId', sql.Int ,taskId)
            .input('value',sql.Int ,value)
            .query('UPDATE tblTasks SET DaysRequired = @value WHERE TaskID = @taskId');

        } else {
        }
      }

      if (field === 'delayReason') {
        await pool
          .request()
          .input('taskId', taskId)
          .input('usrID', usrID)
          .input('value', value)
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
    }

    res.json({ success: true });

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
    // Update the task start time
    await pool.request()
      .input('taskId', taskId)
      .input('startTime', startTime)
      .query(`
        UPDATE tblWorkflowDtl
        SET TimeStarted = @startTime
        WHERE TaskID = @taskId AND TimeStarted IS NULL
      `);

    // ✅ Get DepId of the current task
    const depResult = await pool.request()
      .input('taskId', taskId)
      .query(`
        SELECT DepId
        FROM tblTasks
        WHERE TaskID = @taskId
      `);

    const currentDepId = depResult.recordset[0]?.DepId;

    // ✅ Find the next task in the same department (or your preferred logic)
    const nextTaskResult = await pool.request()
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

    // ✅ You now have the DepId of the next task (if any)
    console.log('Next DepId:', nextDepId);

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
  const { finishTime } = req.body;

  try {
    const finished = new Date(finishTime);

    const taskResult = await pool.request()
      .input('taskId', taskId)
      .query(`
        SELECT PlannedDate, DepId, DaysRequired
        FROM tblTasks
        WHERE TaskID = @taskId
      `);

    if (taskResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { PlannedDate, DepId, DaysRequired } = taskResult.recordset[0];
    const planned = new Date(PlannedDate);
    const delay = Math.max(0, Math.ceil((finished - planned) / (1000 * 60 * 60 * 24)));

    await pool.request()
      .input('taskId', taskId)
      .input('finishTime', finishTime)
      .input('delay', delay)
      .query(`
        UPDATE tblWorkflowDtl
        SET TimeFinished = @finishTime, Delay = @delay
        WHERE TaskID = @taskId
      `);

    await pool.request()
      .input('taskId', taskId)
      .query(`UPDATE tblTasks SET IsTaskSelected = 0 WHERE TaskID = @taskId`);

    const nextTaskResult = await pool.request()
      .input('depId', DepId)
      .query(`
        SELECT TOP 1 t.TaskID, t.DaysRequired
        FROM tblTasks t
        JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
        WHERE t.DepId = @depId
          AND t.IsTaskSelected = 0
          AND w.TimeFinished IS NULL
        ORDER BY t.Priority ASC, t.TaskID ASC
      `);

    if (nextTaskResult.recordset.length > 0) {
      const nextTaskId = nextTaskResult.recordset[0].TaskID;
      const nextTaskDaysRequired = nextTaskResult.recordset[0].DaysRequired || 1;

      const nextPlannedDate = new Date(finished);
      nextPlannedDate.setDate(nextPlannedDate.getDate() + 1 + nextTaskDaysRequired);

      await pool.request()
        .input('plannedDate', nextPlannedDate.toISOString().split('T')[0])
        .input('nextTaskId', nextTaskId)
        .query(`
          UPDATE tblTasks
          SET PlannedDate = @plannedDate
          WHERE TaskID = @nextTaskId
        `);

      const linkedTasksResult = await pool.request()
        .input('linkTo', nextTaskId)
        .query(`
          SELECT TaskID
          FROM tblTasks
          WHERE linkTasks = @linkTo
        `);

      for (const row of linkedTasksResult.recordset) {
        await pool.request()
          .input('plannedDate', nextPlannedDate.toISOString().split('T')[0])
          .input('linkedId', row.TaskID)
          .query(`
            UPDATE tblTasks
            SET PlannedDate = @plannedDate
            WHERE TaskID = @linkedId
          `);
      }
    }

    await pool.request()
      .input('depId', DepId)
      .query(`
        ;WITH NextTask AS (
          SELECT TOP 1 t.TaskID
          FROM tblTasks t
          JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
          WHERE t.DepId = @depId
            AND t.IsTaskSelected = 0
            AND w.TimeFinished IS NULL
          ORDER BY t.Priority ASC, t.PlannedDate ASC
        )
        UPDATE tblTasks
        SET IsTaskSelected = 1
        FROM tblTasks t
        JOIN NextTask nt ON t.TaskID = nt.TaskID
      `);

    const remaining = await pool.request()
      .input('depId', DepId)
      .query(`
        SELECT COUNT(*) AS Remaining
        FROM tblTasks t
        JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
        WHERE t.DepId = @depId AND w.TimeFinished IS NULL
      `);

    if (remaining.recordset[0].Remaining === 0) {
      const processInfo = await pool.request()
        .input('depId', DepId)
        .query(`
          SELECT ProcessID, StepOrder
          FROM tblProcessDepartment
          WHERE DepartmentID = @depId
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

          const deptEmailResult = await pool.request()
            .input('depId', nextDepId)
            .query(`
              SELECT DeptEmail
              FROM tblDepartments
              WHERE DepartmentID = @depId
            `);

          const departmentEmail = deptEmailResult.recordset[0]?.DeptEmail;

          if (departmentEmail) {
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: 'Nabilgreen500@gmail.com',
                pass: 'ruoh nygp ewxd slad'
              }
            });

            const mailOptions = {
              from: 'Nabilgreen500@gmail.com',
              to: departmentEmail,
              subject: 'New Process Activated for Your Department',
              text: `Hello,\n\nYour department has been activated for the next step in the project workflow.\n\nPlease log in to the dashboard to view and begin the assigned task.\n\nRegards,\nEngineering Project Dashboard`
            };

            transporter.sendMail(mailOptions, (err, info) => {
              if (err) console.error('Email error:', err);
              else console.log('Email sent:', info.response);
            });
          }

          await pool.request()
            .input('nextDepId', nextDepId)
            .query(`
              ;WITH NextTask AS (
                SELECT TOP 1 t.TaskID
                FROM tblTasks t
                JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
                WHERE t.DepId = @nextDepId
                  AND t.IsTaskSelected = 0
                  AND w.TimeFinished IS NULL
                ORDER BY t.Priority ASC, t.PlannedDate ASC
              )
              UPDATE tblTasks
              SET IsTaskSelected = 1
              FROM tblTasks t
              JOIN NextTask nt ON t.TaskID = nt.TaskID
            `);

          const nextDeptTaskResult = await pool.request()
            .input('nextDepId', nextDepId)
            .query(`
              SELECT TOP 1 t.TaskID, t.DaysRequired
              FROM tblTasks t
              JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
              WHERE t.DepId = @nextDepId
                AND t.IsTaskSelected = 1
                AND w.TimeFinished IS NULL
              ORDER BY t.Priority ASC, t.TaskID ASC
            `);

          if (nextDeptTaskResult.recordset.length > 0) {
            const nextDeptTaskId = nextDeptTaskResult.recordset[0].TaskID;
            const nextDeptDaysRequired = nextDeptTaskResult.recordset[0].DaysRequired || 1;

            const plannedDate = new Date(finished);
            plannedDate.setDate(plannedDate.getDate() + 1 + nextDeptDaysRequired);

            await pool.request()
              .input('plannedDate', plannedDate.toISOString().split('T')[0])
              .input('taskId', nextDeptTaskId)
              .query(`
                UPDATE tblTasks
                SET PlannedDate = @plannedDate
                WHERE TaskID = @taskId
              `);

            const linkedNextDeptTasks = await pool.request()
              .input('linkTo', nextDeptTaskId)
              .query(`
                SELECT TaskID
                FROM tblTasks
                WHERE linkTasks = @linkTo
              `);

            for (const row of linkedNextDeptTasks.recordset) {
              await pool.request()
                .input('plannedDate', plannedDate.toISOString().split('T')[0])
                .input('linkedId', row.TaskID)
                .query(`
                  UPDATE tblTasks
                  SET PlannedDate = @plannedDate
                  WHERE TaskID = @linkedId
                `);
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

