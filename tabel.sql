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
    UserSignature NVARCHAR(100),
    EmailSignature NVARCHAR(100),
    UserReadPolicy BIT,
    InsertDate DATETIME,
    FOREIGN KEY (DepartmentID) REFERENCES tblDepartments(DepartmentID)
);

-- tblWorkflow
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

-- Insert data into tblDepartments