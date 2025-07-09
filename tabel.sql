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
(8, 5, 1, 2),
(10, 1, 1, 2),
(10, 2, 1, 1),
(10, 3, 1, 3),
(1009, 1, 1, 3),
(1009, 2, 1, 2),
(1009, 3, 0, 1),
(1010, 1, 1, 5),
(1010, 2, 1, 4),
(1010, 3, 1, 2),
(1010, 4, 1, 3),
(1010, 5, 1, 1),
(1011, 1, 0, 1),
(1013, 1, 1, 1),
(1013, 2, 1, 2),
(1014, 1, 1, 1),
(1014, 2, 1, 3),
(1014, 4, 1, 2),
(1015, 1, 1, 1),
(1015, 2, 1, 2),
(1016, 1, 1, 1),
(1016, 2, 1, 2),
(1017, 1, 1, 1),
(1017, 2, 0, 2);

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
INSERT INTO tblWorkflowHdr (workFlowID, processID, projectID, packageID, status, completionDate, activate)
VALUES
(1, 1, 1, 2, 'Completed', '2025-06-26 12:40:29.070', 1),
(1018, 10, 3, 6, 'Completed', '2025-07-03 12:47:02.307', 1),
(1019, 1009, 1, 3, 'Completed', '2025-07-04 11:27:25.357', 1),
(1020, 1010, 5, 5, 'Completed', '2025-07-05 11:26:44.330', 1),
(1021, 1013, 2, 5, 'Completed', '2025-07-07 14:35:12.540', 1),
(1022, 1014, 5, 3, 'Completed', '2025-07-07 14:35:01.573', 1),
(1023, 1015, 4, 3, 'Completed', '2025-07-07 14:35:58.887', 1),
(1024, 1016, 4, 3, 'Pending', NULL, 1),
(1025, 1017, 1, 3, 'Pending', NULL, 1);

