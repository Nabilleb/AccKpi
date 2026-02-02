// =====================================================
// DATABASE QUERY HELPER FUNCTIONS
// Reduces code repetition and improves maintainability
// =====================================================

import sql from 'mssql';

/**
 * Execute a database query with error handling
 * @param {object} pool - Database connection pool
 * @param {string} query - SQL query string
 * @param {object} inputs - Named parameters for the query
 * @returns {Promise<array>} - Query result recordset
 */
export async function executeQuery(pool, query, inputs = {}) {
  try {
    const request = pool.request();
    
    // Add all inputs to the request
    Object.keys(inputs).forEach(key => {
      const value = inputs[key];
      const type = value.type;
      const val = value.value;
      request.input(key, type, val);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
}

/**
 * Get user by ID from database
 * @param {object} pool - Database connection pool
 * @param {string|number} userId - User ID
 * @returns {Promise<object>} - User object or null
 */
export async function getUserById(pool, userId) {
  try {
    const request = pool.request();
    request.input('userId', sql.NVarChar, userId);
    
    const result = await request.query(`
      SELECT usrID, usrDesc, DepartmentID, usrAdmin, IsSpecialUser, usrEmail
      FROM tblUsers 
      WHERE usrID = @userId
    `);
    
    return result.recordset[0] || null;
  } catch (err) {
    console.error('Error fetching user:', err);
    throw err;
  }
}

/**
 * Get department by ID from database
 * @param {object} pool - Database connection pool
 * @param {number} departmentId - Department ID
 * @returns {Promise<object>} - Department object or null
 */
export async function getDepartmentById(pool, departmentId) {
  try {
    const request = pool.request();
    request.input('departmentId', sql.Int, departmentId);
    
    const result = await request.query(`
      SELECT DepartmentID, DeptName, DeptEmail
      FROM tblDepartments 
      WHERE DepartmentID = @departmentId
    `);
    
    return result.recordset[0] || { DeptName: 'Unknown', DepartmentID: departmentId };
  } catch (err) {
    console.error('Error fetching department:', err);
    throw err;
  }
}

/**
 * Get workflow tasks by workflow ID
 * @param {object} pool - Database connection pool
 * @param {number} workflowId - Workflow Header ID
 * @returns {Promise<array>} - Array of task objects
 */
export async function getWorkflowTasks(pool, workflowId) {
  try {
    const request = pool.request();
    request.input('workflowId', sql.Int, workflowId);
    
    const result = await request.query(`
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
        pd.StepOrder,
        ISNULL(ws.stepNumber, 0) AS PaymentStep,
        (SELECT COUNT(*) FROM tblWorkflowSteps WHERE workFlowID = @workflowId) AS PaymentCount
      FROM tblWorkflowDtl d
      INNER JOIN tblTasks t ON d.TaskID = t.TaskID
      INNER JOIN tblWorkflowHdr hdr ON d.workFlowHdrId = hdr.WorkFlowID
      INNER JOIN tblProcess pr ON hdr.ProcessID = pr.NumberOfProccessID
      INNER JOIN tblProject pj ON hdr.ProjectID = pj.ProjectID
      INNER JOIN tblPackages pk ON pk.PkgeId = hdr.packageID
      INNER JOIN tblDepartments dp ON dp.DepartmentID = t.DepId
      INNER JOIN tblProcessDepartment pd ON pd.DepartmentID = t.DepId AND pd.ProcessID = pr.NumberOfProccessID
      LEFT JOIN tblWorkflowSteps ws ON ws.workFlowID = @workflowId AND ws.isActive = 1
      WHERE d.workFlowHdrId = @workflowId
      ORDER BY pd.StepOrder ASC, t.Priority ASC
    `);
    
    return result.recordset;
  } catch (err) {
    console.error('Error fetching workflow tasks:', err);
    throw err;
  }
}

/**
 * Get all packages
 * @param {object} pool - Database connection pool
 * @returns {Promise<array>} - Array of package objects
 */
export async function getAllPackages(pool) {
  try {
    const result = await pool.request().query(`
      SELECT PkgeID, PkgeName, Division, Trade, FilePath, insertDate
      FROM tblPackages
      ORDER BY PkgeName
    `);
    
    return result.recordset;
  } catch (err) {
    console.error('Error fetching packages:', err);
    throw err;
  }
}

/**
 * Get all processes
 * @param {object} pool - Database connection pool
 * @returns {Promise<array>} - Array of process objects
 */
export async function getAllProcesses(pool) {
  try {
    const result = await pool.request().query(`
      SELECT NumberOfProccessID, ProcessName, processDesc
      FROM tblProcess
      ORDER BY NumberOfProccessID
    `);
    
    return result.recordset;
  } catch (err) {
    console.error('Error fetching processes:', err);
    throw err;
  }
}

/**
 * Get all projects
 * @param {object} pool - Database connection pool
 * @returns {Promise<array>} - Array of project objects
 */
export async function getAllProjects(pool) {
  try {
    const result = await pool.request().query(`
      SELECT projectID, projectName
      FROM tblProject
      ORDER BY projectName
    `);
    
    return result.recordset;
  } catch (err) {
    console.error('Error fetching projects:', err);
    throw err;
  }
}

/**
 * Get all departments
 * @param {object} pool - Database connection pool
 * @returns {Promise<array>} - Array of department objects
 */
export async function getAllDepartments(pool) {
  try {
    const result = await pool.request().query(`
      SELECT DepartmentID, DeptName, DeptEmail
      FROM tblDepartments
      ORDER BY DeptName
    `);
    
    return result.recordset;
  } catch (err) {
    console.error('Error fetching departments:', err);
    throw err;
  }
}

/**
 * Get process departments with step order
 * @param {object} pool - Database connection pool
 * @param {number} processId - Process ID
 * @returns {Promise<array>} - Array of department objects with step info
 */
export async function getProcessDepartments(pool, processId) {
  try {
    const request = pool.request();
    request.input('processId', sql.Int, processId);
    
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
    
    return result.recordset;
  } catch (err) {
    console.error('Error fetching process departments:', err);
    throw err;
  }
}

/**
 * Build user object from session and database
 * @param {object} sessionUser - User from session
 * @param {object} department - Department object
 * @returns {object} - Complete user object
 */
export function buildUserObject(sessionUser, department) {
  return {
    id: sessionUser.id,
    name: sessionUser.name || 'User',
    usrAdmin: sessionUser.usrAdmin,
    DepartmentId: sessionUser.DepartmentId,
    DeptName: department.DeptName || 'Admin'
  };
}
