
---

### 📄 `README.md`

````markdown
# AccKpi (KPI Management System)

This project is a Node.js + Express.js application for managing KPIs, packages, tasks, processes, and workflows, connected to a Microsoft SQL Server database.

---

## 📁 Project Structure

- `views/` — EJS templates for UI
- `public/` — Static assets (CSS, JS, etc.)
- `server.js` (or `index.js`) — Main Express app
- `.env` — Contains environment variables (DB credentials, port, etc.)

---

## 🚀 Features

- Add and manage **Packages**, **Tasks**, **Processes**, and **Workflows**
- Data stored in **SQL Server**
- Uses **EJS** templates for rendering pages
- Built-in routes to render and process forms

---

## 🛠️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Nabilleb/AccKpi.git
cd AccKpi
````

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

Create a file called `.env` in the root directory with the following content (fill in your own values):

```env
PORT=3000
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_SERVER=your_db_host
DB_DATABASE=your_database_name
```

> ⚠️ Note: SQL Server must be accessible and configured to accept SQL Server Authentication.

### 4. Start the app

```bash
node index.js
```

Or if your file is named `server.js`:

```bash
node server.js
```

The server should start on [http://localhost:3000](http://localhost:3000)

---

## 📌 Available Routes

* `/` — Homepage
* `/addPackage` — Add a new package
* `/addTask` — Add a new task
* `/addProcess` — Assign departments to a process
* `/addWorkflow` — Assign workflows with users, tasks, and packages

---

## 🙋 Contact

If you need help or access issues, reach out to **Nabil**.

---

## ✅ TODO / Improvements

* Add user authentication
* Upload file handling
* Better UI and validations

````

---

### ✅ How to use it:

1. Save the above content in a file named `README.md` in your project root.
2. Commit and push it:

```bash
git add README.md
git commit -m "Add project README"
git push
````




CREATE TABLE tblAlerts (
    AlertID INT IDENTITY(1,1) PRIMARY KEY,
    Message NVARCHAR(MAX),
    FromDepartmentID INT,
    ToDepartmentID INT,
    TaskID INT,
    AlertDate DATETIME,
    IsRead BIT
);
CREATE TABLE tblDepartments (
    DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
    DeptName NVARCHAR(100),
    DeptEmail NVARCHAR(100)
);
CREATE TABLE tblDepartmentTask (
    DepartmentTaskID INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentID INT,
    TaskID INT,
    ProcessID INT
);
CREATE TABLE tblPackages (
    PkgeID INT IDENTITY(1,1) PRIMARY KEY,
    PkgeName NVARCHAR(100),
    Selected BIT,
    Duration INT,
    Division NVARCHAR(100),
    Standard NVARCHAR(100),
    Trade NVARCHAR(100),
    FilePath NVARCHAR(255),
    IsSynched BIT,
    insertDate DATETIME
);
CREATE TABLE tblProcess (
    NumberOfProccessID INT IDENTITY(1,1) PRIMARY KEY,
    ProcessName NVARCHAR(100),
    processDesc NVARCHAR(MAX)
);
CREATE TABLE tblProcessDepartment (
    ProcessID INT,
    DepartmentID INT
);
CREATE TABLE tblTasks (
    TaskID INT IDENTITY(1,1) PRIMARY KEY,
    TaskName NVARCHAR(100),
    TaskPlanned INT,
    TaskActual INT,
    IsTaskSelected BIT,
    IsDateFixed BIT,
    PlannedDate DATETIME
);
CREATE TABLE tblUsers (
    usrID INT IDENTITY(1,1) PRIMARY KEY,
    usrDesc NVARCHAR(100),
    usrPWD NVARCHAR(100),
    usrAdmin BIT,
    usrSTID INT,
    DepartmentID INT,
    AllowAccess BIT,
    Export BIT,
    LastUpdate DATETIME,
    usrEmail NVARCHAR(100),
    usrSignature NVARCHAR(MAX),
    emailSignature NVARCHAR(MAX),
    usrReadPolicy BIT,
    insertDate DATETIME
);
CREATE TABLE tblWorkflow (
    WorkflowID INT IDENTITY(1,1) PRIMARY KEY,
    WorkflowName NVARCHAR(100),
    usrID INT,
    TaskID INT,
    PkgeID INT,
    TimeStarted DATETIME,
    TimeFinished DATETIME,
    Delay INT,
    DelayReason NVARCHAR(MAX)
);