-- Insert data into tblTasks
INSERT INTO tblTasks (TaskID, TaskName, TaskPlanned, IsTaskSelected, IsDateFixed, PlannedDate, DepId, Priority, PredecessorID, DaysRequired, linkTasks, WorkFlowHdrID)
VALUES
(133, 'test1', 'test1', 0, 1, '2025-07-02 00:00:00.000', 2, 1, NULL, 1, NULL, 1018),
(134, 'test 2', 'test2', 0, 0, '2025-07-06 00:00:00.000', 2, 2, 133, 2, NULL, 1018),
(135, 'test fin 1', 'test fin 1', 0, 0, NULL, 2, 1, NULL, 1, NULL, 1),
(136, 'test 3', 'test 3', 0, 0, '2025-07-06 00:00:00.000', 1, 1, NULL, 2, NULL, 1018),
(137, 'test 4', 'test4', 1, 0, '2025-07-07 00:00:00.000', 3, 1, NULL, 3, NULL, 1018),
(138, 'hr task1', 'hr task1', 0, 0, '2025-07-07 00:00:00.000', 3, 1, NULL, 1, NULL, 1019),
(139, 'hr task2', 'hr task2', 0, 0, '2025-07-07 00:00:00.000', 3, 2, 138, 3, NULL, 1019),
(140, 'fin task1', 'fin task1', 0, 0, '2025-07-07 00:00:00.000', 2, 1, NULL, 3, NULL, 1019),
(141, 'fin task2', 'fin task2', 0, 0, '2025-07-06 00:00:00.000', 2, 2, 140, 2, NULL, 1019),
(142, 'pro task1', 'pro task1', 0, 0, '2025-07-08 00:00:00.000', 1, 1, NULL, 4, NULL, 1019),
(143, 'pro task2', 'pro task2', 0, 0, '2025-07-08 00:00:00.000', 1, 2, 142, 4, NULL, 1019),
(144, 'logi task 1', 'logi task 1', 0, 0, '2025-07-08 00:00:00.000', 5, 1, NULL, 1, NULL, 1020),
(145, 'logi task 2', 'logi task 2', 0, 0, '2025-07-07 00:00:00.000', 5, 2, 144, 2, NULL, 1020),
(146, 'Hr test 1', 'test4', 0, 0, '2025-07-08 00:00:00.000', 3, 1, NULL, 3, NULL, 1020),
(147, 'hr test 2', 'hr test2', 0, 0, '2025-07-11 00:00:00.000', 3, 2, 146, 6, NULL, 1020),
(148, 'it test 1', 'it test 1', 0, 0, '2025-07-10 00:00:00.000', 4, 1, NULL, 5, NULL, 1020),
(149, 'it test 2', 'it test', 0, 1, '2025-07-09 00:00:00.000', 4, 2, 148, 4, NULL, 1020),
(150, 'money test 1', 'money test 1', 0, 0, '2025-07-08 00:00:00.000', 2, 1, NULL, 3, NULL, 1020),
(151, 'money test 2', 'money test 2', 0, 0, '2025-07-10 00:00:00.000', 2, 2, 150, 4, NULL, 1020),
(152, 'proc test 1', 'proc test 2', 0, 0, '2025-07-09 00:00:00.000', 1, 1, NULL, 3, NULL, 1020),
(153, 'proc test 2', 'proc test 2', 0, 0, '2025-07-11 00:00:00.000', 1, 2, 152, 5, NULL, 1020),
(154, 'isactive', 'isactive', 0, 0, '2025-07-06 00:00:00.000', 1, 1, NULL, 1, NULL, 1021),
(155, 'ex ex', 'ex ex', 0, 0, '2025-07-11 00:00:00.000', 1, 2, 154, 5, NULL, 1021),
(156, 'fin test', 'fin tet', 0, 0, '2025-07-12 00:00:00.000', 2, 1, NULL, 6, NULL, 1021),
(157, 'test ab 1', 'test ab', 0, 0, '2025-07-06 00:00:00.000', 1, 1, NULL, 2, NULL, 1022),
(158, 'test 2 ab', 'test 2 ab', 0, 0, '2025-07-09 00:00:00.000', 1, 2, 157, 3, NULL, 1022),
(159, 'fin 123', 'fin 123', 0, 0, '2025-07-10 00:00:00.000', 4, 1, NULL, 4, NULL, 1022),
(160, 'fin 45', 'fin 2', 0, 0, '2025-07-18 00:00:00.000', 2, 1, NULL, 10, NULL, 1022),
(161, 'in task 1', 'in task1', 0, 0, '2025-07-07 00:00:00.000', 1, 1, NULL, 1, NULL, 1023),
(162, 'add test', 'add test', 0, 0, '2025-07-08 00:00:00.000', 1, 2, 161, 1, NULL, 1023),
(163, 'fin fin', 'fin fin', 0, 0, '2025-07-12 00:00:00.000', 2, 1, NULL, 5, NULL, 1023),
(164, 'test 100', 'test 100', 0, 0, '2025-07-10 00:00:00.000', 1, 3, 162, 3, NULL, 1023),
(165, 'test 101', 'test 101', 0, 0, '2025-07-10 00:00:00.000', 1, 4, 164, 3, NULL, 1023),
(166, 'test 102', 'test 102', 0, 0, '2025-07-11 00:00:00.000', 2, 2, 163, 3, NULL, 1023),
(167, 'test 103', 'test 103', 0, 0, '2025-07-11 00:00:00.000', 2, 3, 166, 3, NULL, 1023),
(168, 'test 104', 'test 104', 0, 0, '2025-07-09 00:00:00.000', 2, 4, 167, 1, NULL, 1023),
(169, 'fill box', 'fill boc', 0, 0, '2025-07-10 00:00:00.000', 1, 5, 165, 3, NULL, 1023),
(170, 'fix 3', 'fix3', 0, 0, '2025-07-10 00:00:00.000', 2, 2, 156, 2, NULL, 1021),
(171, 'fix 4', 'fix4', 0, 0, '2025-07-10 00:00:00.000', 2, 3, 170, 2, NULL, 1021),
(172, 'fix 44', 'fix44', 0, 0, '2025-07-11 00:00:00.000', 2, 5, 168, 3, NULL, 1023),
(173, 'fin 46', 'fin 46', 0, 0, '2025-07-09 00:00:00.000', 2, 2, 160, 1, NULL, 1022),
(174, 'fin 47', 'fin 47', 0, 0, '2025-07-09 00:00:00.000', 2, 3, 173, 1, NULL, 1022),
(175, 'fin 48', 'fin 48', 0, 0, '2025-07-09 00:00:00.000', 2, 4, 174, 1, NULL, 1022),
(176, 'fin 49', 'fin 49', 0, 0, '2025-07-09 00:00:00.000', 2, 5, 175, 1, NULL, 1022),
(177, 'fix 100', 'fix 100', 0, 0, '2025-07-09 00:00:00.000', 4, 2, 159, 1, NULL, 1022),
(178, 'fix 1033', 'fix1033', 0, 0, '2025-07-10 00:00:00.000', 4, 3, 177, 2, NULL, 1022),
(179, 'fix 122', 'fix122', 0, 0, '2025-07-10 00:00:00.000', 4, 4, 178, 2, NULL, 1022),
(180, 'final fix', 'final fix', 0, 0, '2025-07-10 00:00:00.000', 4, 5, 179, 2, NULL, 1022),
(181, 'final test 1', 'final test 1', 0, 0, '2025-07-08 00:00:00.000', 1, 1, NULL, 3, NULL, 1024),
(182, 'final test 2', 'final test 1', 0, 0, '2025-07-10 00:00:00.000', 1, 2, 181, 2, NULL, 1024),
(183, 'final test 2', 'final test 2', 0, 0, '2025-07-09 00:00:00.000', 2, 1, NULL, 1, NULL, 1024),
(184, 'final test 3', 'final test 3', 1, 0, '2025-07-31 00:00:00.000', 2, 2, 183, 23, NULL, 1024),
(185, 'jh', 'hyg', 0, 0, NULL, 2, 3, 184, 65, NULL, 1024),
(186, 'bhbb', 'gvcfd', 0, 0, NULL, 2, 4, 185, 7, NULL, 1024),
(187, 'pro test', 'pro test', 0, 0, NULL, 2, 5, 186, 3, NULL, 1024);

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
INSERT INTO tblWorkflowDtl (workFlowHdrId, WorkflowDtlId, WorkflowName, TaskID, TimeStarted, TimeFinished, DelayReason, Delay, assignUser)
VALUES
(1, 82, 'test fin 1', 135, NULL, NULL, NULL, NULL, NULL),
(1018, 80, 'test1', 133, '2025-07-03 10:46:13.333', '2025-07-03 10:54:46.190', NULL, 2, NULL),
(1018, 81, 'test 2', 134, '2025-07-03 10:54:53.260', '2025-07-03 10:54:56.910', NULL, 0, NULL),
(1018, 83, 'test 3', 136, '2025-07-03 10:55:42.490', '2025-07-03 10:55:44.880', NULL, 0, NULL),
(1018, 84, 'test 4', 137, NULL, NULL, NULL, NULL, NULL),
(1019, 85, 'hr task1', 138, '2025-07-03 11:44:11.383', '2025-07-03 11:44:14.420', NULL, 0, NULL),
(1019, 86, 'hr task2', 139, '2025-07-03 11:44:19.903', '2025-07-03 11:44:24.680', NULL, 0, NULL),
(1019, 87, 'fin task1', 140, '2025-07-03 11:45:12.413', '2025-07-03 11:45:16.827', NULL, 0, NULL),
(1019, 88, 'fin task2', 141, '2025-07-03 11:45:23.367', '2025-07-03 11:45:29.630', NULL, 0, NULL),
(1019, 89, 'pro task1', 142, '2025-07-03 11:46:25.217', '2025-07-03 11:46:28.860', NULL, 0, NULL),
(1019, 90, 'pro task2', 143, '2025-07-03 11:47:45.087', '2025-07-03 11:47:49.400', NULL, 0, NULL),
(1020, 91, 'logi task 1', 144, '2025-07-04 14:36:53.827', '2025-07-04 14:36:56.207', NULL, 0, NULL),
(1020, 92, 'logi task 2', 145, '2025-07-04 14:37:07.387', '2025-07-04 14:37:10.660', NULL, 0, NULL),
(1020, 93, 'Hr test 1', 146, '2025-07-04 14:38:01.207', '2025-07-04 14:38:04.017', NULL, 0, NULL),
(1020, 94, 'hr test 2', 147, '2025-07-04 14:38:08.343', '2025-07-04 14:38:12.263', NULL, 0, NULL),
(1020, 95, 'it test 1', 148, '2025-07-04 14:39:43.697', '2025-07-04 14:39:46.143', NULL, 0, NULL),
(1020, 96, 'it test 2', 149, '2025-07-04 14:39:56.597', '2025-07-04 14:40:00.533', NULL, 0, NULL),
(1020, 97, 'money test 1', 150, '2025-07-05 08:04:42.457', '2025-07-05 08:04:45.577', NULL, 0, NULL),
(1020, 98, 'money test 2', 151, '2025-07-05 08:04:52.147', '2025-07-05 08:04:56.713', NULL, 0, NULL),
(1020, 99, 'proc test 1', 152, '2025-07-05 08:26:26.267', '2025-07-05 08:26:29.317', NULL, 0, NULL),
(1020, 100, 'proc test 2', 153, '2025-07-05 08:26:34.223', '2025-07-05 08:26:37.760', NULL, 0, NULL),
(1021, 101, 'isactive', 154, '2025-07-05 08:21:41.273', '2025-07-05 08:21:45.047', NULL, 0, NULL),
(1021, 102, 'ex ex', 155, '2025-07-05 08:24:54.883', '2025-07-05 08:25:48.117', NULL, 0, NULL),
(1021, 103, 'fin test', 156, '2025-07-07 10:00:20.327', '2025-07-07 11:11:01.733', NULL, 0, NULL),
(1021, 117, 'fix 3', 170, '2025-07-07 11:11:08.390', '2025-07-07 11:19:20.010', NULL, 0, NULL),
(1021, 118, 'fix 4', 171, '2025-07-07 11:35:07.907', '2025-07-07 11:35:10.333', NULL, 0, NULL),
(1022, 104, 'test ab 1', 157, '2025-07-05 11:52:06.637', '2025-07-05 11:52:13.907', NULL, 0, NULL),
(1022, 105, 'test 2 ab', 158, '2025-07-05 11:52:30.587', '2025-07-05 11:52:37.367', NULL, 0, NULL),
(1022, 106, 'fin 123', 159, '2025-07-07 10:24:51.567', '2025-07-07 10:25:00.163', NULL, 0, NULL),
(1022, 107, 'fin 45', 160, '2025-07-07 11:20:23.133', '2025-07-07 11:20:29.453', NULL, 0, NULL),
(1022, 120, 'fin 46', 173, '2025-07-07 11:20:33.150', '2025-07-07 11:20:38.657', NULL, 0, NULL),
(1022, 121, 'fin 47', 174, '2025-07-07 11:22:59.967', '2025-07-07 11:23:02.863', NULL, 0, NULL),
(1022, 122, 'fin 48', 175, '2025-07-07 11:23:06.777', '2025-07-07 11:23:38.093', NULL, 0, NULL),
(1022, 123, 'fin 49', 176, '2025-07-07 11:34:45.967', '2025-07-07 11:34:51.980', NULL, 0, NULL),
(1022, 124, 'fix 100', 177, '2025-07-07 10:25:03.080', '2025-07-07 10:25:05.820', NULL, 0, NULL),
(1022, 125, 'fix 1033', 178, '2025-07-07 10:25:09.470', '2025-07-07 10:25:13.407', NULL, 0, NULL),
(1022, 126, 'fix 122', 179, '2025-07-07 10:25:17.320', '2025-07-07 10:25:20.473', NULL, 0, NULL),
(1022, 127, 'final fix', 180, '2025-07-07 10:25:24.757', '2025-07-07 10:33:44.310', NULL, 0, NULL),
(1023, 108, 'in task 1', 161, '2025-07-06 14:32:05.057', '2025-07-06 14:32:07.370', NULL, 0, NULL),
(1023, 109, 'add test', 162, '2025-07-06 14:32:10.537', '2025-07-06 14:32:16.410', NULL, 0, NULL),
(1023, 110, 'fin fin', 163, '2025-07-07 11:35:18.780', '2025-07-07 11:35:28.503', NULL, 0, NULL),
(1023, 111, 'test 100', 164, '2025-07-06 14:32:20.060', '2025-07-06 14:32:25.263', NULL, 0, NULL),
(1023, 112, 'test 101', 165, '2025-07-06 14:32:31.493', '2025-07-06 14:32:35.067', NULL, 0, NULL),
(1023, 113, 'test 102', 166, '2025-07-07 11:35:32.590', '2025-07-07 11:35:35.710', NULL, 0, NULL),
(1023, 114, 'test 103', 167, '2025-07-07 11:35:38.650', '2025-07-07 11:35:41.397', NULL, 0, NULL),
(1023, 115, 'test 104', 168, '2025-07-07 11:35:44.363', '2025-07-07 11:35:48.487', NULL, 0, NULL),
(1023, 116, 'fill box', 169, '2025-07-06 14:32:38.897', '2025-07-06 14:32:44.177', NULL, 0, NULL),
(1023, 119, 'fix 44', 172, '2025-07-07 11:35:51.990', '2025-07-07 11:35:55.870', NULL, 0, NULL),
(1024, 128, 'final test 1', 181, '2025-07-07 12:50:25.983', '2025-07-07 12:50:32.047', NULL, 0, NULL),
(1024, 129, 'final test 2', 182, '2025-07-07 12:51:09.107', '2025-07-07 12:54:05.983', NULL, 0, NULL),
(1024, 130, 'final test 2', 183, '2025-07-07 13:27:31.673', '2025-07-07 13:29:00.310', NULL, 0, 'Finance Analyst'),
(1024, 131, 'final test 3', 184, NULL, NULL, NULL, NULL, NULL),
(1024, 132, 'jh', 185, NULL, NULL, NULL, NULL, NULL),
(1024, 133, 'bhbb', 186, NULL, NULL, NULL, NULL, NULL),
(1024, 134, 'pro test', 187, NULL, NULL, NULL, NULL, NULL);
