import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';
import session from 'express-session';
import { isDate } from "util/types";

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


app.get("/login",checkIfInSession ,(req,res) =>{
  res.render("login.ejs")
})

app.post("/login", async (req, res) => {
  const {username, password} = req.body;

  try {
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password) 
      .query(`SELECT usrID, usrDesc,DepartmentID, usrAdmin FROM tblUsers WHERE usrEmail = @username AND usrPWD = @password`);

    if (result.recordset.length === 1) {
      req.session.user = {
        id: result.recordset[0].usrID,
        name: result.recordset[0].usrDesc,
        usrAdmin: result.recordset[0].usrAdmin,
        DepartmentId: result.recordset[0].DepartmentID
      };            
      console.log(result.recordset[0].usrAdmin)
      res.redirect(result.recordset[0].usrAdmin ? "/adminpage" : "/userpage");

    }
    else{
      res.status(401).send("invalid")
    }

  }catch(err){
    console.log("login falied",err)
    res.status(500).send("Internal server error")
  }
})

app.get("/addPackage", isAdmin,async (req, res) => {
res.render("packagefrom.ejs");
});

app.get("/addTask",isAdmin, async (req, res) => {
  res.render("task.ejs");
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
      T.TaskName,
      T.PlannedDate,
      W.TimeFinished AS DateFinished,
      W.DelayReason,
      W.Delay
    FROM tblTasks T
    LEFT JOIN (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY TaskID ORDER BY TimeFinished DESC) AS rn
      FROM tblWorkflow
    ) W ON T.TaskID = W.TaskID AND W.rn = 1
    WHERE T.DepId = @departmentID
    ORDER BY T.PlannedDate;
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

        console.log(deptDetails)
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
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
  console.log("it is working")
  return res.status(403).json({ error: 'Process not currently active in your department' });
}


   const tasksResult = await pool
  .request()
  .input('processId', processId)
  .input('departmentId', userDeptId)
  .query(
    `SELECT T.TaskID,T.TaskName,T.TaskPlanned, T.PlannedDate,T.isTaskSelected, T.isDateFixed, W.Delay,W.TimeStarted,W.TimeFinished, W.DelayReason
     FROM tblTasks T
     JOIN tblWorkflow W ON W.TaskID = T.TaskID
     JOIN tblProcessDepartment P ON P.DepartmentID = @departmentId AND P.ProcessID = @processId
     WHERE T.DepId = @departmentId
    `
  );

     console.log(tasksResult.recordset)

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

    let departments = [];
    if (isAdmin) {
      const deptResult = await pool.request()
        .query('SELECT DepartmentID, DeptName FROM tblDepartments');
      departments = deptResult.recordset;
    }
