import express from "express";
import bodyParser from "body-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sql from 'mssql';

// Get the directory name using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  user: 'sa',
  password: 'sa',
  server: 'localhost',
  database: 'AccDBF',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const app = express();
const port = 3000;

// Create a global connection pool
let pool;

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to SQL Server when starting the app
async function initializeDatabase() {
  try {
    pool = await sql.connect(config);
    console.log('Connected to database');
    
    // Start the server only after database connection is established
    app.listen(port, () => {
      console.log("Listening on port", port);
    });
  } catch (err) {
    console.error("SQL connection error", err);
    process.exit(1); // Exit if we can't connect to the database
  }
}

initializeDatabase();

function formatToSQLDate(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} 00:00:00.000`;
}



// Route to render the package form
app.get("/addPackage", async (req, res) => {
res.render("packagefrom.ejs");
});

// Route to render the task form
app.get("/addTask", async (req, res) => {
  res.render("task.ejs");
});

app.get("/addProcess", async (req, res) => {
  try {
    const result = await pool.request().query("SELECT DepartmentID, DeptName FROM tblDepartments");
    const departments = result.recordset;
    res.render("process.ejs", { departments }); 
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    res.status(500).send("Error loading departments.");
  }
});

app.get("/addWorkflow", async (req, res) => {
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

app.get("/api/package/:id", async (req, res) => {
  const packageId = parseInt(req.params.id);

  try {
    const packageResult = await pool.request()
      .input('PackageID', sql.Int, packageId)
      .query(`
        SELECT 
          PkgeName, 
          Duration AS RequestedDuration
        FROM tblPackages 
        WHERE PkgeID = @PackageID
      `);

    const tasksResult = await pool.request()
      .input('PackageID', sql.Int, packageId)
      .query(`
        SELECT 
          TaskName,
          PlannedDate,
          DateFinished,
          DATEDIFF(DAY, PlannedDate, DateFinished) AS ActualDuration,
          CASE 
            WHEN DateFinished > PlannedDate THEN DATEDIFF(DAY, PlannedDate, DateFinished) 
            ELSE 0 
          END AS DelayDays,
          TaskActual AS Reason
        FROM tblTasks 
        WHERE PkgeID = @PackageID
      `);

    const packageData = packageResult.recordset[0];
    const tasks = tasksResult.recordset;

    const totalActualDuration = tasks.reduce((sum, task) => sum + (task.ActualDuration || 0), 0);
    const totalDelay = tasks.reduce((sum, task) => sum + (task.DelayDays || 0), 0);

    res.json({
      package: {
        name: packageData.PackageName,
        requestedDuration: packageData.RequestedDuration,
        actualDuration: totalActualDuration,
        totalDelay: totalDelay
      },
      tasks
    });
  } catch (err) {
    console.error("Fetch package data failed:", err);
    res.status(500).json({ error: "Internal server error" });
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

  // Ensure Departments is an array
  const departmentIDs = Array.isArray(Departments) ? Departments : [Departments];

  try {
    // Insert into tblProcess and get the inserted ID
    const processResult = await pool.request()
      .input("ProcessName", sql.VarChar(100), ProcessName)
      .query("INSERT INTO tblProcess (ProcessName) OUTPUT INSERTED.NumberOfProccessID AS ProcessID VALUES (@ProcessName)");

    const ProcessID = processResult.recordset[0].ProcessID;

    // Insert each department into tblProcessDepartment
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

  // Validate inputs
  if (!WorkflowName || !usrID || !TaskID || !PkgeID) {
    return res.status(400).send({ error: 'Missing required fields' });
  }

  // Format datetime values
  const timeStartedFormatted = TimeStarted
    ? new Date(TimeStarted).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const timeFinishedFormatted = TimeFinished
    ? new Date(TimeFinished).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  try {
    await pool.request()
      .input('WorkflowName', sql.VarChar(100), WorkflowName)
      .input('usrID', sql.VarChar(10), usrID)
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

    res.status(201).send({ message: 'Workflow created successfully' });
  } catch (err) {
    console.error('SQL error:', err);
    res.status(500).send({ error: 'Database insert failed' });
  }
});


// Listen on the defined port
app.listen(port, () => {
  console.log("Listening on port", port);
});
