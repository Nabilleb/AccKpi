-- 
CREATE TABLE tblDepartments (
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
    DeptName NVARCHAR(100) NOT NULL,
    DeptEmail NVARCHAR(100)
);

CREATE TABLE tblPackages (
    PkgeID INT IDENTITY(1,1) PRIMARY KEY,
    PkgeName NVARCHAR(100) NOT NULL,
    Selected BIT,
    Duration INT,
    Division NVARCHAR(100),
    Standard BIT,
    Trade NVARCHAR(100),
    FilePath NVARCHAR(255),
    IsSynched BIT,
    insertDate DATETIME
);

CREATE TABLE tblProcess (
    NumberOfProccessID INT IDENTITY(1,1) PRIMARY KEY,
    ProcessName NVARCHAR(100) NOT NULL,
    ProcessDesc NVARCHAR(255)
);

-- 
CREATE TABLE tblProcessDepartment (
    ProcessID INT,
    DepartmentID INT,
    IsActive BIT,
    StepOrder INT,
    PRIMARY KEY (ProcessID, DepartmentID),
    FOREIGN KEY (ProcessID) REFERENCES tblProcess(ProcessID),
    FOREIGN KEY (DepartmentID) REFERENCES tblDepartments(DepartmentID)
);


CREATE TABLE tblProject (
    ProjectID INT IDENTITY(1,1) PRIMARY KEY,
    ProjectName NVARCHAR(100) NOT NULL
);


CREATE TABLE tblProcessWorkflow (
    ProcessID INT,
    ProjectID INT,
    PackageID INT,
    FOREIGN KEY (ProcessID) REFERENCES tblProcess(ProcessID),
    FOREIGN KEY (ProjectID) REFERENCES tblProject(ProjectID),
    FOREIGN KEY (PackageID) REFERENCES tblPackages(PkgeID)
);


CREATE TABLE tblTasks (
    TaskID INT IDENTITY(1,1) PRIMARY KEY,
    TaskName NVARCHAR(100) NOT NULL,
    TaskPlanned NVARCHAR(100),
    IsTaskSelected BIT,
    IsDateFixed BIT,
    PlannedDate DATETIME,
    DepId INT,
    Priority INT,
    PredecessorID INT,
    FOREIGN KEY (DepId) REFERENCES tblDepartments(DepartmentID)
);


CREATE TABLE tblUsers (
    UserID NVARCHAR(10) PRIMARY KEY,
    UserDesc NVARCHAR(100) NOT NULL,
    UserPWD NVARCHAR(100) NOT NULL,
    UserAdmin BIT,
    UserSTID INT,
    DepartmentID INT,
    AllowAccess BIT,
    Export INT,
    LastUpdate DATETIME,
    UsrEmail NVARCHAR(100),
    UsrSignature NVARCHAR(100),
    emailSignature NVARCHAR(100),
    usrReadPolicy BIT,
    insertDate DATETIME,
    FOREIGN KEY (DepartmentID) REFERENCES tblDepartments(DepartmentID)
);

CREATE TABLE tblWorkflow (
    WorkflowID INT IDENTITY(1,1) PRIMARY KEY,
    WorkflowName NVARCHAR(100) NOT NULL,
    TaskID INT,
    TimeStarted DATETIME,
    TimeFinished DATETIME,
    DelayReason NVARCHAR(255),
    Delay INT,
    FOREIGN KEY (TaskID) REFERENCES tblTasks(TaskID)
);

INSERT INTO tblDepartments (DeptName, DeptEmail)
VALUES 
('Procurement', 'procurement@example.com'),
('Finance', 'finance@example.com'),
('HR', 'hr@example.com'),
('IT', 'it@example.com'),
('Logistics', 'logistics@example.com'),
('Reports', 'reports@example.com');

INSERT INTO tblPackages (PkgeName, Selected, Duration, Division, Standard, Trade, FilePath, IsSynched, insertDate) VALUES 
('Package A', 1, 30, 'Division 1', 1, 'Trade 1', 'C:\Files\PackageA.pdf', 0, '2025-05-21 14:08:21.377'),
('Package B', 0, 45, 'Division 2', 0, 'Trade 2', 'C:\Files\PackageB.pdf', 1, '2025-05-21 14:08:21.377'),
('Package C', 1, 60, 'Division 1', 0, 'Trade 3', 'C:\Files\PackageC.pdf', 0, '2025-05-21 14:08:21.377'),
('Package D', 0, 15, 'Division 3', 1, 'Trade 1', 'C:\Files\PackageD.pdf', 1, '2025-05-21 14:08:21.377'),
('Package E', 1, 90, 'Division 2', 0, 'Trade 2', 'C:\Files\PackageE.pdf', 0, '2025-05-21 14:08:21.377'),
('ddfdd', 1, 60, 'engineering', 0, 'fff', NULL, 1, '2025-05-21 14:24:55.237');

-- Insert data into tblProcess
INSERT INTO tblProcess (ProcessName, ProcessDesc) VALUES 
('dddd', NULL),
('Procurement Process', NULL),
('Recruitment Process', NULL),
('Maintenance Process', 'Process for facility maintenance tasks'),
('Finance Approval Process', 'Process for financial approvals'),
('IT Support Process', 'Process for IT support tickets'),
('Onboarding Process', 'Process for employee onboarding'),
('RFQ', NULL);

