import express from "express";
import { Resend } from "resend";
import bodyParser from "body-parser";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';
import session from 'express-session';
import flash from 'connect-flash';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from "express-rate-limit";
import cookieParser from 'cookie-parser';
import https from "https";
import fs from "fs";
import path from "path";
import nodemailer from 'nodemailer';

// Load env vars
dotenv.config();

// File paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 3000;
const SERVER_IP = process.env.HOST || '0.0.0.0';

// --- Express App ---
const app = express();
const resend = new Resend(process.env.API_RESEND);

// Database config
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'sa',
  server: process.env.DB_SERVER || '10.10.2.123',
  database: process.env.DB_DATABASE || 'AccDBF',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000,
    requestTimeout: 5000
  }
};

// Fallback config for localhost (for local development)
const fallbackConfig = {
  user: 'sa',
  password: 'sa',
  server: 'localhost',
  database: process.env.DB_DATABASE || 'AccDBF',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};



// IIS-safe DB connection
let pool;
async function initializeDatabase() {
  console.log("⏳ Initializing database connection...");
  try {
    // Try to connect to server first
    console.log(`🔗 Attempting to connect to ${config.server}...`);
    pool = await sql.connect(config);
    console.log("✅ Database connected to server successfully");
  } catch (err) {
    console.error("❌ Server connection failed, attempting fallback to localhost...");
    console.error("   ↳ Error:", err.message);
    
    try {
      // Fallback to localhost
      console.log("🔄 Falling back to localhost...");
      pool = await sql.connect(fallbackConfig);
      console.log("✅ Database connected to localhost successfully");
    } catch (fallbackErr) {
      console.error("❌ Fallback connection also failed:");
      console.error("   ↳ Code:", fallbackErr.code);
      console.error("   ↳ Message:", fallbackErr.message);
    }
  }
}

// --- Middleware ---
// --- Middleware ---
console.log("⚙️  Configuring middlewares...");
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Static files
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
console.log(`📂 Static files will be served from: ${publicPath}`);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],

        "script-src": ["'self'", "'unsafe-inline'"],
        "script-src-attr": ["'unsafe-inline'"],

        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",      
        ],

        "font-src": [
          "'self'",
          "data:",
          "https://cdnjs.cloudflare.com",     
        ],

        "img-src": ["'self'", "data:", "https:"],

        "connect-src": ["'self'", "*"],
      },
    },

    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: '*', credentials: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000  // 1 hour for testing (change to 5 * 60 * 1000 for production)
  }
}));

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

app.use(flash());
console.log("✅ Middleware setup completed");


// Request logger (every request is logged)
app.use((req, res, next) => {
  console.log(`➡️  ${req.method} ${req.url} | User: ${req.session?.user?.id || "Guest"}`);
  next();
});

// Rate limiter
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again later."
});

// --- Auth helpers ---
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    console.log("🔒 Authenticated request");
    return next();
  }
  console.log("🔓 Unauthenticated access blocked");
  res.redirect('/');
}

function checkIfInSession(req, res, next) {
  if(req.session && req.session.user) {
    console.log(`👤 User already in session: ID=${req.session.user.id}`);
    return res.redirect(req.session.user.usrAdmin ? "/adminpage" : `/userpage?id=${req.session.user.id}`);
  }
  next();
}

function isAdmin(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.usrAdmin) {
    console.log("⛔ Admin check failed");
    return res.redirect("/");
  }
  console.log("✅ Admin access granted");
  next();
}
// --- Routes ---
app.get("/", (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.usrAdmin ? "/adminpage" : "/workFlowDash");
  }
  res.redirect('/login');
});

// --- HTTPS fallback removed, use only HTTP for server ---
async function startServer() {
  console.log("🟢 Starting server initialization...");

  try {
    await initializeDatabase()
    console.log("🔗 Database connected successfully.");
    app.listen(PORT, SERVER_IP, () => {
      console.log(`✅ HTTP server running at http://${SERVER_IP}:${PORT}`);
      console.log("✅ Everything worked");
    });
  } catch (err) {
    console.error("❌ Failed to start server:");
    console.error("   ↳ Code:", err.code);
    console.error("   ↳ Message:", err.message);
    console.error("   ↳ Stack:", err.stack);
  }

  console.log("🏁 Server initialization finished.");
}


// --- Global Error Handling ---
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

// Database connection middleware - check if pool is initialized
app.use((req, res, next) => {
  if (!pool) {
    // Allow login page to load even if DB is down
    if (req.path === '/login' || req.path === '/signup') {
      return next();
    }
    return res.status(503).json({ success: false, message: "Database is temporarily unavailable. Please try again later." });
  }
  next();
});

// Start server
startServer();





app.get('/login', checkIfInSession,(req, res) => {
  res.render('login.ejs');
});


