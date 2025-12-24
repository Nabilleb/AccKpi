-- Delete Workflows, Tasks, and Processes to start fresh with test data
-- Order is important to respect foreign key constraints

USE [AccDBF]
GO

-- 1. Delete alerts (references tasks)
DELETE FROM [dbo].[tblAlerts]
GO

-- 2. Delete workflow details (references tasks)
DELETE FROM [dbo].[tblWorkflowDtl]
GO

-- 3. Delete tasks (references workflows and processes)
DELETE FROM [dbo].[tblTasks]
GO

-- 4. Delete workflow headers (references processes, projects, packages)
DELETE FROM [dbo].[tblWorkflowHdr]
GO

-- 5. Delete process-package-project mappings (references processes, packages, projects)
IF OBJECT_ID('[dbo].[tblProcessPackageProjectMap]', 'U') IS NOT NULL
BEGIN
    DELETE FROM [dbo].[tblProcessPackageProjectMap]
END
GO

-- 6. Delete process-department mappings (references processes and departments)
DELETE FROM [dbo].[tblProcessDepartment]
GO

-- 7. Delete processes
DELETE FROM [dbo].[tblProcess]
GO

-- Reset identity seeds if needed
DBCC CHECKIDENT ('[dbo].[tblAlerts]', RESEED, 0)
DBCC CHECKIDENT ('[dbo].[tblWorkflowDtl]', RESEED, 0)
DBCC CHECKIDENT ('[dbo].[tblTasks]', RESEED, 0)
DBCC CHECKIDENT ('[dbo].[tblWorkflowHdr]', RESEED, 0)
DBCC CHECKIDENT ('[dbo].[tblProcessPackageProjectMap]', RESEED, 0)
DBCC CHECKIDENT ('[dbo].[tblProcess]', RESEED, 0)
GO

PRINT 'All workflows, tasks, and processes have been deleted successfully!'