-- Insert data into tblProcessDepartment
INSERT INTO tblProcessDepartment (ProcessID, DepartmentID, IsActive, StepOrder)
VALUES 
(1, 1, 1, 1),
(1, 2, 1, 2),
(1, 3, 1, 3),
(2, 2, 0, NULL),
(2, 3, 0, NULL),
(8, 4, 1, 1),
(8, 5, 1, 2);

-- Insert data into tblProject
INSERT INTO tblProject (ProjectName) VALUES 
('Construction of New Office'),
('Highway Expansion Project'),
('Hospital Renovation'),
('IT Infrastructure Upgrade'),
('Water Treatment Plant'),
('highWay'),
('highWay');

-- Insert data into tblProcessWorkflow
INSERT INTO tblWorkflowHdr ( processID, projectID, packageID, status, completionDate)
VALUES 
-- Existing completed records
( 1, 1, 2, 'pending', NULL),
( 8, 2, 3, 'pending', NULL);

-- Insert data into tblTasks
INSERT INTO tblTasks (TaskName, TaskPlanned, IsTaskSelected, IsDateFixed, PlannedDate, DepId, Priority, PredecessorID, DaysRequired, linkTasks)
VALUES 
('start Task D1', 'task desc D1', 0, 1, '2025-06-24 10:05:51.167', 1, 1, NULL, 1, NULL),
('Second Task D1', 'Des Task D2', 0, 1, NULL, 1, 2, NULL, 4, NULL),
('Initial Task D2', 'Des Task D2', 0, 1, NULL, 2, 1, NULL, 1, NULL),
('Initial Task D3', 'Intial Task D3', 0, 1, NULL, 3, 1, NULL, 1, NULL),
('Initial Task D4', 'RFQ process', 0, 1, '2025-06-27 00:00:00.000', 4, 1, NULL, 1, NULL),
('Second Task D4', 'RFQ IT', 0, 0, NULL, 4, 2, NULL, 3, NULL),
('Initial Task D5', 'RFQ logis', 0, 0, NULL, 5, 1, NULL, 2, NULL),
('Second Task D5', 'Test', 0, 0, NULL, 5, 2, NULL, 3, NULL);

-- Insert data into tblUsers
INSERT INTO tblUsers (UserID, UserDesc, UserPWD, UserAdmin, UserSTID, DepartmentID, AllowAccess, Export, LastUpdate, UserEmail, UserSignature, EmailSignature, UserReadPolicy, InsertDate) VALUES 
('E001', 'dwduhu', 'Pass123', 1, 2, 5, 1, -2, '2025-05-21 11:23:30.053', 'Nabilgreen500@gmail.com', 'ddd', 'ddd', 1, '2025-05-21 11:23:30.053'),
('U001', 'Admin User', 'admin123', 0, 1, 1, 1, 1, '2025-05-21 13:59:57.787', 'admin@company.com', 'A. User', 'Best regards, Admin', 1, '2025-05-21 13:59:57.787'),
('U002', 'Procurement Officer', 'proc123', 0, 1, 1, 1, 0, '2025-05-21 13:59:57.787', 'proc@company.com', 'P. Officer', 'Regards, Procurement', 1, '2025-05-21 13:59:57.787'),
('U003', 'Finance Analyst', 'fin123', 0, 1, 2, 1, 1, '2025-05-21 13:59:57.787', 'finance@company.com', 'F. Analyst', 'Sincerely, Finance', 1, '2025-05-21 13:59:57.787'),
('U004', 'HR Manager', 'hr123', 0, 1, 3, 1, 0, '2025-05-21 13:59:57.787', 'hr@company.com', 'H. Manager', 'Warm regards, HR', 1, '2025-05-21 13:59:57.787'),
('U005', 'IT Support', 'it123', 0, 1, 4, 1, 1, '2025-05-21 13:59:57.787', 'it@company.com', 'IT Team', 'Thanks, IT Dept.', 1, '2025-05-21 13:59:57.787'),
('U006', 'Logistics Coordinator', 'logi123', 0, 1, 5, 1, 0, '2025-05-21 13:59:57.787', 'logistics@company.com', 'L. Coordinator', 'Regards, Logistics', 1, '2025-05-21 13:59:57.787');

-- Insert data into tblWorkflow
INSERT INTO tblWorkflowDtl (workFlowHdrId, WorkflowDtlId, WorkflowName, TaskID, TimeStarted, TimeFinished, DelayReason, Delay)
VALUES
(1, 64, 'Initial Task D1', 1, NULL, NULL, NULL, NULL),
(1, 65, 'Second Task D1', 2, NULL, NULL, NULL, NULL),
(1, 66, 'Initial Task D2', 3, NULL, NULL, NULL, NULL),
(1, 67, 'Initial Task D3', 4, NULL, NULL, NULL, NULL),
(2, 68, 'Initial Task D4', 5, NULL, NULL, NULL, NULL),
(2, 69, 'Second Task D4', 6, NULL, NULL, NULL, NULL),
(2, 70, 'Initial Task D5', 7, NULL, NULL, NULL, NULL),
(2, 71, 'Second Task D5', 8, NULL, NULL, NULL, NULL);