app.post("/login", loginLimiter, async (req, res) => {
  let { username, password } = req.body;

  // Check if database is connected
  if (!pool) {
    console.error("❌ Database pool not initialized");
    return res.status(503).json({ success: false, message: "Database connection failed. Please try again later." });
  }

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
        SELECT usrID, usrDesc, DepartmentID, usrAdmin, IsSpecialUser 
        FROM tblUsers 
        WHERE LOWER(usrEmail) = @username AND usrPWD = @password
      `);

    if (result.recordset.length === 1) {
      const user = result.recordset[0];

      req.session.user = {
        id: user.usrID,
        name: user.usrDesc,
        usrAdmin: user.usrAdmin,
        DepartmentId: user.DepartmentID,
        IsSpecialUser: user.IsSpecialUser
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
res.render("packagefrom.ejs", {
  isAdmin: req.session.user.usrAdmin,
  userId: req.session.user.id,
  desc_user: req.session.user.name
});
});

// Add Package Form Route (for special users)
app.get("/addPackageForm", ensureAuthenticated, async (req, res) => {
  try {
    // Check if user is special user
    if (!req.session.user.IsSpecialUser) {
      return res.status(403).send("Forbidden: Special users only");
    }

    const projects = await pool.request().query("SELECT projectID, projectName FROM tblProject");
    const packages = await pool.request().query("SELECT PkgeID, PkgeName FROM tblPackages");
    const processes = await pool.request().query("SELECT NumberOfProccessID, ProcessName FROM tblProcess");

    res.render("addPackageForm", {
      projects: projects.recordset,
      packages: packages.recordset,
      processes: processes.recordset
    });
  } catch (err) {
    console.error("Error loading package form:", err);
    res.status(500).send("Error loading form");
  }
});

// Add Package POST Route (for special users)
app.post("/addPackageForm", ensureAuthenticated, async (req, res) => {
  try {
    // Check if user is special user
    if (!req.session.user.IsSpecialUser) {
      return res.status(403).json({ error: "Forbidden: Special users only" });
    }

    const { processID, projectID, packageID, startDate, status } = req.body;

    // Validate required fields
    if (!processID || !projectID || !packageID || !startDate) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate processID is numeric
    if (isNaN(processID)) {
      return res.status(400).json({
        error: 'Invalid processID: Must be a non-empty numeric value'
      });
    }

    // 1️⃣ Confirm the process exists in tblTasks at all
    const processCheck = await pool.request()
      .input('processID', sql.Int, parseInt(processID))
      .query(`
        SELECT TOP 1 TaskID 
        FROM tblTasks 
        WHERE proccessID = @processID AND WorkFlowHdrID IS NULL
      `);

    if (processCheck.recordset.length === 0) {
      return res.status(400).json({
        error: 'No tasks found for the specified processID'
      });
    }

    // 2️⃣ Get ALL departments for the process from tblProcessDepartment (without filtering IsActive)
    const depRes = await pool.request()
      .input('processID', sql.Int, parseInt(processID))
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
        .input('processID', sql.Int, parseInt(processID))
        .input('depId', sql.Int, depId)
        .query(`
          SELECT TOP 1 TaskID
          FROM tblTasks
          WHERE proccessID = @processID AND DepId = @depId AND WorkFlowHdrID IS NULL
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

    // 4️⃣ Insert workflow header and get the new workFlowID
    const insertResult = await pool.request()
      .input('processID', sql.Int, parseInt(processID))
      .input('projectID', sql.Int, parseInt(projectID))
      .input('packageID', sql.Int, parseInt(packageID))
      .input('startDate', sql.DateTime2, new Date(startDate))
      .input('status', sql.VarChar, status || 'Pending')
      .query(`
        INSERT INTO tblWorkFlowHdr (processID, projectID, packageID, startDate, status, createdDate)
        OUTPUT INSERTED.workFlowID
        VALUES (@processID, @projectID, @packageID, @startDate, @status, GETDATE())
      `);

    const newWorkflowID = insertResult.recordset[0].workFlowID;

    // 5️⃣ Get all ORIGINAL tasks for this process (not workflow copies)
    const tasks = await pool.request()
      .input('processID', sql.Int, parseInt(processID))
      .query(`
        SELECT TaskID, TaskName, TaskPlanned, IsTaskSelected, PlannedDate, DepId, Priority, PredecessorID, DaysRequired, linkTasks, IsFixed
        FROM tblTasks
        WHERE proccessID = @processID AND WorkFlowHdrID IS NULL
      `);

    // 6️⃣ Insert new task copies with all properties and create workflow detail records
    if (tasks.recordset.length > 0) {
      for (const task of tasks.recordset) {
        // Insert new task copy with all properties
        const insertTaskResult = await pool.request()
          .input('taskName', sql.VarChar, task.TaskName)
          .input('taskPlanned', sql.VarChar, task.TaskPlanned)
          .input('isTaskSelected', sql.Int, task.IsTaskSelected || 0)
          .input('plannedDate', sql.DateTime2, task.PlannedDate)
          .input('depId', sql.Int, task.DepId)
          .input('priority', sql.Int, task.Priority)
          .input('predecessorID', sql.Int, task.PredecessorID)
          .input('daysRequired', sql.Int, task.DaysRequired)
          .input('linkTasks', sql.VarChar, task.linkTasks)
          .input('processID', sql.Int, parseInt(processID))
          .input('workflowID', sql.Int, newWorkflowID)
          .input('isFixed', sql.Int, task.IsFixed || 1)
          .query(`
            INSERT INTO tblTasks (
              TaskName,
              TaskPlanned,
              IsTaskSelected,
              PlannedDate,
              DepId,
              Priority,
              PredecessorID,
              DaysRequired,
              linkTasks,
              proccessID,
              WorkFlowHdrID,
              IsFixed
            )
            OUTPUT INSERTED.TaskID
            VALUES (
              @taskName,
              @taskPlanned,
              @isTaskSelected,
              @plannedDate,
              @depId,
              @priority,
              @predecessorID,
              @daysRequired,
              @linkTasks,
              @processID,
              @workflowID,
              @isFixed
            )
          `);
        
        const newTaskID = insertTaskResult.recordset[0].TaskID;
        
        // Create workflow detail record for state tracking
        await pool.request()
          .input('workflowID', sql.Int, newWorkflowID)
          .input('taskID', sql.Int, newTaskID)
          .input('workflowName', sql.VarChar, task.TaskName)
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
            VALUES (
              @workflowID,
              @taskID,
              @workflowName,
              NULL,
              NULL,
              NULL,
              NULL,
              NULL
            )
          `);
      }
    }

    res.status(201).json({ 
      message: "Package added successfully!",
      success: true,
      workflowID: newWorkflowID
    });
  } catch (err) {
    console.error("Error adding package:", err);
    res.status(500).json({ error: "Failed to add package: " + err.message });
  }
});

app.get("/workFlowDash",ensureAuthenticated ,async (req, res) => {
  try {
    const projects = await pool.request().query("SELECT projectID, projectName FROM tblProject");
    const package1 = await pool.request().query("SELECT * FROM tblPackages");
    const process = await pool.request().query("SELECT * FROM tblProcess")
    const isAdmin = req.session.user.usrAdmin
    const isSpecialUser = req.session.user.IsSpecialUser
 

    res.render("workflowdashboard.ejs", { projects: projects.recordset, usrAdmin:isAdmin , packages: package1.recordset, processes:process.recordset, isSpecialUser: isSpecialUser });
  } catch (err) {
    console.error("Error loading projects:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// Subpackage Management Route
app.get("/subpackage", ensureAuthenticated, async (req, res) => {
  try {
    // Check if user is special user
    if (!req.session.user.IsSpecialUser) {
      return res.status(403).send("Forbidden: Special users only");
    }

    const packageResult = await pool.request().query("SELECT PkgeID, PkgeName FROM tblPackages");
    const subpackageResult = await pool.request().query(`
      SELECT sp.*, p.PkgeName
      FROM tblSubPackage sp
      LEFT JOIN tblPackages p ON sp.PkgeID = p.PkgeID
      ORDER BY sp.CreatedDate DESC
    `);

    res.render("subpackage.ejs", {
      packages: packageResult.recordset,
      subpackages: subpackageResult.recordset,
      desc_user: req.session.user.name
    });
  } catch (err) {
    console.error("Error loading subpackage page:", err);
    res.status(500).send("Error loading subpackage page");
  }
});

// API: Add Sub Package
app.post("/api/subpackage/add", ensureAuthenticated, async (req, res) => {
  try {
    // Check if user is special user
    if (!req.session.user.IsSpecialUser) {
      return res.status(403).json({ message: "Forbidden: Special users only" });
    }

    const { itemDescription, packageId, supplierName, supplierContractorType, supplierContractorName, awardValue, currency } = req.body;

    // Validate required fields
    if (!itemDescription || !packageId || !supplierName || !supplierContractorType || !supplierContractorName || !awardValue || !currency) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await pool.request()
      .input('itemDescription', sql.NVarChar, itemDescription)
      .input('packageId', sql.Int, parseInt(packageId))
      .input('supplierName', sql.VarChar, supplierName)
      .input('supplierContractorType', sql.VarChar, supplierContractorType)
      .input('supplierContractorName', sql.VarChar, supplierContractorName)
      .input('awardValue', sql.Decimal(18, 2), parseFloat(awardValue))
      .input('currency', sql.VarChar, currency)
      .query(`
        INSERT INTO tblSubPackage (ItemDescription, PkgeID, SupplierName, SupplierContractorType, SupplierContractorName, AwardValue, Currency, CreatedDate, UpdatedDate)
        VALUES (@itemDescription, @packageId, @supplierName, @supplierContractorType, @supplierContractorName, @awardValue, @currency, GETDATE(), GETDATE())
      `);

    res.json({ success: true, message: "Sub Package added successfully" });
  } catch (err) {
    console.error("Error adding sub package:", err);
    res.status(500).json({ message: "Error adding sub package", error: err.message });
  }
});

// API: Get Sub Packages
app.get("/api/subpackages", ensureAuthenticated, async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT sp.*, p.PkgeName
      FROM tblSubPackage sp
      LEFT JOIN tblPackages p ON sp.PkgeID = p.PkgeID
      ORDER BY sp.CreatedDate DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching sub packages:", err);
    res.status(500).json({ error: "Failed to fetch sub packages" });
  }
});

// API: Get Packages
app.get("/api/packages", ensureAuthenticated, async (req, res) => {
  try {
    const result = await pool.request().query("SELECT PkgeID, PkgeName FROM tblPackages ORDER BY PkgeName");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching packages:", err);
    res.status(500).json({ error: "Failed to fetch packages" });
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
      WHERE EXISTS (
        SELECT 1 FROM tblSubPackage sp
        WHERE sp.PkgeID = hdr.PackageID
      )
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
      query += ' AND ' + whereClauses.join(' AND ');
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
  t.IsFixed,
  t.WorkFlowHdrID,
  t.linkTasks,
  d.WorkflowDtlId,
  d.workFlowHdrId,
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
      packages: packages.recordset,
      isAdmin: req.session.user.usrAdmin,
      userId: req.session.user.id,
      desc_user: req.session.user.name
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

    res.render("addUser", {
      departments,
      isAdmin: req.session.user.usrAdmin,
      userId: req.session.user.id,
      desc_user: req.session.user.name
    });
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

        const user = {
          id: sessionUserId,
          name: usrDesc,
          DepartmentId: DepartmentID,
          DeptName: deptDetails.DeptName || 'Admin'
        };

        res.render('userpage', {
            userId: sessionUserId,
            departmentID: DepartmentID,
            usrDesc,
            department: deptDetails.DepartmentID,
            projects,
            user
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
    `SELECT T.TaskID,T.TaskName,T.TaskPlanned, T.DepId,T.PlannedDate,T.isTaskSelected, T.IsFixed,T.DaysRequired, W.Delay,W.TimeStarted,W.TimeFinished, W.DelayReason
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
        WHERE t.proccessID = @processId AND t.WorkFlowHdrID IS NULL
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
               T.DepId, T.IsFixed,T.DaysRequired,
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

app.get("/check-users", ensureAuthenticated, async (req, res) => {
  const user = req.session.user;
  const desc_user = req.session.user.name;
  
  if (!user || !user.usrAdmin) {
    return res.status(403).send("Forbidden: Admins only");
  }

  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        tu.usrID,
        tu.usrDesc,
        tu.usrAdmin,
        tu.usrEmail,
        td.DeptName,
        tu.DepartmentID,
        tu.insertDate,
        tu.IsSpecialUser
      FROM tblUsers tu
      LEFT JOIN tblDepartments td ON tu.DepartmentID = td.DepartmentID
      ORDER BY tu.usrID ASC
    `);
    
    res.render("checkuser.ejs", {
      user,
      desc_user,
      users: result.recordset
    });
  } catch (err) {
    console.error("Error fetching users:", err);
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

app.get("/add-department", isAdmin, async (req, res) => {
  res.render("dep.ejs", {
    isAdmin: req.session.user.usrAdmin,
    userId: req.session.user.id,
    desc_user: req.session.user.name
  });
});

app.post("/add-department", isAdmin, async (req, res) => {
  const { deptName, deptEmail } = req.body;

  // Validation
  if (!deptName || !deptName.trim()) {
    return res.status(400).send("Department name is required.");
  }

  if (deptName.length > 100) {
    return res.status(400).send("Department name cannot exceed 100 characters.");
  }

  // Email validation if provided
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (deptEmail && deptEmail.trim() && !emailPattern.test(deptEmail.trim())) {
    return res.status(400).send("Invalid email format.");
  }

  try {
    // Check for duplicate department name
    const duplicateCheck = await pool.request()
      .input('deptName', sql.NVarChar, deptName.trim())
      .query(`
        SELECT COUNT(*) AS DuplicateCount
        FROM tblDepartments
        WHERE UPPER(LTRIM(RTRIM(DeptName))) = UPPER(LTRIM(RTRIM(@deptName)))
      `);

    if (duplicateCheck.recordset[0].DuplicateCount > 0) {
      return res.status(400).send("A department with this name already exists.");
    }

    // Insert department
    const result = await pool.request()
      .input('deptName', sql.NVarChar, deptName.trim())
      .input('deptEmail', sql.NVarChar, deptEmail ? deptEmail.trim() : null)
      .query(`
        INSERT INTO tblDepartments (DeptName, DeptEmail)
        OUTPUT INSERTED.DepartmentID, INSERTED.DeptName, INSERTED.DeptEmail
        VALUES (@deptName, @deptEmail)
      `);

    const newDepartment = result.recordset[0];

    console.log(`✅ Department added successfully: ID=${newDepartment.DepartmentID}, Name=${newDepartment.DeptName}`);

    res.status(201).json({
      success: true,
      message: 'Department added successfully',
      department: newDepartment
    });

  } catch (err) {
    console.error("❌ Error inserting department:", err);
    res.status(500).json({ success: false, error: "Failed to add department" });
  }
});


app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// 📨 Assign user and send email
app.post('/assign-user-to-task/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const { userId, workFlowHdrId } = req.body;

  try {
    // 1️⃣ Get user email and name
    const userEmailResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT usrEmail, usrDesc
        FROM tblUsers
        WHERE usrID = @userId
      `);

    if (userEmailResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const assignedUser = userEmailResult.recordset[0];

    // 2️⃣ Update the task ONLY for this specific workflow
    await pool.request()
      .input('taskID', sql.Int, taskId)
      .input('workFlowHdrId', sql.Int, workFlowHdrId)
      .input('userDesc', sql.NVarChar, assignedUser.usrDesc)
      .query(`
        UPDATE tblWorkflowDtl
        SET assignUser = @userDesc
        WHERE TaskID = @taskID AND workFlowHdrId = @workFlowHdrId
      `);

    // 3️⃣ Send email
    const mailOptions = {
      from: '"Engineering Dashboard" <Nabilgreen500@gmail.com>',
      to: "Nabilgreen500@gmail.com",
      subject: 'Task Assigned to You',
      html: `
        <p>Hello ${assignedUser.usrDesc},</p>
        <p>A task with ID <strong>${taskId}</strong> has been assigned to you.</p>
        <p>Please log in to the Engineering Portal to begin your task.</p>
        <p>Regards,<br>Engineering Project Dashboard</p>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log('📨 Email sent to:', assignedUser.usrEmail);
    return res.status(200).json({ message: 'Email sent successfully' });

  } catch (error) {
    console.error('❌ Error assigning user to task:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});




app.post('/tasks/:id/update', async (req, res) => {
  const { id } = req.params; 
  const { PlannedDate, DelayReason, usrID } = req.body;

  try {
    await sql.query`
      UPDATE tblTasks
      SET PlannedDate = CASE WHEN IsFixed = 0 THEN ${PlannedDate} ELSE PlannedDate END
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

  // Validate required fields
  if (!packageName || !duration || !division || !trade) {
    return res.status(400).json({ error: 'Missing required fields: packageName, duration, division, trade' });
  }

  try {
    const result = await pool.request()
      .input('packageName', sql.VarChar, packageName)
      .input('duration', sql.Int, parseInt(duration))
      .input('division', sql.VarChar, division)
      .input('selected', sql.Bit, selected ? 1 : 0)
      .input('standard', sql.Bit, standard ? 1 : 0)
      .input('trade', sql.VarChar, trade)
      .input('fileUpload', sql.VarChar, fileUpload || null)
      .input('synched', sql.Bit, synched ? 1 : 0)
      .query(`
        INSERT INTO tblPackages (PkgeName, Duration, Division, Selected, Standard, Trade, FilePath, IsSynched, insertDate)
        VALUES (@packageName, @duration, @division, @selected, @standard, @trade, @fileUpload, @synched, GETDATE())
      `);

    res.status(200).json({ success: true, message: 'Package added successfully' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Database insertion failed: ' + error.message });
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
    IsFixed
  } = req.body;

  try {
    const poolConn = await pool.connect();

    // 1.5. Check if task is marked as fixed
    const isFixedBit = IsFixed && (IsFixed === '1' || IsFixed === 1 || IsFixed === true) ? 1 : 0;

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
      .input('TaskName', sql.NVarChar(150), TaskName)
      .input('TaskPlanned', sql.NVarChar, TaskPlanned)
      .input('IsTaskSelected', sql.Bit, IsTaskSelected)
      .input('PlannedDate', sql.Date, PlannedDateToInsert)
      .input('DepId', sql.Int, DepId)
      .input('Priority', sql.Int, finalPriority)
      .input('PredecessorID', PredecessorID)
      .input('DaysRequired', sql.Int, DaysRequiredInserted)
      .input('ProcessID', sql.Int, ProcessID)
      .input('IsFixed', sql.Bit, isFixedBit)

    if (workflowHdrId) {
      insertRequest.input('WorkFlowHdrID', sql.Int, workflowHdrId);
    }

    const insertResult = await insertRequest.query(`
      INSERT INTO tblTasks (
        TaskName, TaskPlanned, IsTaskSelected, PlannedDate,
        DepId, Priority, PredecessorID, DaysRequired, proccessID, IsFixed
        ${workflowHdrId ? ', WorkFlowHdrID' : ''}
      )
      OUTPUT INSERTED.TaskID
      VALUES (
        @TaskName, @TaskPlanned, @IsTaskSelected, @PlannedDate,
        @DepId, @Priority, @PredecessorID, @DaysRequired, @ProcessID, @IsFixed
        ${workflowHdrId ? ', @WorkFlowHdrID' : ''}
      )
    `);

    const newTaskId = insertResult.recordset[0].TaskID;

    // 10. Insert into tblWorkflowDtl if needed
    if (workflowHdrId) {
      await poolConn.request()
        .input('WorkflowName', sql.NVarChar, TaskPlanned)
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

    res.json({ success: true, message: 'Task created successfully', taskId: newTaskId });
  } catch (err) {
    console.error('❌ Error adding task:', err);
    res.status(500).json({ error: 'Failed to add task', details: err.message });
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
        t.IsFixed,
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
      taskWorkflows: joinedQuery.recordset,
      isAdmin: req.session.user?.usrAdmin || false,
      userId: req.session.user?.id,
      desc_user: req.session.user?.name
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

    res.render('edittasks.ejs', {
      task,
      isAdmin: req.session.user?.usrAdmin || false,
      userId: req.session.user?.id,
      desc_user: req.session.user?.name
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});



app.delete('/delete-task/:taskId', async (req, res) => {
  const taskId = parseInt(req.params.taskId);

  try {
    const poolConn = await sql.connect();
    const transaction = new sql.Transaction(poolConn);
    await transaction.begin();

    try {
      const request = transaction.request();
      request.input('TaskID', sql.Int, taskId);

      // Get the task info before deletion (DepId, ProcessID, Priority)
      const taskInfoResult = await request.query(`
        SELECT DepId, proccessID AS ProcessID, Priority
        FROM tblTasks
        WHERE TaskID = @TaskID
      `);

      if (taskInfoResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Task not found' });
      }

      const { DepId, ProcessID } = taskInfoResult.recordset[0];

      // Update tasks that depend on this task
      await request.query(`
        UPDATE tblTasks
        SET PredecessorID = NULL
        WHERE PredecessorID = @TaskID
      `);

      // Delete workflow details
      await request.query(`
        DELETE FROM tblWorkflowDtl
        WHERE TaskID = @TaskID
      `);

      // Delete the task
      await request.query(`
        DELETE FROM tblTasks
        WHERE TaskID = @TaskID
      `);

      // Recalculate dates for remaining tasks in the same department
      let getTasksReq = transaction.request();
      getTasksReq.input('DepId', sql.Int, DepId);
      getTasksReq.input('ProcessID', sql.Int, ProcessID);
      const remainingTasks = await getTasksReq.query(`
        SELECT TaskID, DaysRequired, Priority, PlannedDate
        FROM tblTasks
        WHERE DepId = @DepId AND proccessID = @ProcessID
        ORDER BY Priority ASC
      `);

      if (remainingTasks.recordset.length > 0) {
        // Recalculate priorities in ascending order
        for (let i = 0; i < remainingTasks.recordset.length; i++) {
          const task = remainingTasks.recordset[i];
          const newPriority = i + 1;
          
          let priorityReq = transaction.request();
          priorityReq.input('NewPriority', sql.Int, newPriority);
          priorityReq.input('UpdateTaskID', sql.Int, task.TaskID);
          await priorityReq.query(`
            UPDATE tblTasks
            SET Priority = @NewPriority
            WHERE TaskID = @UpdateTaskID
          `);
        }

        let currentStartDate = new Date();
        
        // Start from the first task
        for (const task of remainingTasks.recordset) {
          const taskDateStr = currentStartDate.toISOString().split('T')[0];
          
          let updateReq = transaction.request();
          updateReq.input('NewPlannedDate', sql.Date, taskDateStr);
          updateReq.input('UpdateTaskID', sql.Int, task.TaskID);
          await updateReq.query(`
            UPDATE tblTasks
            SET PlannedDate = @NewPlannedDate
            WHERE TaskID = @UpdateTaskID
          `);

          currentStartDate.setDate(currentStartDate.getDate() + task.DaysRequired);
        }

        // Get the StepOrder of the current department
        let stepReq = transaction.request();
        stepReq.input('DepId', sql.Int, DepId);
        stepReq.input('ProcessID', sql.Int, ProcessID);
        const stepResult = await stepReq.query(`
          SELECT StepOrder
          FROM tblProcessDepartment
          WHERE DepartmentID = @DepId AND ProcessID = @ProcessID
        `);

        if (stepResult.recordset.length > 0) {
          const currentStepOrder = stepResult.recordset[0].StepOrder;
          let currentEndDate = new Date(currentStartDate);

          // Cascade to subsequent departments
          let deptReq = transaction.request();
          deptReq.input('CurrentStepOrder', sql.Int, currentStepOrder);
          deptReq.input('ProcessID', sql.Int, ProcessID);
          const subsequentDepts = await deptReq.query(`
            SELECT DepartmentID, StepOrder
            FROM tblProcessDepartment
            WHERE StepOrder > @CurrentStepOrder AND ProcessID = @ProcessID
            ORDER BY StepOrder ASC
          `);

          for (const dept of subsequentDepts.recordset) {
            let tasksReq = transaction.request();
            tasksReq.input('DeptId', sql.Int, dept.DepartmentID);
            tasksReq.input('ProcessID', sql.Int, ProcessID);
            const tasksNextDept = await tasksReq.query(`
              SELECT TaskID, DaysRequired, Priority
              FROM tblTasks
              WHERE DepId = @DeptId AND proccessID = @ProcessID
              ORDER BY Priority ASC
            `);

            if (tasksNextDept.recordset.length > 0) {
              let newDeptStartDate = new Date(currentEndDate);

              for (const task of tasksNextDept.recordset) {
                const taskDateStr = newDeptStartDate.toISOString().split('T')[0];
                
                let updateDeptReq = transaction.request();
                updateDeptReq.input('NewPlannedDate', sql.Date, taskDateStr);
                updateDeptReq.input('UpdateTaskID', sql.Int, task.TaskID);
                await updateDeptReq.query(`
                  UPDATE tblTasks
                  SET PlannedDate = @NewPlannedDate
                  WHERE TaskID = @UpdateTaskID
                `);

                newDeptStartDate.setDate(newDeptStartDate.getDate() + task.DaysRequired);
              }

              currentEndDate = new Date(newDeptStartDate);
            }
          }
        }
      }

      await transaction.commit();
      res.status(200).json({ message: 'Task deleted and dates recalculated successfully' });

    } catch (error) {
      await transaction.rollback();
      console.error('Transaction error:', error);
      res.status(500).json({ error: 'Failed to delete task: ' + error.message });
    }

  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// DELETE: Delete User
app.delete('/delete-user/:usrID', ensureAuthenticated, async (req, res) => {
  const usrID = req.params.usrID;

  // Check if user is admin
  if (!req.user || !req.user.usrAdmin) {
    return res.status(403).json({ success: false, message: 'Unauthorized: Admin access required' });
  }

  // Prevent self-deletion
  if (req.user.usrID == usrID) {
    return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    try {
      // Delete user from tblUsers
      await transaction
        .request()
        .input('usrID', sql.Int, usrID)
        .query('DELETE FROM tblUsers WHERE usrID = @usrID');

      await transaction.commit();
      res.json({ success: true, message: 'User deleted successfully' });

    } catch (error) {
      await transaction.rollback();
      console.error('Transaction error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete user: ' + error.message });
    }

  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

app.post('/update-task/:id', async (req, res) => {
  const taskId = req.params.id;
  const { TaskName, TaskPlanned, IsFixed, PlannedDate } = req.body;

  try {
    await pool
      .request()
      .input('TaskID', sql.Int, taskId)
      .input('TaskName', sql.NVarChar, TaskName)
      .input('TaskPlanned', sql.NVarChar, TaskPlanned)
      .input('IsFixed', sql.Bit, IsFixed)
      .input('PlannedDate', sql.DateTime, PlannedDate)
      .query(`UPDATE tblTasks SET 
        TaskName = @TaskName, 
        TaskPlanned = @TaskPlanned, 
        IsFixed = @IsFixed, 
        PlannedDate = @PlannedDate 
        WHERE TaskID = @TaskID`);

    res.redirect("/adminpage"); 
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating task');
  }
});

// PUT endpoint for updating task via modal with date recalculation
app.put('/update-task/:taskId', async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { TaskName, TaskPlanned, DaysRequired } = req.body;

  try {
    const poolConn = await sql.connect();
    const transaction = new sql.Transaction(poolConn);
    await transaction.begin();

    try {
      // Get current task info
      let getTaskReq = transaction.request();
      getTaskReq.input('TaskID', sql.Int, taskId);
      const taskResult = await getTaskReq.query(`
        SELECT DepId, proccessID AS ProcessID, Priority, PlannedDate, DaysRequired
        FROM tblTasks
        WHERE TaskID = @TaskID
      `);

      if (taskResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Task not found' });
      }

      const task = taskResult.recordset[0];
      const { DepId, ProcessID } = task;
      const oldDaysRequired = task.DaysRequired;
      const oldPlannedDate = new Date(task.PlannedDate);

      // Update the task
      let updateReq = transaction.request();
      updateReq.input('TaskID', sql.Int, taskId);
      updateReq.input('TaskName', sql.NVarChar(150), TaskName);
      updateReq.input('TaskPlanned', sql.NVarChar, TaskPlanned);
      updateReq.input('DaysRequired', sql.Int, DaysRequired);
      await updateReq.query(`
        UPDATE tblTasks
        SET TaskName = @TaskName, TaskPlanned = @TaskPlanned, DaysRequired = @DaysRequired
        WHERE TaskID = @TaskID
      `);

      // Calculate the difference in days to cascade
      const daysDifference = (DaysRequired || 0) - (oldDaysRequired || 0);

      // Get all tasks in the same department ordered by priority to find subsequent tasks
      let getDepTasksReq = transaction.request();
      getDepTasksReq.input('DepId', sql.Int, DepId);
      getDepTasksReq.input('ProcessID', sql.Int, ProcessID);
      const depTasksResult = await getDepTasksReq.query(`
        SELECT TaskID, Priority, DaysRequired
        FROM tblTasks
        WHERE DepId = @DepId AND proccessID = @ProcessID
        ORDER BY Priority ASC
      `);

      // Find the position of the current task and update subsequent tasks in same department
      const taskIndex = depTasksResult.recordset.findIndex(t => t.TaskID === taskId);
      let currentDate = oldPlannedDate;
      currentDate.setDate(currentDate.getDate() + (DaysRequired || 0));

      if (taskIndex >= 0 && taskIndex < depTasksResult.recordset.length - 1) {
        // There are tasks after this one in the same department
        for (let i = taskIndex + 1; i < depTasksResult.recordset.length; i++) {
          const nextTask = depTasksResult.recordset[i];
          const newDateStr = currentDate.toISOString().split('T')[0];

          let updateNextReq = transaction.request();
          updateNextReq.input('NewDate', sql.Date, newDateStr);
          updateNextReq.input('TaskID', sql.Int, nextTask.TaskID);
          await updateNextReq.query(`
            UPDATE tblTasks
            SET PlannedDate = @NewDate
            WHERE TaskID = @TaskID
          `);

          currentDate.setDate(currentDate.getDate() + nextTask.DaysRequired);
        }
      }

      // Cascade to subsequent departments (always execute, not just when there are subsequent tasks in same dept)
      let getStepReq = transaction.request();
      getStepReq.input('DepId', sql.Int, DepId);
      getStepReq.input('ProcessID', sql.Int, ProcessID);
      const stepResult = await getStepReq.query(`
        SELECT StepOrder
        FROM tblProcessDepartment
        WHERE DepartmentID = @DepId AND ProcessID = @ProcessID
      `);

      if (stepResult.recordset.length > 0) {
        const currentStepOrder = stepResult.recordset[0].StepOrder;

        let getSubDeptReq = transaction.request();
        getSubDeptReq.input('CurrentStepOrder', sql.Int, currentStepOrder);
        getSubDeptReq.input('ProcessID', sql.Int, ProcessID);
        const subDeptResult = await getSubDeptReq.query(`
          SELECT DepartmentID, StepOrder
          FROM tblProcessDepartment
          WHERE StepOrder > @CurrentStepOrder AND ProcessID = @ProcessID
          ORDER BY StepOrder ASC
        `);

        for (const dept of subDeptResult.recordset) {
          let getSubTasksReq = transaction.request();
          getSubTasksReq.input('DeptId', sql.Int, dept.DepartmentID);
          getSubTasksReq.input('ProcessID', sql.Int, ProcessID);
          const subTasksResult = await getSubTasksReq.query(`
            SELECT TaskID, DaysRequired
            FROM tblTasks
            WHERE DepId = @DeptId AND proccessID = @ProcessID
            ORDER BY Priority ASC
          `);

          if (subTasksResult.recordset.length > 0) {
            let subDate = new Date(currentDate);

            for (const subTask of subTasksResult.recordset) {
              const subDateStr = subDate.toISOString().split('T')[0];

              let updateSubReq = transaction.request();
              updateSubReq.input('NewDate', sql.Date, subDateStr);
              updateSubReq.input('TaskID', sql.Int, subTask.TaskID);
              await updateSubReq.query(`
                UPDATE tblTasks
                SET PlannedDate = @NewDate
                WHERE TaskID = @TaskID
              `);

              subDate.setDate(subDate.getDate() + subTask.DaysRequired);
            }

            currentDate = new Date(subDate);
          }
        }
      }

      await transaction.commit();
      res.status(200).json({ success: true, message: 'Task updated and dates recalculated' });

    } catch (error) {
      await transaction.rollback();
      console.error('Transaction error:', error);
      res.status(500).json({ error: 'Failed to update task: ' + error.message });
    }

  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'Database connection failed' });
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
      packages: packages.recordset,
      isAdmin: req.session.user.usrAdmin,
      userId: req.session.user.id,
      desc_user: req.session.user.name
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

    // 4️⃣ Insert workflow header (same process can be used in multiple workflows independently)
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

    // 5️⃣ Get all ORIGINAL tasks for this process (not workflow copies)
    const tasks = await pool.request()
      .input('processID', sql.Int, processID)
      .query(`
        SELECT TaskID, TaskName, TaskPlanned, IsTaskSelected, PlannedDate, DepId, Priority, PredecessorID, DaysRequired, linkTasks, IsFixed
        FROM tblTasks
        WHERE proccessID = @processID AND WorkFlowHdrID IS NULL
      `);

    // 6️⃣ Insert new task copies with all properties and create workflow detail records
    if (tasks.recordset.length > 0) {
      for (const task of tasks.recordset) {
        // Insert new task copy with all properties
        const insertTaskResult = await pool.request()
          .input('taskName', sql.VarChar, task.TaskName)
          .input('taskPlanned', sql.VarChar, task.TaskPlanned)
          .input('isTaskSelected', sql.Int, task.IsTaskSelected || 0)
          .input('plannedDate', sql.DateTime2, task.PlannedDate)
          .input('depId', sql.Int, task.DepId)
          .input('priority', sql.Int, task.Priority)
          .input('predecessorID', sql.Int, task.PredecessorID)
          .input('daysRequired', sql.Int, task.DaysRequired)
          .input('linkTasks', sql.VarChar, task.linkTasks)
          .input('processID', sql.Int, processID)
          .input('workflowID', sql.Int, newWorkflowID)
          .input('isFixed', sql.Int, task.IsFixed || 1)
          .query(`
            INSERT INTO tblTasks (
              TaskName,
              TaskPlanned,
              IsTaskSelected,
              PlannedDate,
              DepId,
              Priority,
              PredecessorID,
              DaysRequired,
              linkTasks,
              proccessID,
              WorkFlowHdrID,
              IsFixed
            )
            OUTPUT INSERTED.TaskID
            VALUES (
              @taskName,
              @taskPlanned,
              @isTaskSelected,
              @plannedDate,
              @depId,
              @priority,
              @predecessorID,
              @daysRequired,
              @linkTasks,
              @processID,
              @workflowID,
              @isFixed
            )
          `);
        
        const newTaskID = insertTaskResult.recordset[0].TaskID;
        
        // Create workflow detail record for state tracking
        await pool.request()
          .input('workflowID', sql.Int, newWorkflowID)
          .input('taskID', sql.Int, newTaskID)
          .input('workflowName', sql.VarChar, task.TaskName)
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
            VALUES (
              @workflowID,
              @taskID,
              @workflowName,
              NULL,
              NULL,
              NULL,
              NULL,
              NULL
            )
          `);
      }
    }

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

// GET: Edit Process Page
app.get("/editProcess/:processId", isAdmin, async (req, res) => {
  const { processId } = req.params;

  try {
    // Fetch process details
    const processResult = await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        SELECT NumberOfProccessID, ProcessName, processDesc
        FROM tblProcess
        WHERE NumberOfProccessID = @processId
      `);

    if (processResult.recordset.length === 0) {
      req.flash("error", "Process not found.");
      return res.redirect("/");
    }

    const process = processResult.recordset[0];

    // Fetch current departments for this process
    const stepsResult = await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        SELECT pd.DepartmentID, pd.StepOrder, d.DeptName
        FROM tblProcessDepartment pd
        JOIN tblDepartments d ON pd.DepartmentID = d.DepartmentID
        WHERE pd.ProcessID = @processId
        ORDER BY pd.StepOrder
      `);

    const currentSteps = stepsResult.recordset;
    const currentDeptIds = currentSteps.map(step => step.DepartmentID);

    // Fetch all departments
    const departmentsResult = await pool.request().query(`
      SELECT DepartmentID, DeptName FROM tblDepartments
    `);

    // Fetch workflows associated with this process
    const workflowsResult = await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        SELECT 
          hdr.WorkFlowID,
          hdr.Status,
          hdr.createdDate,
          hdr.startDate,
          hdr.completionDate,
          prj.ProjectName,
          pk.PkgeName AS PackageName
        FROM tblWorkflowHdr hdr
        LEFT JOIN tblProject prj ON hdr.ProjectID = prj.ProjectID
        LEFT JOIN tblPackages pk ON hdr.PackageID = pk.PkgeID
        WHERE hdr.ProcessID = @processId
        ORDER BY hdr.createdDate DESC
      `);

    const associatedWorkflows = workflowsResult.recordset;
    const hasWorkflows = associatedWorkflows.length > 0;

    res.render("editprocess", {
      process,
      currentSteps,
      currentDeptIds,
      departments: departmentsResult.recordset,
      associatedWorkflows,
      hasWorkflows,
      isAdmin: req.session.user.usrAdmin,
      desc_user: req.session.user.name,
      errorMessage: req.flash("error"),
      successMessage: req.flash("success")
    });
  } catch (err) {
    console.error("Error loading edit process page:", err);
    req.flash("error", "Failed to load process details.");
    res.redirect("/");
  }
});

// POST: Update Process
app.post("/updateProcess/:processId", isAdmin, async (req, res) => {
  const { processId } = req.params;
  const { ProcessName, processDesc, Departments } = req.body;

  if (!ProcessName || !ProcessName.trim()) {
    req.flash("error", "Process name is required.");
    return res.redirect(`/editProcess/${processId}`);
  }

  const departmentIDs = Array.isArray(Departments)
    ? Departments.map(id => parseInt(id))
    : [parseInt(Departments)];

  if (departmentIDs.length === 0) {
    req.flash("error", "Please select at least one department.");
    return res.redirect(`/editProcess/${processId}`);
  }

  try {
    // Check if process exists
    const processCheck = await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        SELECT NumberOfProccessID FROM tblProcess
        WHERE NumberOfProccessID = @processId
      `);

    if (processCheck.recordset.length === 0) {
      req.flash("error", "Process not found.");
      return res.redirect("/");
    }

    // Update process basic info
    await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .input("ProcessName", sql.VarChar(100), ProcessName.trim())
      .input("processDesc", sql.VarChar(500), processDesc || null)
      .query(`
        UPDATE tblProcess
        SET ProcessName = @ProcessName,
            processDesc = @processDesc
        WHERE NumberOfProccessID = @processId
      `);

    // Delete existing department assignments
    await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        DELETE FROM tblProcessDepartment
        WHERE ProcessID = @processId
      `);

    // Delete all tasks associated with this process
    await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        DELETE FROM tblTasks
        WHERE proccessID = @processId
      `);

    // Add new department assignments
    let stepNumber = 1;
    for (const deptID of departmentIDs) {
      const IsActive = stepNumber === 1 ? 1 : 0;

      await pool.request()
        .input("ProcessID", sql.Int, parseInt(processId))
        .input("DepartmentID", sql.Int, deptID)
        .input("StepNumber", sql.Int, stepNumber)
        .input("IsActive", sql.Bit, IsActive)
        .query(`
          INSERT INTO tblProcessDepartment (ProcessID, DepartmentID, StepOrder, IsActive)
          VALUES (@ProcessID, @DepartmentID, @StepNumber, @IsActive)
        `);

      stepNumber++;
    }

    req.flash("success", "Process updated successfully.");
    res.redirect("/");
  } catch (err) {
    console.error("Error updating process:", err);
    req.flash("error", "Failed to update process.");
    res.redirect(`/editProcess/${processId}`);
  }
});

// DELETE: Delete Process
app.delete("/deleteProcess/:processId", isAdmin, async (req, res) => {
  const { processId } = req.params;

  try {
    // Check if process exists
    const processCheck = await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        SELECT NumberOfProccessID FROM tblProcess
        WHERE NumberOfProccessID = @processId
      `);

    if (processCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Process not found" });
    }

    // Check if process is being used in any workflows
    const workflowCheck = await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        SELECT COUNT(*) AS Count FROM tblProcessWorkflow
        WHERE processID = @processId
      `);

    if (workflowCheck.recordset[0].Count > 0) {
      return res.status(400).json({ error: "Cannot delete process that is used in workflows" });
    }

    // Delete process department assignments
    await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        DELETE FROM tblProcessDepartment
        WHERE ProcessID = @processId
      `);

    // Delete the process
    await pool.request()
      .input("processId", sql.Int, parseInt(processId))
      .query(`
        DELETE FROM tblProcess
        WHERE NumberOfProccessID = @processId
      `);

    res.json({ message: "Process deleted successfully" });
  } catch (err) {
    console.error("Error deleting process:", err);
    res.status(500).json({ error: "Failed to delete process" });
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
    return res.status(400).json({ error: "usrID, usrDesc, usrPWD, and DepartmentID are required." });
  }

  if (usrDesc.length > 40) return res.status(400).json({ error: "usrDesc exceeds 40 characters." });
  if (usrEmail && usrEmail.length > 50) return res.status(400).json({ error: "usrEmail exceeds 50 characters." });
  if (usrSignature && usrSignature.length > 100) return res.status(400).json({ error: "usrSignature exceeds 100 characters." });

  const insertDate = new Date();
  const lastUpdate = new Date();

  try {
    // Insert user with plain password (no hashing for now)
    await pool.request()
      .input("usrID", sql.VarChar(10), usrID)
      .input("usrDesc", sql.VarChar(40), usrDesc)
      .input("usrPWD", sql.VarChar(255), usrPWD)
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

    res.status(201).json({ success: true, message: "User added successfully." });
  } catch (err) {
    console.error("Error inserting user:", err);
    res.status(500).json({ error: "Failed to add user." });
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
//           IsFixed,
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
        // Check IsFixed and PlannedDate
        const check = await pool
          .request()
          .input('taskId', sql.Int, taskId)
          .query('SELECT IsFixed, PlannedDate FROM tblTasks WHERE TaskID = @taskId');

        const task = check.recordset[0];
        const isFixed = task?.IsFixed;
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

// PUT: Link Task to Another Task with Process Step Validation
app.put('/api/link-task/:taskId/:linkedTaskId', async (req, res) => {
  const { taskId, linkedTaskId } = req.params;
  const fromDeptId = req.body?.fromDeptId;

  try {
    // Validate both tasks exist and get their details
    const taskCheckQuery = await pool.request()
      .input('taskId', sql.Int, parseInt(taskId))
      .query(`
        SELECT t.TaskID, t.TaskName, t.DepId, t.proccessID
        FROM tblTasks t
        WHERE t.TaskID = @taskId
      `);

    const linkedTaskCheckQuery = await pool.request()
      .input('linkedTaskId', sql.Int, parseInt(linkedTaskId))
      .query(`
        SELECT t.TaskID, t.TaskName, t.DepId, t.proccessID
        FROM tblTasks t
        WHERE t.TaskID = @linkedTaskId
      `);

    if (taskCheckQuery.recordset.length === 0 || linkedTaskCheckQuery.recordset.length === 0) {
      return res.status(404).json({ error: 'One or both tasks not found' });
    }

    const sourceTask = taskCheckQuery.recordset[0];
    const targetTask = linkedTaskCheckQuery.recordset[0];

    // Prevent self-linking
    if (parseInt(taskId) === parseInt(linkedTaskId)) {
      return res.status(400).json({ error: 'Cannot link a task to itself' });
    }

    // Both tasks must be in the same process
    if (sourceTask.proccessID !== targetTask.proccessID) {
      return res.status(400).json({ error: 'Tasks must be from the same process' });
    }

    // Validate process step ordering - source task must be in an earlier step than target task
    const stepOrderQuery = await pool.request()
      .input('processId', sql.Int, sourceTask.proccessID)
      .input('sourceDeptId', sql.Int, sourceTask.DepId)
      .input('targetDeptId', sql.Int, targetTask.DepId)
      .query(`
        SELECT 
          (SELECT pd.StepOrder FROM tblProcessDepartment pd 
           WHERE pd.ProcessID = @processId AND pd.DepartmentID = @sourceDeptId) AS SourceStepOrder,
          (SELECT pd.StepOrder FROM tblProcessDepartment pd 
           WHERE pd.ProcessID = @processId AND pd.DepartmentID = @targetDeptId) AS TargetStepOrder
      `);

    const stepOrderResult = stepOrderQuery.recordset[0];
    
    // If either step order is NULL, departments are not part of this process
    if (stepOrderResult.SourceStepOrder === null || stepOrderResult.TargetStepOrder === null) {
      return res.status(400).json({ error: 'One or both tasks are not part of the process workflow' });
    }

    // Enforce forward-only linking: linked task (target) must be in an earlier step than current task (source)
    if (stepOrderResult.TargetStepOrder >= stepOrderResult.SourceStepOrder) {
      return res.status(400).json({ 
        error: `Cannot link to this task. Task '${sourceTask.TaskName}' (Step ${stepOrderResult.SourceStepOrder}) can only link to tasks in earlier process steps. Task '${targetTask.TaskName}' is in Step ${stepOrderResult.TargetStepOrder}.` 
      });
    }

    // Ensure no other task already links to the target (unique target)
    const existingLink = await pool.request()
      .input('linkedTaskId', sql.Int, parseInt(linkedTaskId))
      .query(`SELECT TaskID, TaskName FROM tblTasks WHERE linkTasks = @linkedTaskId`);

    if (existingLink.recordset.length > 0 && existingLink.recordset[0].TaskID !== sourceTask.TaskID) {
      return res.status(400).json({ 
        error: `This target task is already linked by another task. Remove that link first.`,
        linkedBy: existingLink.recordset[0]
      });
    }

    // Update the linkTasks column and set IsTaskLinked to 1
    await pool.request()
      .input('taskId', sql.Int, parseInt(taskId))
      .input('linkedTaskId', sql.Int, parseInt(linkedTaskId))
      .query(`
        UPDATE tblTasks
        SET linkTasks = @linkedTaskId, IsTaskLinked = 1
        WHERE TaskID = @taskId
      `);

    // Update the hasLinkedFrom column on the LINKED task (source/dependency)
    // hasLinkedFrom = the task that depends on this one (taskId)
    await pool.request()
      .input('taskId', sql.Int, parseInt(taskId))
      .input('linkedTaskId', sql.Int, parseInt(linkedTaskId))
      .query(`
        UPDATE tblTasks
        SET hasLinkedFrom = @taskId
        WHERE TaskID = @linkedTaskId
      `);

    // Get the linked task's PlannedDate and DaysRequired to calculate new date for the CURRENT task
    const linkedTaskDetailsQuery = await pool.request()
      .input('linkedTaskId', sql.Int, parseInt(linkedTaskId))
      .query(`
        SELECT PlannedDate, DaysRequired
        FROM tblTasks
        WHERE TaskID = @linkedTaskId
      `);

    const linkedTaskDetails = linkedTaskDetailsQuery.recordset[0];
    let newPlannedDate = null;

    if (linkedTaskDetails && linkedTaskDetails.PlannedDate) {
      const baseDate = new Date(linkedTaskDetails.PlannedDate);
      const daysToAdd = linkedTaskDetails.DaysRequired || 0;
      baseDate.setDate(baseDate.getDate() + daysToAdd);
      newPlannedDate = baseDate.toISOString().split('T')[0];

      // Update the current task's PlannedDate (taskId = Task 4), not the linked task (linkedTaskId = Task 1)
      await pool.request()
        .input('taskId', sql.Int, parseInt(taskId))
        .input('newPlannedDate', sql.Date, newPlannedDate)
        .query(`
          UPDATE tblTasks
          SET PlannedDate = @newPlannedDate
          WHERE TaskID = @taskId
        `);
    }

    res.json({ 
      success: true, 
      message: 'Tasks linked successfully',
      taskId: parseInt(taskId),
      linkedTaskId: parseInt(linkedTaskId),
      linkedTaskName: targetTask.TaskName,
      newPlannedDate: newPlannedDate
    });

  } catch (err) {
    console.error('Error linking tasks:', err);
    res.status(500).json({ error: 'Failed to link tasks' });
  }
});

    // PUT: Unlink a task (remove its linkTasks value)
    app.put('/api/unlink-task/:taskId', async (req, res) => {
      const taskId = req.params.taskId;
      try {
        // Get the linkedTaskId before unlinking
        const taskCheck = await pool.request()
          .input('taskId', sql.Int, parseInt(taskId))
          .query('SELECT TaskID, TaskName, DepId, proccessID, PredecessorID, DaysRequired, linkTasks FROM tblTasks WHERE TaskID = @taskId');

        if (taskCheck.recordset.length === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }

        const task = taskCheck.recordset[0];
        const linkedTaskId = task.linkTasks; // Get the task this one was linked to
        let newPlannedDate = null;

        // First, check if task has a predecessor
        if (task.PredecessorID) {
          const predecessorResult = await pool.request()
            .input('predecessorId', sql.Int, task.PredecessorID)
            .query(`
              SELECT PlannedDate, DaysRequired
              FROM tblTasks
              WHERE TaskID = @predecessorId
            `);

          if (predecessorResult.recordset.length > 0) {
            const predTask = predecessorResult.recordset[0];
            const predDate = new Date(predTask.PlannedDate);
            const predDays = predTask.DaysRequired || 0;
            predDate.setDate(predDate.getDate() + predDays);
            newPlannedDate = predDate.toISOString().split('T')[0];
          }
        }

        // If no predecessor, get the last task in the entire process
        if (!newPlannedDate) {
          const lastTaskResult = await pool.request()
            .input('ProcessID', sql.Int, task.proccessID)
            .input('currentTaskId', sql.Int, parseInt(taskId))
            .query(`
              SELECT TOP 1 PlannedDate, DaysRequired
              FROM tblTasks
              WHERE proccessID = @ProcessID 
                AND TaskID != @currentTaskId AND PlannedDate IS NOT NULL
              ORDER BY PlannedDate DESC
            `);

          if (lastTaskResult.recordset.length > 0) {
            const lastTask = lastTaskResult.recordset[0];
            const lastPlannedDate = new Date(lastTask.PlannedDate);
            const lastDaysRequired = lastTask.DaysRequired || 0;
            lastPlannedDate.setDate(lastPlannedDate.getDate() + lastDaysRequired);
            newPlannedDate = lastPlannedDate.toISOString().split('T')[0];
          } else {
            // If no other tasks, set to today + DaysRequired
            const today = new Date();
            today.setDate(today.getDate() + (task.DaysRequired || 3));
            newPlannedDate = today.toISOString().split('T')[0];
          }
        }

        // Remove the link and update PlannedDate, set IsTaskLinked to 0
        await pool.request()
          .input('taskId', sql.Int, parseInt(taskId))
          .input('newPlannedDate', sql.Date, newPlannedDate)
          .query(`
            UPDATE tblTasks
            SET linkTasks = NULL, PlannedDate = @newPlannedDate, IsTaskLinked = 0
            WHERE TaskID = @taskId
          `);

        // Clear hasLinkedFrom on the linked task
        if (linkedTaskId) {
          await pool.request()
            .input('linkedTaskId', sql.Int, linkedTaskId)
            .query(`
              UPDATE tblTasks
              SET hasLinkedFrom = NULL
              WHERE TaskID = @linkedTaskId
            `);
        }

        res.json({ 
          success: true, 
          message: 'Link removed', 
          taskId: parseInt(taskId),
          newPlannedDate: newPlannedDate
        });
      } catch (err) {
        console.error('Error unlinking task:', err);
        res.status(500).json({ error: 'Failed to remove link' });
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
  const { startTime, workFlowHdrId } = req.body;

  try {
    const sqlTransaction = await pool.transaction();
    await sqlTransaction.begin();

    // 1️⃣ Update the task start time ONLY for this specific workflow
    // Format the date as YYYY-MM-DD HH:MM:SS for SQL Server
    const startTimeFormatted = startTime.includes('-') 
      ? startTime + ' 00:00:00'  // If it's YYYY-MM-DD format, add time
      : startTime;  // Otherwise use as is
    
    const reqUpdate = sqlTransaction.request();
    await reqUpdate
      .input('taskId', taskId)
      .input('workFlowHdrId', sql.Int, workFlowHdrId)
      .input('startTime', sql.DateTime, startTimeFormatted)
      .query(`
        UPDATE tblWorkflowDtl
        SET TimeStarted = @startTime
        WHERE TaskID = @taskId 
          AND workFlowHdrId = @workFlowHdrId
          AND TimeStarted IS NULL
      `);

    // 2️⃣ Verify the workflow exists and get its WorkFlowHdrID
    const reqHdr = sqlTransaction.request();
    const hdrResult = await reqHdr
      .input('workFlowHdrId', sql.Int, workFlowHdrId)
      .query(`
        SELECT workFlowID
        FROM tblWorkflowHdr
        WHERE workFlowID = @workFlowHdrId
      `);

    if (!hdrResult.recordset.length) {
      await sqlTransaction.rollback();
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // 3️⃣ Check if startDate is NULL
    const reqStartDate = sqlTransaction.request();
    const startDateResult = await reqStartDate
      .input('workFlowHdrId', sql.Int, workFlowHdrId)
      .query(`
        SELECT startDate
        FROM tblWorkflowHdr
        WHERE workFlowID = @workFlowHdrId
      `);

    const startDate = startDateResult.recordset[0]?.startDate;

    if (!startDate) {
      // 4️⃣ If startDate is NULL, set it
      const reqUpdateHdr = sqlTransaction.request();
      await reqUpdateHdr
        .input('workFlowHdrId', sql.Int, workFlowHdrId)
        .query(`
          UPDATE tblWorkflowHdr
          SET startDate = GETDATE()
          WHERE workFlowID = @workFlowHdrId
        `);

      console.log('✅ startDate set on tblWorkflowHdr');
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

// Parse dates as local dates (not UTC)
const plannedDateOnly = new Date(PlannedDate);
plannedDateOnly.setHours(0, 0, 0, 0);

const finishedDateOnly = new Date(finishTime);
finishedDateOnly.setHours(0, 0, 0, 0);

// Calculate delay in days
const delayMs = finishedDateOnly.getTime() - plannedDateOnly.getTime();
const delay = Math.max(0, Math.ceil(delayMs / (1000 * 60 * 60 * 24)));

console.log('Planned:', plannedDateOnly, 'Finished:', finishedDateOnly, 'Delay:', delay);


    // Mark workflow detail as finished
    // Format the date as YYYY-MM-DD HH:MM:SS for SQL Server
    const finishTimeFormatted = finishTime.includes('-') 
      ? finishTime + ' 00:00:00'  // If it's YYYY-MM-DD format, add time
      : finishTime;  // Otherwise use as is
    
    await pool.request()
      .input('taskId', taskId)
      .input('finishTime', sql.DateTime, finishTimeFormatted)
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

    // 🔗 ACTIVATE TASKS THAT DEPEND ON THIS FINISHED TASK
    // Find any tasks that have linkTasks = finishedTaskId (tasks that depend on this task)
    const linkedTasksResult = await pool.request()
      .input('finishedTaskId', parseInt(taskId))
      .input('workFlowHdrId', workFlowHdrId)
      .query(`
        SELECT t.TaskID, t.DepId, t.PredecessorID, t.linkTasks
        FROM tblTasks t
        JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
        WHERE t.linkTasks = @finishedTaskId
          AND w.workFlowHdrId = @workFlowHdrId
      `);

    console.log('Finished Task ID:', taskId);
    console.log('Linked Tasks Found:', linkedTasksResult.recordset);

    // For each task that depends on this finished task, activate it immediately
    for (const linkedTask of linkedTasksResult.recordset) {
      console.log('Activating linked task:', linkedTask.TaskID);
      await pool.request()
        .input('linkedTaskId', linkedTask.TaskID)
        .query(`UPDATE tblTasks SET IsTaskSelected = 1 WHERE TaskID = @linkedTaskId`);
    }

    // 🚫 Check if THIS task is a linked task (has linkTasks value)
    const currentTaskCheck = await pool.request()
      .input('taskId', parseInt(taskId))
      .query(`SELECT linkTasks FROM tblTasks WHERE TaskID = @taskId`);
    
    const linkTaskId = currentTaskCheck.recordset[0]?.linkTasks;
    const currentTaskIsLinked = linkTaskId !== null && linkTaskId !== undefined;

    // If this task is linked, check if the task it depends on is finished
    let linkedDependencyFinished = true;
    if (currentTaskIsLinked) {
      const linkedDepCheck = await pool.request()
        .input('linkedTaskId', linkTaskId)
        .input('workFlowHdrId', workFlowHdrId)
        .query(`
          SELECT w.TimeFinished
          FROM tblTasks t
          JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
          WHERE t.TaskID = @linkedTaskId AND w.workFlowHdrId = @workFlowHdrId
        `);
      
      linkedDependencyFinished = linkedDepCheck.recordset.length > 0 && linkedDepCheck.recordset[0].TimeFinished !== null;
    }

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

    // Only auto-select next task if this task is NOT a linked task OR its linked dependency is finished
    if (!currentTaskIsLinked || linkedDependencyFinished) {
      // 🔗 Check if all predecessor departments are finished
      // Get current department's step order
      const currentDeptStepResult = await pool.request()
        .input('depId', DepId)
        .input('processID', processID)
        .query(`
          SELECT StepOrder
          FROM tblProcessDepartment
          WHERE DepartmentID = @depId AND ProcessID = @processID
        `);

      const currentStepOrder = currentDeptStepResult.recordset[0]?.StepOrder;
      let canAutoSelect = true;

      // If not the first step, check if all previous departments are finished
      if (currentStepOrder && currentStepOrder > 1) {
        const predecessorDeptResult = await pool.request()
          .input('processID', processID)
          .input('currentStep', currentStepOrder)
          .input('workFlowHdrId', workFlowHdrId)
          .query(`
            SELECT COUNT(*) AS UnfinishedCount
            FROM tblTasks t
            JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
            JOIN tblProcessDepartment pd ON t.DepId = pd.DepartmentID
            WHERE pd.ProcessID = @processID
              AND pd.StepOrder < @currentStep
              AND w.workFlowHdrId = @workFlowHdrId
              AND w.TimeFinished IS NULL
          `);

        canAutoSelect = predecessorDeptResult.recordset[0].UnfinishedCount === 0;
      }

      // Select the next task in this department and workflow ONLY if predecessors are done
      if (canAutoSelect) {
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
      }
    }

    if (remaining.recordset[0].Remaining === 0 && (!currentTaskIsLinked || linkedDependencyFinished)) {
      // All tasks in this department are finished AND this task's dependency is not blocking
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

        // Get the NEXT department
        const nextDeptInfoResult = await pool.request()
          .input('processId', ProcessID)
          .input('currentStep', StepOrder)
          .query(`
            SELECT DepartmentID
            FROM tblProcessDepartment
            WHERE ProcessID = @processId AND StepOrder = @currentStep + 1
          `);

        // If there's a next department, check its first task's linked dependency
        if (nextDeptInfoResult.recordset.length > 0) {
          const nextDepId = nextDeptInfoResult.recordset[0].DepartmentID;

          // Get the FIRST task in the next department
          const nextTaskResult = await pool.request()
            .input('nextDepId', nextDepId)
            .input('workFlowHdrId', workFlowHdrId)
            .query(`
              SELECT TOP 1 t.TaskID, t.linkTasks
              FROM tblTasks t
              JOIN tblWorkflowDtl w ON t.TaskID = w.TaskID
              WHERE t.DepId = @nextDepId
              AND w.workFlowHdrId = @workFlowHdrId
              ORDER BY t.Priority ASC, t.TaskID ASC
            `);

          // If the next task has a linked dependency, check if it's finished
          if (nextTaskResult.recordset.length > 0 && nextTaskResult.recordset[0].linkTasks) {
            const nextTaskId = nextTaskResult.recordset[0].TaskID;
            const linkedTaskId = nextTaskResult.recordset[0].linkTasks;
            
            // Check if the NEXT TASK ITSELF is finished, not just its linked dependency
            const nextTaskFinishedCheck = await pool.request()
              .input('nextTaskId', nextTaskId)
              .input('workFlowHdrId', workFlowHdrId)
              .query(`
                SELECT w.TimeFinished
                FROM tblWorkflowDtl w
                WHERE w.TaskID = @nextTaskId AND w.workFlowHdrId = @workFlowHdrId
              `);

            console.log('🔗 Checking next task:', nextTaskId, 'is finished:', nextTaskFinishedCheck.recordset[0]?.TimeFinished);

            // If the next task is NOT finished, don't proceed with department transition
            if (nextTaskFinishedCheck.recordset.length === 0 || nextTaskFinishedCheck.recordset[0].TimeFinished === null) {
              console.log('⛔ Blocking department transition - next task not finished yet');
              res.sendStatus(200);
              return;
            }
          }
        }

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
    for (const email of userEmails){
  const mailOptions = {
    from: '"Engineering Dashboard" <Nabilgreen500@gmail.com>', 
    to: email,                             
    subject: "New Process Activated for Your Department",
    text: `Hello,

Your department has been activated for the next step in the project workflow.

Regards,
Engineering Project Dashboard`,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent successfully: ${info.response}`);
}
} catch (err) {
  console.error(`❌ Email send error:`, err);
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
        SELECT PlannedDate, IsTaskSelected, IsFixed, Priority, PredecessorID
        FROM tblTasks WHERE TaskID = @taskIdA
      `);

    const taskB = await pool.request()
      .input('taskIdB', sql.Int, taskIdB)
      .query(`
        SELECT PlannedDate, IsTaskSelected, IsFixed, Priority, PredecessorID
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
      .input('IsFixed', sql.Bit, b.IsFixed)
      .input('Priority', sql.Int, b.Priority)
      .input('PredecessorID', sql.Int, b.PredecessorID)
      .query(`
        UPDATE tblTasks SET
          IsTaskSelected = @IsTaskSelected,
          IsFixed = @IsFixed,
          Priority = @Priority,
          PredecessorID = @PredecessorID
        WHERE TaskID = @taskIdA
      `);

    await pool.request()
      .input('taskIdB', sql.Int, taskIdB)
      .input('IsTaskSelected', sql.Bit, a.IsTaskSelected)
      .input('IsFixed', sql.Bit, a.IsFixed)
      .input('Priority', sql.Int, a.Priority)
      .input('PredecessorID', sql.Int, a.PredecessorID)
      .query(`
        UPDATE tblTasks SET
          IsTaskSelected = @IsTaskSelected,
          IsFixed = @IsFixed,
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
