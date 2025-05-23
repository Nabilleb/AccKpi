import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';
import session from 'express-session';

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
      .query(`SELECT usrID, usrDesc, usrAdmin FROM tblUsers WHERE usrEmail = @username AND usrPWD = @password`);

    if (result.recordset.length === 1) {
      req.session.user = {
        id: result.recordset[0].usrID,
        name: result.recordset[0].usrDesc,
        usrAdmin: result.recordset[0].usrAdmin
      };            
      console.log(result.recordset[0].usrAdmin)
      res.redirect(result.recordset[0].usrAdmin ? "/adminpage" : `/userpage?id=${result.recordset[0].usrID}`);

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
    FROM tblDepartmentTask DPT
    JOIN tblTasks T ON DPT.TaskID = T.TaskID
    LEFT JOIN tblWorkflow W ON T.TaskID = W.TaskID
    WHERE DPT.DepartmentID = @departmentID
  `;

  try {
    const result = await pool.request()
      .input('departmentID', sql.Int, departmentID)
      .query(query);

    res.json(result.recordset);
    console.log(result.recordset)
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
    const queryUserId = req.query.id;
    console.log(queryUserId)
console.log(sessionUserId)
    if (sessionUserId !== queryUserId) {
        return res.status(403).send("Access denied");
    }

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

        const processResult = await pool
            .request()
            .input('DepId', DepartmentID)
            .query(`
                SELECT P.ProcessName, P.processDesc, P.NumberOfProccessID
                FROM tblProcess P
                JOIN tblProcessDepartment PD ON P.NumberOfProccessID = PD.ProcessID
                WHERE PD.DepartmentID = @DepId
            `);

        const processes = processResult.recordset;
       
        const getProjects = await pool
                                 .request()
                                 .query('SELECT * FROM tblProject');
        const projects = getProjects.recordset;

        res.render('userpage', {
            userId: sessionUserId,
            departmentID: DepartmentID,
            usrDesc,
            department: deptDetails.DeptName,
            processes,
            projects
        });

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

    const isDeptInProcess = await pool
      .request()
      .input('processId', processId)
      .input('departmentId', userDeptId)
      .query(`
        SELECT * FROM tblProcessDepartment
        WHERE ProcessID = @processId AND DepartmentID = @departmentId
      `);

    if (isDeptInProcess.recordset.length === 0) {
      return res.status(403).json({ error: 'User not in process-related department' });
    }

   const tasksResult = await pool
  .request()
  .input('processId', processId)
  .input('departmentId', userDeptId)
  .query(
    `SELECT T.TaskID,T.TaskName,T.TaskPlanned, T.PlannedDate,T.isTaskSelected, T.isDateFixed, T.Delay, W.TimeFinished, W.DelayReason
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

app.post("/postTask",async (req, res) =>{

const { TaskName, TaskPlanned, TaskActual, IsTaskSelected, IsDateFixed, PlannedDate, DepartmentID } = req.body;

const isTaskSelected = IsTaskSelected ? 1 : 0;
const isDateFixed = IsDateFixed ? 1 : 0;
const plannedDateFormatted = PlannedDate
  ? new Date(PlannedDate).toISOString().slice(0, 19).replace('T', ' ')
  : null;

try {
  const taskResult = await pool.request()
    .input('TaskName', sql.VarChar(150), TaskName)
    .input('TaskPlanned', sql.Text, TaskPlanned)
    .input('TaskActual', sql.Text, TaskActual)
    .input('IsTaskSelected', sql.Bit, isTaskSelected)
    .input('IsDateFixed', sql.Bit, isDateFixed)
    .input('PlannedDate', sql.DateTime, plannedDateFormatted)
    .query(`
      INSERT INTO tblTasks (TaskName, TaskPlanned, TaskActual, IsTaskSelected, IsDateFixed, PlannedDate)
      OUTPUT INSERTED.TaskID
      VALUES (@TaskName, @TaskPlanned, @TaskActual, @IsTaskSelected, @IsDateFixed, @PlannedDate)
    `);

  const newTaskId = taskResult.recordset[0].TaskID;

  await pool.request()
    .input('DepartmentID', sql.Int, DepartmentID)
    .input('TaskID', sql.Int, newTaskId)
    .query(`
      INSERT INTO tblDepartmentTask (DepartmentID, TaskID)
      VALUES (@DepartmentID, @TaskID)
    `);

  res.status(201).send({ message: 'Task and department assignment completed.' });
} catch (err) {
  console.error('Error inserting task:', err);
  res.status(500).send({ error: 'Task insert failed' });
}

})

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

    const isDeptInProcess = await pool
      .request()
      .input('processId', processId)
      .input('departmentId', userDeptId)
      .query(`
        SELECT * FROM tblProcessDepartment
        WHERE ProcessID = @processId AND DepartmentID = @departmentId
      `);

    if (isDeptInProcess.recordset.length === 0) {
      return res.status(403).json({ error: 'User not in process-related department' });
    }

    const tasksResult = await pool
      .request()
      .input('processId', processId)
      .input('departmentId', userDeptId)
      .query(`
        SELECT 
          t.TaskID, 
          t.TaskName, 
          t.TaskPlanned, 
          t.PlannedDate, 
          t.IsDateFixed,
          wf.TimeFinished, 
          wf.Delay, 
          wf.DelayReason
        FROM tblDepartmentTask dt
        JOIN tblTasks t ON dt.TaskID = t.TaskID
        OUTER APPLY (
          SELECT TOP 1 TimeFinished, Delay, DelayReason
          FROM tblWorkflow
          WHERE TaskID = t.TaskID
          ORDER BY WorkflowID DESC
        ) wf
        WHERE dt.ProcessID = @processId AND dt.DepartmentID = @departmentId
      `);

    res.json(tasksResult.recordset);
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
        SELECT DISTINCT P.NumberOfProccessID, P.ProcessName, P.processDesc
        FROM tblProcess P
        JOIN tblProcessWorkflow PW ON P.NumberOfProccessID = PW.processID
        JOIN tblProcessDepartment PD ON P.NumberOfProccessID = PD.ProcessID
        WHERE PW.projectID = @projectId
          AND PD.DepartmentID = @departmentId
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




app.listen(port, () => {
  console.log("Listening on port", port);
});
