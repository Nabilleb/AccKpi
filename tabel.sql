USE [master]
GO
/****** Object:  Database [AccDBF]    Script Date: 12/29/2025 2:18:00 PM ******/
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
/****** Object:  Table [dbo].[tblAlerts]    Script Date: 12/29/2025 2:18:01 PM ******/
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
/****** Object:  Table [dbo].[tblDepartments]    Script Date: 12/29/2025 2:18:01 PM ******/
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
/****** Object:  Table [dbo].[tblPackages]    Script Date: 12/29/2025 2:18:01 PM ******/
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
/****** Object:  Table [dbo].[tblProcess]    Script Date: 12/29/2025 2:18:01 PM ******/
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
/****** Object:  Table [dbo].[tblProcessDepartment]    Script Date: 12/29/2025 2:18:01 PM ******/
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
/****** Object:  Table [dbo].[tblProject]    Script Date: 12/29/2025 2:18:01 PM ******/
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
/****** Object:  Table [dbo].[tblSubPackage]    Script Date: 12/29/2025 2:18:01 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblSubPackage](
	[SubPackageID] [int] IDENTITY(1,1) NOT NULL,
	[ItemDescription] [nvarchar](max) NULL,
	[PkgeID] [int] NOT NULL,
	[SupplierName] [varchar](255) NULL,
	[SupplierContractorName] [varchar](255) NULL,
	[SupplierContractorType] [varchar](50) NULL,
	[AwardValue] [decimal](18, 2) NULL,
	[Currency] [varchar](10) NULL,
	[CreatedDate] [datetime] NULL,
	[UpdatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[SubPackageID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblTasks]    Script Date: 12/29/2025 2:18:01 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblTasks](
	[TaskID] [int] IDENTITY(1,1) NOT NULL,
	[TaskName] [varchar](150) NULL,
	[TaskPlanned] [text] NULL,
	[IsTaskSelected] [bit] NULL,
	[PlannedDate] [datetime] NULL,
	[DepId] [int] NULL,
	[Priority] [int] NULL,
	[PredecessorID] [int] NULL,
	[DaysRequired] [int] NULL,
	[linkTasks] [int] NULL,
	[proccessID] [int] NULL,
	[IsFixed] [bit] NULL,
	[IsTaskLinked] [bit] NULL,
	[hasLinkedFrom] [int] NULL,
	[WorkFlowHdrID] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[TaskID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblUsers]    Script Date: 12/29/2025 2:18:01 PM ******/
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
	[DepartmentID] [int] NULL,
	[AllowAccess] [bit] NULL,
	[Export] [smallint] NULL,
	[LastUpdate] [datetime] NULL,
	[usrEmail] [varchar](50) NULL,
	[usrSignature] [varchar](100) NULL,
	[emailSignature] [text] NULL,
	[usrReadPolicy] [tinyint] NULL,
	[insertDate] [datetime] NULL,
	[IsSpecialUser] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[usrID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblWorkflowDtl]    Script Date: 12/29/2025 2:18:01 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tblWorkflowDtl](
	[workFlowHdrId] [int] NULL,
	[WorkflowDtlId] [int] IDENTITY(1,1) NOT NULL,
	[WorkflowName] [varchar](100) NOT NULL,
	[TaskID] [int] NOT NULL,
	[TimeStarted] [datetime] NULL,
	[TimeFinished] [datetime] NULL,
	[DelayReason] [nvarchar](255) NULL,
	[Delay] [int] NULL,
	[assignUser] [varchar](50) NULL,
	[PlannedDate] [datetime] NULL,
	[Status] [varchar](50) NULL,
	[DaysRequired] [int] NULL,
	[Priority] [int] NULL,
	[PredecessorTaskID] [int] NULL,
	[LinkTaskID] [int] NULL,
 CONSTRAINT [PK_tblWorkflowDtl] PRIMARY KEY CLUSTERED 
(
	[WorkflowDtlId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tblWorkflowHdr]    Script Date: 12/29/2025 2:18:01 PM ******/
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
	[startDate] [datetime] NULL,
	[createdDate] [datetime] NULL,
	[DaysDone] [int] NULL,
 CONSTRAINT [PK_tblProcessWorkflow] PRIMARY KEY CLUSTERED 
(
	[workFlowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[tblAlerts] ADD  DEFAULT (getdate()) FOR [AlertDate]
GO
ALTER TABLE [dbo].[tblAlerts] ADD  DEFAULT ((0)) FOR [IsRead]
GO
ALTER TABLE [dbo].[tblProcessDepartment] ADD  DEFAULT ((0)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tblSubPackage] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[tblSubPackage] ADD  DEFAULT (getdate()) FOR [UpdatedDate]
GO
ALTER TABLE [dbo].[tblUsers] ADD  DEFAULT ((0)) FOR [IsSpecialUser]
GO
ALTER TABLE [dbo].[tblWorkflowDtl] ADD  DEFAULT ('Pending') FOR [Status]
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
ALTER TABLE [dbo].[tblSubPackage]  WITH CHECK ADD  CONSTRAINT [FK_tblSubPackage_tblPackages] FOREIGN KEY([PkgeID])
REFERENCES [dbo].[tblPackages] ([PkgeID])
GO
ALTER TABLE [dbo].[tblSubPackage] CHECK CONSTRAINT [FK_tblSubPackage_tblPackages]
GO
ALTER TABLE [dbo].[tblTasks]  WITH CHECK ADD  CONSTRAINT [FK_tblTasks_hasLinkedFrom] FOREIGN KEY([hasLinkedFrom])
REFERENCES [dbo].[tblTasks] ([TaskID])
GO
ALTER TABLE [dbo].[tblTasks] CHECK CONSTRAINT [FK_tblTasks_hasLinkedFrom]
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
ALTER TABLE [dbo].[tblTasks]  WITH CHECK ADD  CONSTRAINT [FK_tblTasks_tblProcess] FOREIGN KEY([proccessID])
REFERENCES [dbo].[tblProcess] ([NumberOfProccessID])
GO
ALTER TABLE [dbo].[tblTasks] CHECK CONSTRAINT [FK_tblTasks_tblProcess]
GO
ALTER TABLE [dbo].[tblTasks]  WITH CHECK ADD  CONSTRAINT [FK_tblTasks_WorkFlowHdr] FOREIGN KEY([WorkFlowHdrID])
REFERENCES [dbo].[tblWorkflowHdr] ([workFlowID])
GO
ALTER TABLE [dbo].[tblTasks] CHECK CONSTRAINT [FK_tblTasks_WorkFlowHdr]
GO
ALTER TABLE [dbo].[tblUsers]  WITH CHECK ADD FOREIGN KEY([DepartmentID])
REFERENCES [dbo].[tblDepartments] ([DepartmentID])
GO
ALTER TABLE [dbo].[tblWorkflowDtl]  WITH CHECK ADD  CONSTRAINT [FK_tblWorkflowDtl_TaskID] FOREIGN KEY([TaskID])
REFERENCES [dbo].[tblTasks] ([TaskID])
GO
ALTER TABLE [dbo].[tblWorkflowDtl] CHECK CONSTRAINT [FK_tblWorkflowDtl_TaskID]
GO
ALTER TABLE [dbo].[tblWorkflowDtl]  WITH CHECK ADD  CONSTRAINT [FK_tblWorkflowDtl_WorkflowHdr] FOREIGN KEY([workFlowHdrId])
REFERENCES [dbo].[tblWorkflowHdr] ([workFlowID])
GO
ALTER TABLE [dbo].[tblWorkflowDtl] CHECK CONSTRAINT [FK_tblWorkflowDtl_WorkflowHdr]
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
