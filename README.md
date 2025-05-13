
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

