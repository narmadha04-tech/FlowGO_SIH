# 🚀 How to Run FlowGO Project

## Quick Start (Fix Execution Policy Error)

If you see "cannot be loaded" or "not digitally signed" error, use this:

### Option 1: Run with Bypass (Recommended)

```powershell
cd e:\FlowGO
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\run.ps1
```

### Option 2: Use the Simple Script

```powershell
cd e:\FlowGO
.\start.ps1
```

### Option 3: Manual Start (Most Reliable)

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

---

## What Each Method Does

### run.ps1
- Checks dependencies
- Starts backend API (port 8000)
- Starts frontend dashboard (port 5173)
- Opens browser automatically

### start.ps1
- Simpler version
- Just starts both services
- No dependency checks

### Manual Start
- Most reliable
- You see all output
- Easy to debug issues

---

## After Starting

Wait 10-20 seconds, then access:
- **Homepage:** http://localhost:5173
- **Authority Login:** http://localhost:5173/authority/login
- **Public View:** http://localhost:5173/public
- **API Docs:** http://localhost:8000/docs

---

## Troubleshooting

### ❌ Execution Policy Error
**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\run.ps1
```

### ❌ Services Don't Start
- Check PowerShell windows for error messages
- Verify Python and Node.js are installed
- Make sure ports 8000 and 5173 are free

### ❌ "Cannot find module" (Frontend)
```powershell
cd e:\FlowGO\frontend
npm install --legacy-peer-deps
```

### ❌ "ModuleNotFoundError" (Backend)
```powershell
cd e:\FlowGO\rl
pip install -r requirements.txt
```

---

## Recommended: Manual Start

For the most reliable experience, use manual start:

1. **Terminal 1:**
   ```powershell
   cd e:\FlowGO\rl
   python -m uvicorn api.monitoring_server:app --host 127.0.0.1 --port 8000
   ```

2. **Terminal 2:**
   ```powershell
   cd e:\FlowGO\frontend
   npm run dev
   ```

3. **Wait 15-20 seconds**

4. **Open:** http://localhost:5173

---

**That's it! The project should now be running.** 🎉
