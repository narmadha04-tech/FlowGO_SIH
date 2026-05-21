# ⚡ QUICK START - FlowGO

## 🚀 Single Command (Choose One)

### Windows - Easiest:
```powershell
.\start.ps1
```

### Or Double-Click:
**Double-click `start.bat`** in the project folder

---

## ✅ Verify Services Are Running

After running the start command, **wait 15-20 seconds**, then check:

### Test Backend:
Open in browser: http://localhost:8000/api/health
- Should show: `{"status":"ok","timestamp":...}`

### Test Frontend:
Open in browser: http://localhost:5173
- Should show: FlowGO homepage

---

## 🔧 If Services Don't Start

### Manual Start (Most Reliable):

**Open TWO PowerShell terminals:**

**Terminal 1 - Backend:**
```powershell
cd e:\FlowGO\rl
python -m uvicorn api.monitoring_server:app --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend:**
```powershell
cd e:\FlowGO\frontend
npm run dev
```

**Keep both terminals open!**

---

## 🐛 Common Issues

### ❌ "python: command not found"
```powershell
# Check if Python is installed
python --version

# If not found, install from: https://www.python.org/
```

### ❌ "node: command not found"
```powershell
# Check if Node.js is installed
node --version

# If not found, install from: https://nodejs.org/
```

### ❌ "ModuleNotFoundError"
```powershell
cd e:\FlowGO\rl
pip install -r requirements.txt
```

### ❌ "Cannot find module" (Frontend)
```powershell
cd e:\FlowGO\frontend
npm install
```

### ❌ Port Already in Use
- Close other applications using ports 8000 or 5173
- Or restart your computer

---

## 📍 Access Points

Once services are running:

- **Homepage:** http://localhost:5173
- **Authority Login:** http://localhost:5173/authority/login  
- **Public View:** http://localhost:5173/public
- **API Docs:** http://localhost:8000/docs
- **API Health:** http://localhost:8000/api/health

---

## 🛑 Stop Services

Press `Ctrl+C` in each terminal window

---

## 💡 Pro Tip

If you see **ERR_CONNECTION_REFUSED**:
1. Check that both terminals are still running
2. Look for error messages in the terminal windows
3. Wait 20-30 seconds after starting
4. Try the manual start method above

---

**Need help? Check the terminal windows for specific error messages!**
