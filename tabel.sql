USE [master]
GO
/****** Object:  Database [AccDBF]    Script Date: 7/9/2025 1:41:05 PM ******/
CREATE DATABASE [AccDBF]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'AccDBF', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\AccDBF.mdf' , SIZE = 73728KB , MAXSIZE = UNLIMITED, FILEGROWTH = 65536KB )
 LOG ON 
( NAME = N'AccDBF_log', FILENAME = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\AccDBF_log.ldf' , SIZE = 8192KB , MAXSIZE = 2048GB , FILEGROWTH = 65536KB )
 WITH CATALOG_COLLATION = DATABASE_DEFAULT, LEDGER = OFF
GO
ALTER DATABASE [AccDBF] SET COMPATIBILITY_LEVEL = 160
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [AccDBF].[dbo].[sp_fulltext_database] @action = 'enable'
end
GO
ALTER DATABASE [AccDBF] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [AccDBF] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [AccDBF] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [AccDBF] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [AccDBF] SET ARITHABORT OFF 
GO
ALTER DATABASE [AccDBF] SET AUTO_CLOSE ON 
GO
ALTER DATABASE [AccDBF] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [AccDBF] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [AccDBF] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [AccDBF] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [AccDBF] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [AccDBF] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [AccDBF] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [AccDBF] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [AccDBF] SET  DISABLE_BROKER 
GO
ALTER DATABASE [AccDBF] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [AccDBF] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [AccDBF] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [AccDBF] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [AccDBF] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [AccDBF] SET READ_COMMITTED_SNAPSHOT OFF 
GO
ALTER DATABASE [AccDBF] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [AccDBF] SET RECOVERY SIMPLE 
GO
ALTER DATABASE [AccDBF] SET  MULTI_USER 
GO
ALTER DATABASE [AccDBF] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [AccDBF] SET DB_CHAINING OFF 
GO
ALTER DATABASE [AccDBF] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [AccDBF] SET TARGET_RECOVERY_TIME = 60 SECONDS 
GO
ALTER DATABASE [AccDBF] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [AccDBF] SET ACCELERATED_DATABASE_RECOVERY = OFF  
GO
ALTER DATABASE [AccDBF] SET QUERY_STORE = ON
GO
ALTER DATABASE [AccDBF] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 1000, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO
USE [AccDBF]
GO
/****** Object:  Table [dbo].[tblAlerts]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblAlerts](
	[AlertID] [int] IDENTITY(1,1) NOT NULL,
	[Message] [text] NOT NULL,
	[FromDepartmentID] [int] NULL,
	[ToDepartmentID] [int] NULL,
	[TaskID] [int] NULL,
	[AlertDate] [datetime] NULL,
	[IsRead] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[AlertID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblDepartments]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblDepartments](
	[DepartmentID] [int] IDENTITY(1,1) NOT NULL,
	[DeptName] [varchar](100) NULL,
	[DeptEmail] [varchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[DepartmentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblPackages]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblPackages](
	[PkgeID] [int] IDENTITY(1,1) NOT NULL,
	[PkgeName] [nvarchar](150) NULL,
	[Selected] [bit] NULL,
	[Duration] [smallint] NULL,
	[Division] [varchar](200) NULL,
	[Standard] [bit] NULL,
	[Trade] [varchar](1000) NULL,
	[FilePath] [varchar](200) NULL,
	[IsSynched] [bit] NULL,
	[insertDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[PkgeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblProcess]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblProcess](
	[NumberOfProccessID] [int] IDENTITY(1,1) NOT NULL,
	[ProcessName] [varchar](100) NULL,
	[processDesc] [varchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[NumberOfProccessID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblProcessDepartment]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblProcessDepartment](
	[ProcessID] [int] NOT NULL,
	[DepartmentID] [int] NOT NULL,
	[IsActive] [bit] NULL,
	[StepOrder] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[ProcessID] ASC,
	[DepartmentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblProject]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblProject](
	[projectID] [int] IDENTITY(1,1) NOT NULL,
	[projectName] [varchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[projectID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblTasks]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblTasks](
	[TaskID] [int] IDENTITY(1,1) NOT NULL,
	[TaskName] [varchar](150) NULL,
	[TaskPlanned] [text] NULL,
	[IsTaskSelected] [bit] NULL,
	[IsDateFixed] [bit] NULL,
	[PlannedDate] [datetime] NULL,
	[DepId] [int] NULL,
	[Priority] [int] NULL,
	[PredecessorID] [int] NULL,
	[DaysRequired] [int] NULL,
	[linkTasks] [int] NULL,
	[WorkFlowHdrID] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[TaskID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblUsers]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblUsers](
	[usrID] [varchar](10) NOT NULL,
	[usrDesc] [varchar](40) NULL,
	[usrPWD] [varchar](255) NULL,
	[usrAdmin] [bit] NULL,
	[usrSTID] [smallint] NULL,
	[DepartmentID] [int] NOT NULL,
	[AllowAccess] [bit] NULL,
	[Export] [smallint] NULL,
	[LastUpdate] [datetime] NULL,
	[usrEmail] [varchar](50) NULL,
	[usrSignature] [varchar](100) NULL,
	[emailSignature] [text] NULL,
	[usrReadPolicy] [tinyint] NULL,
	[insertDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[usrID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblWorkflowDtl]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblWorkflowDtl](
	[workFlowHdrId] [int] NOT NULL,
	[WorkflowDtlId] [int] IDENTITY(1,1) NOT NULL,
	[WorkflowName] [varchar](100) NOT NULL,
	[TaskID] [int] NOT NULL,
	[TimeStarted] [datetime] NULL,
	[TimeFinished] [datetime] NULL,
	[DelayReason] [nvarchar](255) NULL,
	[Delay] [int] NULL,
	[assignUser] [varchar](50) NULL,
 CONSTRAINT [PK__tblWorkf__5704A64A83F3B600] PRIMARY KEY CLUSTERED 
(
	[workFlowHdrId] ASC,
	[WorkflowDtlId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblWorkflowHdr]    Script Date: 7/9/2025 1:41:05 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblWorkflowHdr](
	[workFlowID] [int] IDENTITY(1,1) NOT NULL,
	[processID] [int] NOT NULL,
	[projectID] [int] NOT NULL,
	[packageID] [int] NOT NULL,
	[status] [varchar](50) NULL,
	[completionDate] [datetime] NULL,
	[activate] [bit] NULL,
 CONSTRAINT [PK_tblProcessWorkflow] PRIMARY KEY CLUSTERED 
(
	[workFlowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET IDENTITY_INSERT [dbo].[tblDepartments] ON 

INSERT [dbo].[tblDepartments] ([DepartmentID], [DeptName], [DeptEmail]) VALUES (1, N'Procurement', N'procurement@example.com')
INSERT [dbo].[tblDepartments] ([DepartmentID], [DeptName], [DeptEmail]) VALUES (2, N'Finance', N'finance@example.com')
INSERT [dbo].[tblDepartments] ([DepartmentID], [DeptName], [DeptEmail]) VALUES (3, N'HR', N'hr@example.com')
INSERT [dbo].[tblDepartments] ([DepartmentID], [DeptName], [DeptEmail]) VALUES (4, N'IT', N'it@example.com')
INSERT [dbo].[tblDepartments] ([DepartmentID], [DeptName], [DeptEmail]) VALUES (5, N'Logistics', N'logistics@example.com')
INSERT [dbo].[tblDepartments] ([DepartmentID], [DeptName], [DeptEmail]) VALUES (6, N'Reports', N'reports@example.com')
SET IDENTITY_INSERT [dbo].[tblDepartments] OFF
GO
SET IDENTITY_INSERT [dbo].[tblPackages] ON 

INSERT [dbo].[tblPackages] ([PkgeID], [PkgeName], [Selected], [Duration], [Division], [Standard], [Trade], [FilePath], [IsSynched], [insertDate]) VALUES (2, N'Package A', 1, 30, N'Division 1', 1, N'Trade 1', N'C:\Files\PackageA.pdf', 0, CAST(N'2025-05-21T14:08:21.377' AS DateTime))
INSERT [dbo].[tblPackages] ([PkgeID], [PkgeName], [Selected], [Duration], [Division], [Standard], [Trade], [FilePath], [IsSynched], [insertDate]) VALUES (3, N'Package B', 0, 45, N'Division 2', 0, N'Trade 2', N'C:\Files\PackageB.pdf', 1, CAST(N'2025-05-21T14:08:21.377' AS DateTime))
INSERT [dbo].[tblPackages] ([PkgeID], [PkgeName], [Selected], [Duration], [Division], [Standard], [Trade], [FilePath], [IsSynched], [insertDate]) VALUES (4, N'Package C', 1, 60, N'Division 1', 0, N'Trade 3', N'C:\Files\PackageC.pdf', 0, CAST(N'2025-05-21T14:08:21.377' AS DateTime))
INSERT [dbo].[tblPackages] ([PkgeID], [PkgeName], [Selected], [Duration], [Division], [Standard], [Trade], [FilePath], [IsSynched], [insertDate]) VALUES (5, N'Package D', 0, 15, N'Division 3', 1, N'Trade 1', N'C:\Files\PackageD.pdf', 1, CAST(N'2025-05-21T14:08:21.377' AS DateTime))
INSERT [dbo].[tblPackages] ([PkgeID], [PkgeName], [Selected], [Duration], [Division], [Standard], [Trade], [FilePath], [IsSynched], [insertDate]) VALUES (6, N'Package E', 1, 90, N'Division 2', 0, N'Trade 2', N'C:\Files\PackageE.pdf', 0, CAST(N'2025-05-21T14:08:21.377' AS DateTime))
INSERT [dbo].[tblPackages] ([PkgeID], [PkgeName], [Selected], [Duration], [Division], [Standard], [Trade], [FilePath], [IsSynched], [insertDate]) VALUES (7, N'ddfdd', 1, 60, N'engineering', 0, N'fff', NULL, 1, CAST(N'2025-05-21T14:24:55.237' AS DateTime))
INSERT [dbo].[tblPackages] ([PkgeID], [PkgeName], [Selected], [Duration], [Division], [Standard], [Trade], [FilePath], [IsSynched], [insertDate]) VALUES (8, N'RFQ 2', 0, 70, N'engineering', 0, N'test test test', NULL, 1, CAST(N'2025-06-30T13:07:05.187' AS DateTime))
SET IDENTITY_INSERT [dbo].[tblPackages] OFF
GO
SET IDENTITY_INSERT [dbo].[tblProcess] ON 

INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1, N'dddd', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (2, N'Procurement Process', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (3, N'Recruitment Process', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (4, N'Maintenance Process', N'Process for facility maintenance tasks')
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (5, N'Finance Approval Process', N'Process for financial approvals')
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (6, N'IT Support Process', N'Process for IT support tickets')
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (7, N'Onboarding Process', N'Process for employee onboarding')
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (8, N'RFQ', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (9, N'RFQ test', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (10, N'RFQ test', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1009, N'RFQ TEST 2', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1010, N'RFQ test last', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1011, N'RFQ test acc', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1012, N'test is active ', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1013, N'test is active ', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1014, N'purchasse table', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1015, N'test process', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1016, N'final test process', NULL)
INSERT [dbo].[tblProcess] ([NumberOfProccessID], [ProcessName], [processDesc]) VALUES (1017, N'act test', NULL)
SET IDENTITY_INSERT [dbo].[tblProcess] OFF
GO
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1, 1, 1, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1, 2, 1, 2)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1, 3, 1, 3)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (2, 2, 0, NULL)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (2, 3, 0, NULL)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (8, 4, 1, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (8, 5, 1, 2)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (10, 1, 1, 2)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (10, 2, 1, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (10, 3, 1, 3)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1009, 1, 1, 3)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1009, 2, 1, 2)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1009, 3, 0, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1010, 1, 1, 5)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1010, 2, 1, 4)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1010, 3, 1, 2)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1010, 4, 1, 3)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1010, 5, 1, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1011, 1, 0, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1013, 1, 1, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1013, 2, 1, 2)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1014, 1, 1, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1014, 2, 1, 3)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1014, 4, 1, 2)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1015, 1, 1, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1015, 2, 1, 2)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1016, 1, 1, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1016, 2, 1, 2)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1017, 1, 1, 1)
INSERT [dbo].[tblProcessDepartment] ([ProcessID], [DepartmentID], [IsActive], [StepOrder]) VALUES (1017, 2, 0, 2)
GO
SET IDENTITY_INSERT [dbo].[tblProject] ON 

INSERT [dbo].[tblProject] ([projectID], [projectName]) VALUES (1, N'Construction of New Office')
INSERT [dbo].[tblProject] ([projectID], [projectName]) VALUES (2, N'Highway Expansion Project')
INSERT [dbo].[tblProject] ([projectID], [projectName]) VALUES (3, N'Hospital Renovation')
INSERT [dbo].[tblProject] ([projectID], [projectName]) VALUES (4, N'IT Infrastructure Upgrade')
INSERT [dbo].[tblProject] ([projectID], [projectName]) VALUES (5, N'Water Treatment Plant')
INSERT [dbo].[tblProject] ([projectID], [projectName]) VALUES (6, N'highWay')
INSERT [dbo].[tblProject] ([projectID], [projectName]) VALUES (7, N'highWay')
INSERT [dbo].[tblProject] ([projectID], [projectName]) VALUES (8, N'Acc company')
SET IDENTITY_INSERT [dbo].[tblProject] OFF
GO
SET IDENTITY_INSERT [dbo].[tblTasks] ON 

INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (133, N'test1', N'test1', 0, 1, CAST(N'2025-07-02T00:00:00.000' AS DateTime), 2, 1, NULL, 1, NULL, 1018)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (134, N'test 2', N'test2', 0, 0, CAST(N'2025-07-06T00:00:00.000' AS DateTime), 2, 2, 133, 2, NULL, 1018)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (135, N'test fin 1', N'test fin 1', 0, 0, NULL, 2, 1, NULL, 1, NULL, 1)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (136, N'test 3', N'test 3', 0, 0, CAST(N'2025-07-06T00:00:00.000' AS DateTime), 1, 1, NULL, 2, NULL, 1018)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (137, N'test 4', N'test4', 1, 0, CAST(N'2025-07-07T00:00:00.000' AS DateTime), 3, 1, NULL, 3, NULL, 1018)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (138, N'hr task1', N'hr task1', 0, 0, CAST(N'2025-07-07T00:00:00.000' AS DateTime), 3, 1, NULL, 1, NULL, 1019)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (139, N'hr task2', N'hr task2', 0, 0, CAST(N'2025-07-07T00:00:00.000' AS DateTime), 3, 2, 138, 3, NULL, 1019)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (140, N'fin task1', N'fin task1', 0, 0, CAST(N'2025-07-07T00:00:00.000' AS DateTime), 2, 1, NULL, 3, NULL, 1019)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (141, N'fin task2', N'fin task2', 0, 0, CAST(N'2025-07-06T00:00:00.000' AS DateTime), 2, 2, 140, 2, NULL, 1019)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (142, N'pro task1', N'pro task1', 0, 0, CAST(N'2025-07-08T00:00:00.000' AS DateTime), 1, 1, NULL, 4, NULL, 1019)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (143, N'pro task2', N'pro task2', 0, 0, CAST(N'2025-07-08T00:00:00.000' AS DateTime), 1, 2, 142, 4, NULL, 1019)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (144, N'logi task 1', N'logi task 1', 0, 0, CAST(N'2025-07-08T00:00:00.000' AS DateTime), 5, 1, NULL, 1, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (145, N'logi task 2', N'logi task 2', 0, 0, CAST(N'2025-07-07T00:00:00.000' AS DateTime), 5, 2, 144, 2, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (146, N'Hr test 1', N'test4', 0, 0, CAST(N'2025-07-08T00:00:00.000' AS DateTime), 3, 1, NULL, 3, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (147, N'hr test 2', N'hr test2', 0, 0, CAST(N'2025-07-11T00:00:00.000' AS DateTime), 3, 2, 146, 6, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (148, N'it test 1', N'it test 1', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 4, 1, NULL, 5, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (149, N'it test 2', N'it test', 0, 1, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 4, 2, 148, 4, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (150, N'money test 1', N'money test 1', 0, 0, CAST(N'2025-07-08T00:00:00.000' AS DateTime), 2, 1, NULL, 3, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (151, N'money test 2', N'money test 2', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 2, 2, 150, 4, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (152, N'proc test 1', N'proc test 2', 0, 0, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 1, 1, NULL, 3, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (153, N'proc test 2', N'proc test 2', 0, 0, CAST(N'2025-07-11T00:00:00.000' AS DateTime), 1, 2, 152, 5, NULL, 1020)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (154, N'isactive', N'isactive', 0, 0, CAST(N'2025-07-06T00:00:00.000' AS DateTime), 1, 1, NULL, 1, NULL, 1021)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (155, N'ex ex', N'ex ex', 0, 0, CAST(N'2025-07-11T00:00:00.000' AS DateTime), 1, 2, 154, 5, NULL, 1021)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (156, N'fin test', N'fin tet', 0, 0, CAST(N'2025-07-12T00:00:00.000' AS DateTime), 2, 1, NULL, 6, NULL, 1021)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (157, N'test ab 1', N'test ab', 0, 0, CAST(N'2025-07-06T00:00:00.000' AS DateTime), 1, 1, NULL, 2, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (158, N'test 2 ab', N' test 2 ab', 0, 0, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 1, 2, 157, 3, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (159, N'fin 123', N'fin 123', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 4, 1, NULL, 4, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (160, N'fin 45', N'fin 2', 0, 0, CAST(N'2025-07-18T00:00:00.000' AS DateTime), 2, 1, NULL, 10, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (161, N'in task 1', N'in task1', 0, 0, CAST(N'2025-07-07T00:00:00.000' AS DateTime), 1, 1, NULL, 1, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (162, N'add test', N'add test', 0, 0, CAST(N'2025-07-08T00:00:00.000' AS DateTime), 1, 2, 161, 1, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (163, N'fin fin', N'fin fin', 0, 0, CAST(N'2025-07-12T00:00:00.000' AS DateTime), 2, 1, NULL, 5, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (164, N'test 100', N'test 100', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 1, 3, 162, 3, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (165, N'test 101', N'test 101', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 1, 4, 164, 3, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (166, N'test 102', N'test 102', 0, 0, CAST(N'2025-07-11T00:00:00.000' AS DateTime), 2, 2, 163, 3, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (167, N'test 103', N'test 103', 0, 0, CAST(N'2025-07-11T00:00:00.000' AS DateTime), 2, 3, 166, 3, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (168, N'test 104', N'test 104', 0, 0, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 2, 4, 167, 1, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (169, N'fill box', N'fill boc', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 1, 5, 165, 3, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (170, N'fix 3', N'fix3', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 2, 2, 156, 2, NULL, 1021)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (171, N'fix 4', N'fix4', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 2, 3, 170, 2, NULL, 1021)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (172, N'fix 44', N'fix44', 0, 0, CAST(N'2025-07-11T00:00:00.000' AS DateTime), 2, 5, 168, 3, NULL, 1023)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (173, N'fin 46', N'fin 46', 0, 0, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 2, 2, 160, 1, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (174, N'fin 47', N'fin 47', 0, 0, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 2, 3, 173, 1, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (175, N'fin 48', N'fin 48', 0, 0, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 2, 4, 174, 1, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (176, N'fin 49', N'fin 49', 0, 0, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 2, 5, 175, 1, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (177, N'fix 100', N'fix 100', 0, 0, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 4, 2, 159, 1, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (178, N'fix 1033', N'fix1033', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 4, 3, 177, 2, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (179, N'fix 122', N'fix122', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 4, 4, 178, 2, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (180, N'final fix', N'final fix ', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 4, 5, 179, 2, NULL, 1022)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (181, N'final test 1', N'final test 1', 0, 0, CAST(N'2025-07-08T00:00:00.000' AS DateTime), 1, 1, NULL, 3, NULL, 1024)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (182, N'final test 2', N'final test 1', 0, 0, CAST(N'2025-07-10T00:00:00.000' AS DateTime), 1, 2, 181, 2, NULL, 1024)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (183, N'final test 2	', N'final test 2', 0, 0, CAST(N'2025-07-09T00:00:00.000' AS DateTime), 2, 1, NULL, 1, NULL, 1024)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (184, N'final test 3', N'final test 3', 1, 0, CAST(N'2025-07-31T00:00:00.000' AS DateTime), 2, 2, 183, 23, NULL, 1024)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (185, N'jh', N'hyg', 0, 0, NULL, 2, 3, 184, 65, NULL, 1024)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (186, N'bhbb', N'gvcfd', 0, 0, NULL, 2, 4, 185, 7, NULL, 1024)
INSERT [dbo].[tblTasks] ([TaskID], [TaskName], [TaskPlanned], [IsTaskSelected], [IsDateFixed], [PlannedDate], [DepId], [Priority], [PredecessorID], [DaysRequired], [linkTasks], [WorkFlowHdrID]) VALUES (187, N'pro test', N'pro test', 0, 0, NULL, 2, 5, 186, 3, NULL, 1024)
SET IDENTITY_INSERT [dbo].[tblTasks] OFF
GO
INSERT [dbo].[tblUsers] ([usrID], [usrDesc], [usrPWD], [usrAdmin], [usrSTID], [DepartmentID], [AllowAccess], [Export], [LastUpdate], [usrEmail], [usrSignature], [emailSignature], [usrReadPolicy], [insertDate]) VALUES (N'E001', N'dwduhu', N'Pass123', 1, 2, 5, 1, -2, CAST(N'2025-05-21T11:23:30.053' AS DateTime), N'Nabilgreen500@gmail.com', N'ddd', N'ddd', 1, CAST(N'2025-05-21T11:23:30.053' AS DateTime))
INSERT [dbo].[tblUsers] ([usrID], [usrDesc], [usrPWD], [usrAdmin], [usrSTID], [DepartmentID], [AllowAccess], [Export], [LastUpdate], [usrEmail], [usrSignature], [emailSignature], [usrReadPolicy], [insertDate]) VALUES (N'Pro003', N'adam alakhdar', N'adam123', 0, 4, 1, 0, 2, CAST(N'2025-06-30T10:08:49.920' AS DateTime), N'adam@comppany.com', N'best regards', N'hello mr ', 22, CAST(N'2025-06-30T10:08:49.920' AS DateTime))
INSERT [dbo].[tblUsers] ([usrID], [usrDesc], [usrPWD], [usrAdmin], [usrSTID], [DepartmentID], [AllowAccess], [Export], [LastUpdate], [usrEmail], [usrSignature], [emailSignature], [usrReadPolicy], [insertDate]) VALUES (N'U001', N'Admin User', N'admin123', 0, 1, 1, 1, 1, CAST(N'2025-05-21T13:59:57.787' AS DateTime), N'admin@company.com', N'A. User', N'Best regards, Admin', 1, CAST(N'2025-05-21T13:59:57.787' AS DateTime))
INSERT [dbo].[tblUsers] ([usrID], [usrDesc], [usrPWD], [usrAdmin], [usrSTID], [DepartmentID], [AllowAccess], [Export], [LastUpdate], [usrEmail], [usrSignature], [emailSignature], [usrReadPolicy], [insertDate]) VALUES (N'U002', N'Procurement Officer', N'proc123', 0, 1, 1, 1, 0, CAST(N'2025-05-21T13:59:57.787' AS DateTime), N'proc@company.com', N'P. Officer', N'Regards, Procurement', 1, CAST(N'2025-05-21T13:59:57.787' AS DateTime))
INSERT [dbo].[tblUsers] ([usrID], [usrDesc], [usrPWD], [usrAdmin], [usrSTID], [DepartmentID], [AllowAccess], [Export], [LastUpdate], [usrEmail], [usrSignature], [emailSignature], [usrReadPolicy], [insertDate]) VALUES (N'U003', N'Finance Analyst', N'fin123', 0, 1, 2, 1, 1, CAST(N'2025-05-21T13:59:57.787' AS DateTime), N'finance@company.com', N'F. Analyst', N'Sincerely, Finance', 1, CAST(N'2025-05-21T13:59:57.787' AS DateTime))
INSERT [dbo].[tblUsers] ([usrID], [usrDesc], [usrPWD], [usrAdmin], [usrSTID], [DepartmentID], [AllowAccess], [Export], [LastUpdate], [usrEmail], [usrSignature], [emailSignature], [usrReadPolicy], [insertDate]) VALUES (N'U004', N'HR Manager', N'hr123', 0, 1, 3, 1, 0, CAST(N'2025-05-21T13:59:57.787' AS DateTime), N'hr@company.com', N'H. Manager', N'Warm regards, HR', 1, CAST(N'2025-05-21T13:59:57.787' AS DateTime))
INSERT [dbo].[tblUsers] ([usrID], [usrDesc], [usrPWD], [usrAdmin], [usrSTID], [DepartmentID], [AllowAccess], [Export], [LastUpdate], [usrEmail], [usrSignature], [emailSignature], [usrReadPolicy], [insertDate]) VALUES (N'U005', N'IT Support', N'it123', 0, 1, 4, 1, 1, CAST(N'2025-05-21T13:59:57.787' AS DateTime), N'it@company.com', N'IT Team', N'Thanks, IT Dept.', 1, CAST(N'2025-05-21T13:59:57.787' AS DateTime))
INSERT [dbo].[tblUsers] ([usrID], [usrDesc], [usrPWD], [usrAdmin], [usrSTID], [DepartmentID], [AllowAccess], [Export], [LastUpdate], [usrEmail], [usrSignature], [emailSignature], [usrReadPolicy], [insertDate]) VALUES (N'U006', N'Logistics Coordinator', N'logi123', 0, 1, 5, 1, 0, CAST(N'2025-05-21T13:59:57.787' AS DateTime), N'logistics@company.com', N'L. Coordinator', N'Regards, Logistics', 1, CAST(N'2025-05-21T13:59:57.787' AS DateTime))
GO
SET IDENTITY_INSERT [dbo].[tblWorkflowDtl] ON 

INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1, 82, N'test fin 1', 135, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1018, 80, N'test1', 133, CAST(N'2025-07-03T10:46:13.333' AS DateTime), CAST(N'2025-07-03T10:54:46.190' AS DateTime), NULL, 2, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1018, 81, N'test 2', 134, CAST(N'2025-07-03T10:54:53.260' AS DateTime), CAST(N'2025-07-03T10:54:56.910' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1018, 83, N'test 3', 136, CAST(N'2025-07-03T10:55:42.490' AS DateTime), CAST(N'2025-07-03T10:55:44.880' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1018, 84, N'test 4', 137, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1019, 85, N'hr task1', 138, CAST(N'2025-07-03T11:44:11.383' AS DateTime), CAST(N'2025-07-03T11:44:14.420' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1019, 86, N'hr task2', 139, CAST(N'2025-07-03T11:44:19.903' AS DateTime), CAST(N'2025-07-03T11:44:24.680' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1019, 87, N'fin task1', 140, CAST(N'2025-07-03T11:45:12.413' AS DateTime), CAST(N'2025-07-03T11:45:16.827' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1019, 88, N'fin task2', 141, CAST(N'2025-07-03T11:45:23.367' AS DateTime), CAST(N'2025-07-03T11:45:29.630' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1019, 89, N'pro task1', 142, CAST(N'2025-07-03T11:46:25.217' AS DateTime), CAST(N'2025-07-03T11:46:28.860' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1019, 90, N'pro task2', 143, CAST(N'2025-07-03T11:47:45.087' AS DateTime), CAST(N'2025-07-03T11:47:49.400' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 91, N'logi task 1', 144, CAST(N'2025-07-04T14:36:53.827' AS DateTime), CAST(N'2025-07-04T14:36:56.207' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 92, N'logi task 2', 145, CAST(N'2025-07-04T14:37:07.387' AS DateTime), CAST(N'2025-07-04T14:37:10.660' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 93, N'Hr test 1', 146, CAST(N'2025-07-04T14:38:01.207' AS DateTime), CAST(N'2025-07-04T14:38:04.017' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 94, N'hr test 2', 147, CAST(N'2025-07-04T14:38:08.343' AS DateTime), CAST(N'2025-07-04T14:38:12.263' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 95, N'it test 1', 148, CAST(N'2025-07-04T14:39:43.697' AS DateTime), CAST(N'2025-07-04T14:39:46.143' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 96, N'it test 2', 149, CAST(N'2025-07-04T14:39:56.597' AS DateTime), CAST(N'2025-07-04T14:40:00.533' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 97, N'money test 1', 150, CAST(N'2025-07-05T08:04:42.457' AS DateTime), CAST(N'2025-07-05T08:04:45.577' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 98, N'money test 2', 151, CAST(N'2025-07-05T08:04:52.147' AS DateTime), CAST(N'2025-07-05T08:04:56.713' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 99, N'proc test 1', 152, CAST(N'2025-07-05T08:26:26.267' AS DateTime), CAST(N'2025-07-05T08:26:29.317' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1020, 100, N'proc test 2', 153, CAST(N'2025-07-05T08:26:34.223' AS DateTime), CAST(N'2025-07-05T08:26:37.760' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1021, 101, N'isactive', 154, CAST(N'2025-07-05T08:21:41.273' AS DateTime), CAST(N'2025-07-05T08:21:45.047' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1021, 102, N'ex ex', 155, CAST(N'2025-07-05T08:24:54.883' AS DateTime), CAST(N'2025-07-05T08:25:48.117' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1021, 103, N'fin test', 156, CAST(N'2025-07-07T10:00:20.327' AS DateTime), CAST(N'2025-07-07T11:11:01.733' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1021, 117, N'fix 3', 170, CAST(N'2025-07-07T11:11:08.390' AS DateTime), CAST(N'2025-07-07T11:19:20.010' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1021, 118, N'fix 4', 171, CAST(N'2025-07-07T11:35:07.907' AS DateTime), CAST(N'2025-07-07T11:35:10.333' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 104, N'test ab 1', 157, CAST(N'2025-07-05T11:52:06.637' AS DateTime), CAST(N'2025-07-05T11:52:13.907' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 105, N'test 2 ab', 158, CAST(N'2025-07-05T11:52:30.587' AS DateTime), CAST(N'2025-07-05T11:52:37.367' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 106, N'fin 123', 159, CAST(N'2025-07-07T10:24:51.567' AS DateTime), CAST(N'2025-07-07T10:25:00.163' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 107, N'fin 45', 160, CAST(N'2025-07-07T11:20:23.133' AS DateTime), CAST(N'2025-07-07T11:20:29.453' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 120, N'fin 46', 173, CAST(N'2025-07-07T11:20:33.150' AS DateTime), CAST(N'2025-07-07T11:20:38.657' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 121, N'fin 47', 174, CAST(N'2025-07-07T11:22:59.967' AS DateTime), CAST(N'2025-07-07T11:23:02.863' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 122, N'fin 48', 175, CAST(N'2025-07-07T11:23:06.777' AS DateTime), CAST(N'2025-07-07T11:23:38.093' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 123, N'fin 49', 176, CAST(N'2025-07-07T11:34:45.967' AS DateTime), CAST(N'2025-07-07T11:34:51.980' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 124, N'fix 100', 177, CAST(N'2025-07-07T10:25:03.080' AS DateTime), CAST(N'2025-07-07T10:25:05.820' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 125, N'fix 1033', 178, CAST(N'2025-07-07T10:25:09.470' AS DateTime), CAST(N'2025-07-07T10:25:13.407' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 126, N'fix 122', 179, CAST(N'2025-07-07T10:25:17.320' AS DateTime), CAST(N'2025-07-07T10:25:20.473' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1022, 127, N'final fix', 180, CAST(N'2025-07-07T10:25:24.757' AS DateTime), CAST(N'2025-07-07T10:33:44.310' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 108, N'in task 1', 161, CAST(N'2025-07-06T14:32:05.057' AS DateTime), CAST(N'2025-07-06T14:32:07.370' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 109, N'add test', 162, CAST(N'2025-07-06T14:32:10.537' AS DateTime), CAST(N'2025-07-06T14:32:16.410' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 110, N'fin fin', 163, CAST(N'2025-07-07T11:35:18.780' AS DateTime), CAST(N'2025-07-07T11:35:28.503' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 111, N'test 100', 164, CAST(N'2025-07-06T14:32:20.060' AS DateTime), CAST(N'2025-07-06T14:32:25.263' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 112, N'test 101', 165, CAST(N'2025-07-06T14:32:31.493' AS DateTime), CAST(N'2025-07-06T14:32:35.067' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 113, N'test 102', 166, CAST(N'2025-07-07T11:35:32.590' AS DateTime), CAST(N'2025-07-07T11:35:35.710' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 114, N'test 103', 167, CAST(N'2025-07-07T11:35:38.650' AS DateTime), CAST(N'2025-07-07T11:35:41.397' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 115, N'test 104', 168, CAST(N'2025-07-07T11:35:44.363' AS DateTime), CAST(N'2025-07-07T11:35:48.487' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 116, N'fill box', 169, CAST(N'2025-07-06T14:32:38.897' AS DateTime), CAST(N'2025-07-06T14:32:44.177' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1023, 119, N'fix 44', 172, CAST(N'2025-07-07T11:35:51.990' AS DateTime), CAST(N'2025-07-07T11:35:55.870' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1024, 128, N'final test 1', 181, CAST(N'2025-07-07T12:50:25.983' AS DateTime), CAST(N'2025-07-07T12:50:32.047' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1024, 129, N'final test 2', 182, CAST(N'2025-07-07T12:51:09.107' AS DateTime), CAST(N'2025-07-07T12:54:05.983' AS DateTime), NULL, 0, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1024, 130, N'final test 2	', 183, CAST(N'2025-07-07T13:27:31.673' AS DateTime), CAST(N'2025-07-07T13:29:00.310' AS DateTime), NULL, 0, N'Finance Analyst')
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1024, 131, N'final test 3', 184, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1024, 132, N'jh', 185, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1024, 133, N'bhbb', 186, NULL, NULL, NULL, NULL, NULL)
INSERT [dbo].[tblWorkflowDtl] ([workFlowHdrId], [WorkflowDtlId], [WorkflowName], [TaskID], [TimeStarted], [TimeFinished], [DelayReason], [Delay], [assignUser]) VALUES (1024, 134, N'pro test', 187, NULL, NULL, NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[tblWorkflowDtl] OFF
GO
SET IDENTITY_INSERT [dbo].[tblWorkflowHdr] ON 

INSERT [dbo].[tblWorkflowHdr] ([workFlowID], [processID], [projectID], [packageID], [status], [completionDate], [activate]) VALUES (1, 1, 1, 2, N'Completed', CAST(N'2025-06-26T12:40:29.070' AS DateTime), 1)
INSERT [dbo].[tblWorkflowHdr] ([workFlowID], [processID], [projectID], [packageID], [status], [completionDate], [activate]) VALUES (1018, 10, 3, 6, N'Completed', CAST(N'2025-07-03T12:47:02.307' AS DateTime), 1)
INSERT [dbo].[tblWorkflowHdr] ([workFlowID], [processID], [projectID], [packageID], [status], [completionDate], [activate]) VALUES (1019, 1009, 1, 3, N'Completed', CAST(N'2025-07-04T11:27:25.357' AS DateTime), 1)
INSERT [dbo].[tblWorkflowHdr] ([workFlowID], [processID], [projectID], [packageID], [status], [completionDate], [activate]) VALUES (1020, 1010, 5, 5, N'Completed', CAST(N'2025-07-05T11:26:44.330' AS DateTime), 1)
INSERT [dbo].[tblWorkflowHdr] ([workFlowID], [processID], [projectID], [packageID], [status], [completionDate], [activate]) VALUES (1021, 1013, 2, 5, N'Completed', CAST(N'2025-07-07T14:35:12.540' AS DateTime), 1)
INSERT [dbo].[tblWorkflowHdr] ([workFlowID], [processID], [projectID], [packageID], [status], [completionDate], [activate]) VALUES (1022, 1014, 5, 3, N'Completed', CAST(N'2025-07-07T14:35:01.573' AS DateTime), 1)
INSERT [dbo].[tblWorkflowHdr] ([workFlowID], [processID], [projectID], [packageID], [status], [completionDate], [activate]) VALUES (1023, 1015, 4, 3, N'Completed', CAST(N'2025-07-07T14:35:58.887' AS DateTime), 1)
INSERT [dbo].[tblWorkflowHdr] ([workFlowID], [processID], [projectID], [packageID], [status], [completionDate], [activate]) VALUES (1024, 1016, 4, 3, N'Pending', NULL, 1)
INSERT [dbo].[tblWorkflowHdr] ([workFlowID], [processID], [projectID], [packageID], [status], [completionDate], [activate]) VALUES (1025, 1017, 1, 3, N'Pending', NULL, 1)
SET IDENTITY_INSERT [dbo].[tblWorkflowHdr] OFF
GO
ALTER TABLE [dbo].[tblAlerts] ADD  DEFAULT (getdate()) FOR [AlertDate]
GO
ALTER TABLE [dbo].[tblAlerts] ADD  DEFAULT ((0)) FOR [IsRead]
GO
ALTER TABLE [dbo].[tblProcessDepartment] ADD  DEFAULT ((0)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tblAlerts]  WITH CHECK ADD FOREIGN KEY([FromDepartmentID])
REFERENCES [dbo].[tblDepartments] ([DepartmentID])
GO
ALTER TABLE [dbo].[tblAlerts]  WITH CHECK ADD FOREIGN KEY([TaskID])
REFERENCES [dbo].[tblTasks] ([TaskID])
GO
ALTER TABLE [dbo].[tblAlerts]  WITH CHECK ADD FOREIGN KEY([ToDepartmentID])
REFERENCES [dbo].[tblDepartments] ([DepartmentID])
GO
ALTER TABLE [dbo].[tblProcessDepartment]  WITH CHECK ADD FOREIGN KEY([DepartmentID])
REFERENCES [dbo].[tblDepartments] ([DepartmentID])
GO
ALTER TABLE [dbo].[tblProcessDepartment]  WITH CHECK ADD FOREIGN KEY([ProcessID])
REFERENCES [dbo].[tblProcess] ([NumberOfProccessID])
GO
ALTER TABLE [dbo].[tblTasks]  WITH CHECK ADD  CONSTRAINT [FK_tblTask_WorkFlowHdr] FOREIGN KEY([WorkFlowHdrID])
REFERENCES [dbo].[tblWorkflowHdr] ([workFlowID])
GO
ALTER TABLE [dbo].[tblTasks] CHECK CONSTRAINT [FK_tblTask_WorkFlowHdr]
GO
ALTER TABLE [dbo].[tblTasks]  WITH CHECK ADD  CONSTRAINT [FK_tblTasks_linkTasks] FOREIGN KEY([linkTasks])
REFERENCES [dbo].[tblTasks] ([TaskID])
GO
ALTER TABLE [dbo].[tblTasks] CHECK CONSTRAINT [FK_tblTasks_linkTasks]
GO
ALTER TABLE [dbo].[tblTasks]  WITH CHECK ADD  CONSTRAINT [FK_tblTasks_ProcessorID] FOREIGN KEY([PredecessorID])
REFERENCES [dbo].[tblTasks] ([TaskID])
GO
ALTER TABLE [dbo].[tblTasks] CHECK CONSTRAINT [FK_tblTasks_ProcessorID]
GO
ALTER TABLE [dbo].[tblUsers]  WITH CHECK ADD FOREIGN KEY([DepartmentID])
REFERENCES [dbo].[tblDepartments] ([DepartmentID])
GO
ALTER TABLE [dbo].[tblWorkflowDtl]  WITH CHECK ADD  CONSTRAINT [FK__tblWorkfl__TaskI__534D60F1] FOREIGN KEY([TaskID])
REFERENCES [dbo].[tblTasks] ([TaskID])
GO
ALTER TABLE [dbo].[tblWorkflowDtl] CHECK CONSTRAINT [FK__tblWorkfl__TaskI__534D60F1]
GO
ALTER TABLE [dbo].[tblWorkflowHdr]  WITH CHECK ADD  CONSTRAINT [FK__tblProces__packa__0B91BA14] FOREIGN KEY([packageID])
REFERENCES [dbo].[tblPackages] ([PkgeID])
GO
ALTER TABLE [dbo].[tblWorkflowHdr] CHECK CONSTRAINT [FK__tblProces__packa__0B91BA14]
GO
ALTER TABLE [dbo].[tblWorkflowHdr]  WITH CHECK ADD  CONSTRAINT [FK__tblProces__proce__09A971A2] FOREIGN KEY([processID])
REFERENCES [dbo].[tblProcess] ([NumberOfProccessID])
GO
ALTER TABLE [dbo].[tblWorkflowHdr] CHECK CONSTRAINT [FK__tblProces__proce__09A971A2]
GO
ALTER TABLE [dbo].[tblWorkflowHdr]  WITH CHECK ADD  CONSTRAINT [FK__tblProces__proje__0A9D95DB] FOREIGN KEY([projectID])
REFERENCES [dbo].[tblProject] ([projectID])
GO
ALTER TABLE [dbo].[tblWorkflowHdr] CHECK CONSTRAINT [FK__tblProces__proje__0A9D95DB]
GO
USE [master]
GO
ALTER DATABASE [AccDBF] SET  READ_WRITE 
GO