console.log(departments)
    res.render('task.ejs', {
      isAdmin,
      departmentId,
      departments,
      predecessorTasks: taskResult.recordset
    });

  } catch (err) {
    console.error('Error loading add-task page:', err);
    res.status(500).send('Failed to load page');
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
        SELECT TOP 1 * FROM tblWorkflow
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


app.get("/adminpage", ensureAuthenticated, (req, res) => {
  const user = req.session.user;

  if (user && user.usrAdmin) {
    res.render("homepage.ejs", { user });
  } else {
    res.status(403).send("Forbidden: Admins only");
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
      UPDATE tblWorkflow
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
  const {
    TaskName, TaskPlanned, PlannedDate, DepId
  } = req.body;
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
      .query(`
        INSERT INTO tblTasks
        (TaskName, TaskPlanned, IsTaskSelected, IsDateFixed, PlannedDate, DepId, Priority, PredecessorID)
        OUTPUT INSERTED.TaskID
        VALUES (@TaskName, @TaskPlanned, @IsTaskSelected, @IsDateFixed, @PlannedDate, @DepId, @Priority, @PredecessorID)
      `);

    const newTaskId = taskInsertResult.recordset[0].TaskID;

    const workflowName = `${TaskName}`;

    await pool.request()
      .input('WorkflowName', sql.NVarChar, workflowName)
      .input('TaskID', sql.Int, newTaskId)
      .query(`
        INSERT INTO tblWorkflow (WorkflowName, TaskID)
        VALUES (@WorkflowName, @TaskID)
      `);

    res.redirect('/userpage');

  } catch (err) {
    console.error('Error adding task:', err);
    res.status(500).send('Failed to add task');
  }
});

app.get('/edit-task/:id', async (req, res) => {
  const taskId = req.params.id;

  try {
    const result = await pool
      .request()
      .input('TaskID', sql.Int, taskId)
      .query('SELECT * FROM tblTasks WHERE TaskID = @TaskID');

    if (result.recordset.length === 0) {
      return res.status(404).send('Task not found');
    }

    const task = result.recordset[0];

    res.render('edittasks.ejs', { task });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
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

    res.redirect('/userpage'); 
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
console.log(WorkflowName)
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
        SELECT TOP 1 * FROM tblWorkflow 
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
            UPDATE tblWorkflow
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
          INSERT INTO tblWorkflow (
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

    const tasksResult = await pool
      .request()
      .input('processId', processId)
      .query(`
        SELECT 
          TaskID,
          TaskName,
          TaskPlanned,
          PlannedDate,
          IsDateFixed,
          isTaskSelected,
          DepId,
          Priority,
          PredecessorID,
          DaysFinished,
          Delay
        FROM tblTasks
        WHERE ProcessID = @processId
        ORDER BY Priority ASC
      `);

    if (tasksResult.recordset.length === 0) {
      return res.json([]);
    }

    // 3. Get latest workflow status for these tasks
    const taskIds = tasksResult.recordset.map(t => t.TaskID);
    const workflowResult = await pool
      .request()
      .query(`
        WITH LatestWorkflow AS (
          SELECT 
            TaskID,
            TimeStarted,
            TimeFinished,
            Delay,
            DelayReason,
            ROW_NUMBER() OVER (PARTITION BY TaskID ORDER BY WorkflowID DESC) as rn
          FROM tblWorkflow
          WHERE TaskID IN (${taskIds.map((_, i) => `@task${i}`).join(',')})
        )
        SELECT * FROM LatestWorkflow WHERE rn = 1
      `, 
      taskIds.reduce((params, id, i) => ({ ...params, [`task${i}`]: id }), {})
    );

    const tasksWithWorkflow = tasksResult.recordset.map(task => {
      const workflow = workflowResult.recordset.find(w => w.TaskID === task.TaskID);
      return {
        ...task,
        IsUserDept: task.DepId === userDeptId ? 1 : 0,
        TimeStarted: workflow?.TimeStarted || null,
        TimeFinished: workflow?.TimeFinished || null,
        Delay: workflow?.Delay || task.Delay || null,
        DelayReason: workflow?.DelayReason || null
      };
    });
console.log("dddd",tasksWithWorkflow)
    res.json(tasksWithWorkflow);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


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
console.log(result.recordset)
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

      if (field === 'plannedDate') {
        const check = await pool
          .request()
          .input('taskId', taskId)
          .query('SELECT IsDateFixed FROM tblTasks WHERE TaskID = @taskId');

        const isFixed = check.recordset[0]?.IsDateFixed;

        if (isFixed === false) {
          await pool
            .request()
            .input('taskId', taskId)
            .input('value', sql.DateTime, new Date(value))
            .query('UPDATE tblTasks SET PlannedDate = @value WHERE TaskID = @taskId');

          console.log(`PlannedDate updated for TaskID ${taskId}`);
        } else {
          console.log(`TaskID ${taskId}: Date is fixed, not updated.`);
        }
      }

      if (field === 'delayReason') {
        await pool
          .request()
          .input('taskId', taskId)
          .input('usrID', usrID)
          .input('value', value)
          .query(`
         UPDATE tblWorkflow
SET DelayReason = @value
WHERE TaskID = @taskId AND WorkflowID = (
  SELECT TOP 1 WorkflowID
  FROM tblWorkflow
  WHERE TaskID = @taskId
  ORDER BY WorkflowID DESC
);

          `);

        console.log(`Delay reason updated for TaskID ${taskId}`);
      }
    }

    res.json({ success: true });

  } catch (err) {
    console.error('Error saving updates:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



app.post('/start-task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { startTime } = req.body;

  try {
    await pool.request()
      .input('taskId', taskId)
      .input('startTime', startTime)
      .query(`
        UPDATE tblWorkflow
        SET TimeStarted = @startTime
        WHERE TaskID = @taskId AND TimeStarted IS NULL
      `);

    res.sendStatus(200);
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({ error: 'Failed to start task' });
  }
});

app.post('/finish-task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { finishTime } = req.body;

  try {
    const taskResult = await pool.request()
      .input('taskId', taskId)
      .query(`
        SELECT PlannedDate, DepId
        FROM tblTasks
        WHERE TaskID = @taskId
      `);

    if (taskResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.recordset[0];
    const depId = task.DepId;

    const finished = new Date(finishTime);
    const planned = new Date(task.PlannedDate);
    const delay = Math.max(0, Math.ceil((finished - planned) / (1000 * 60 * 60 * 24)));

    await pool.request()
      .input('taskId', taskId)
      .input('finishTime', finishTime)
      .input('delay', delay)
      .query(`
        UPDATE tblWorkflow
        SET TimeFinished = @finishTime, Delay = @delay
        WHERE TaskID = @taskId
      `);

    await pool.request()
      .input('taskId', taskId)
      .query(`
        UPDATE tblTasks SET IsTaskSelected = 0 WHERE TaskID = @taskId
      `);

    await pool.request()
      .input('taskId', taskId)
      .input('depId', depId)
      .query(`
        UPDATE TOP (1) tblTasks
        SET IsTaskSelected = 1
        WHERE DepId = @depId AND PredecessorID = @taskId
      `);

    const remainingTasks = await pool.request()
      .input('depId', depId)
      .query(`
        SELECT COUNT(*) AS Remaining
        FROM tblTasks t
        JOIN tblWorkflow w ON t.TaskID = w.TaskID
        WHERE t.DepId = @depId AND w.TimeFinished IS NULL
      `);

    if (remainingTasks.recordset[0].Remaining === 0) {
      const processInfo = await pool.request()
        .input('depId', depId)
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
console.log(nextDepId);
 await pool.request()
  .input('nextDepId', nextDepId)
  .query(`
    ;WITH NextTask AS (
      SELECT TOP 1 *
      FROM tblTasks
      WHERE DepId = @nextDepId AND IsTaskSelected = 0
      ORDER BY Priority ASC, PlannedDate ASC
    )
    UPDATE NextTask
    SET IsTaskSelected = 1
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


