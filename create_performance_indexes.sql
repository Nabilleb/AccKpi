-- =====================================================
-- PERFORMANCE OPTIMIZATION: CREATE INDEXES
-- Run this in SQL Server Management Studio
-- =====================================================

-- 1. Index for tblWorkflowDtl (main filter: workFlowHdrId)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblWorkflowDtl') 
    AND name = 'IX_WorkflowDtl_WorkFlowHdrId'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_WorkflowDtl_WorkFlowHdrId
    ON tblWorkflowDtl(workFlowHdrId)
    INCLUDE (TaskID, WorkflowDtlId, WorkflowName, TimeStarted, TimeFinished, DelayReason, Delay, assignUser);
    PRINT '✓ Created: IX_WorkflowDtl_WorkFlowHdrId';
END

-- 2. Index for tblTasks (JOIN and filter: TaskID, DepId, proccessID)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblTasks') 
    AND name = 'IX_Tasks_Composite'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Tasks_Composite
    ON tblTasks(TaskID, DepId, proccessID)
    INCLUDE (TaskName, TaskPlanned, IsTaskSelected, PlannedDate, Priority, PredecessorID, DaysRequired, IsFixed, WorkFlowHdrID, linkTasks);
    PRINT '✓ Created: IX_Tasks_Composite';
END

-- 3. Index for tblWorkflowHdr (JOIN: WorkFlowID, ProcessID, ProjectID, packageID)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblWorkflowHdr') 
    AND name = 'IX_WorkflowHdr_Composite'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_WorkflowHdr_Composite
    ON tblWorkflowHdr(WorkFlowID, ProcessID, ProjectID, packageID);
    PRINT '✓ Created: IX_WorkflowHdr_Composite';
END

-- 4. Index for tblDepartments (JOIN: DepartmentID)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblDepartments') 
    AND name = 'IX_Departments_DepartmentId'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Departments_DepartmentId
    ON tblDepartments(DepartmentID)
    INCLUDE (DeptName, DeptEmail);
    PRINT '✓ Created: IX_Departments_DepartmentId';
END

-- 5. Index for tblProcess (JOIN: NumberOfProccessID)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblProcess') 
    AND name = 'IX_Process_ProcessId'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Process_ProcessId
    ON tblProcess(NumberOfProccessID)
    INCLUDE (ProcessName, processDesc);
    PRINT '✓ Created: IX_Process_ProcessId';
END

-- 6. Index for tblPackages (JOIN: PkgeID, filter by PkgeName)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblPackages') 
    AND name = 'IX_Packages_PkgeId'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Packages_PkgeId
    ON tblPackages(PkgeID)
    INCLUDE (PkgeName, Division, Trade, FilePath, insertDate);
    PRINT '✓ Created: IX_Packages_PkgeId';
END

-- 7. Index for tblProcessDepartment (Composite JOIN: DepartmentID + ProcessID)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblProcessDepartment') 
    AND name = 'IX_ProcessDepartment_Composite'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_ProcessDepartment_Composite
    ON tblProcessDepartment(DepartmentID, ProcessID)
    INCLUDE (StepOrder, IsActive);
    PRINT '✓ Created: IX_ProcessDepartment_Composite';
END

-- 8. Index for tblUsers (WHERE usrID, usrEmail lookups)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblUsers') 
    AND name = 'IX_Users_UserId'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_UserId
    ON tblUsers(usrID)
    INCLUDE (usrDesc, usrEmail, DepartmentID, usrAdmin, IsSpecialUser);
    PRINT '✓ Created: IX_Users_UserId';
END

-- 9. Index for tblProject (JOIN: ProjectID)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblProject') 
    AND name = 'IX_Project_ProjectId'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Project_ProjectId
    ON tblProject(ProjectID)
    INCLUDE (ProjectName);
    PRINT '✓ Created: IX_Project_ProjectId';
END

-- 10. Index for tblSubPackage (JOIN: PkgeID)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE object_id = OBJECT_ID('tblSubPackage') 
    AND name = 'IX_SubPackage_PkgeId'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_SubPackage_PkgeId
    ON tblSubPackage(PkgeID)
    INCLUDE (ItemDescription, SupplierContractorName, SupplierContractorType, AwardValue, Currency, CreatedDate, UpdatedDate);
    PRINT '✓ Created: IX_SubPackage_PkgeId';
END

PRINT '';
PRINT '========================================';
PRINT 'INDEX CREATION COMPLETED!';
PRINT '========================================';
PRINT 'All performance indexes have been created.';
PRINT 'Your queries should now run significantly faster.';
PRINT '========================================';
