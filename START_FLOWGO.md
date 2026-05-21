# 🚀 How to Start FlowGO - Step by Step

## Quick Start (Manual Method)

Since the automated script may have issues, here's the reliable manual method:

### Step 1: Open TWO PowerShell Terminals

You need **TWO separate PowerShell windows** running simultaneously.

---

### Step 2: Terminal 1 - Start Backend API

In the **first PowerShell terminal**, run:

```powershell
cd e:\FlowGO\rl
python -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000
```

**What to expect:**
- You should see: `INFO:     Uvicorn running on http://0.0.0.0:8000`
- If you see errors, check:
  - Python is installed: `python --version`
  - Dependencies installed: `pip install -r requirements.txt`

**Keep this terminal open!**

---

### Step 3: Terminal 2 - Start Frontend Dashboard

In the **second PowerShell terminal**, run:

```powershell
cd e:\FlowGO\frontend
npm run dev
```

**What to expect:**
- You should see: `VITE v5.x.x  ready in xxx ms`
- You should see: `➜  Local:   http://localhost:5173/`
- If you see errors, check:
  - Node.js is installed: `node --version`
  - Dependencies installed: `npm install`

**Keep this terminal open!**

---

### Step 4: Access the Application

Once both services are running:

1. **Open your browser**
2. **Go to:** http://localhost:5173

You should see the FlowGO homepage!

---

## Troubleshooting

### ❌ "python: command not found"
- Install Python 3.8+ from https://www.python.org/
- Make sure Python is added to PATH during installation

### ❌ "node: command not found"
- Install Node.js 18+ from https://nodejs.org/
- Restart PowerShell after installation

### ❌ "ModuleNotFoundError" or "Cannot find module"
**Backend:**
```powershell
cd e:\FlowGO\rl
pip install -r requirements.txt
```

**Frontend:**
```powershell
cd e:\FlowGO\frontend
npm install
```

### ❌ Port 8000 or 5173 already in use
- Close any applications using these ports
- Or change the port in the commands:
  - Backend: `--port 8001` (then use http://localhost:8001)
  - Frontend: Edit `vite.config.ts` to change port

### ❌ Services start but browser shows ERR_CONNECTION_REFUSED
- Wait 10-20 seconds for services to fully initialize
- Check both PowerShell windows for error messages
- Verify services are actually running:
  - Backend: http://localhost:8000/api/health
  - Frontend: http://localhost:5173

---

## Access Points

Once running:
- **Homepage:** http://localhost:5173
- **Authority Login:** http://localhost:5173/authority/login
- **Public View:** http://localhost:5173/public
- **API Documentation:** http://localhost:8000/docs
- **API Health Check:** http://localhost:8000/api/health

---

## Stopping Services

To stop the services:
1. Go to each PowerShell terminal
2. Press `Ctrl+C`
3. Confirm if prompted

---

## Need Help?

Check the terminal windows for specific error messages. Common issues:
- Missing dependencies
- Port conflicts
- Python/Node not in PATH
- Firewall blocking connections
