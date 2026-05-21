# 🚀 Single Command to Run FlowGO

## Windows - Easiest Method

### Option 1: Double-click the batch file
Simply **double-click** `start.bat` in the project root folder.

### Option 2: Run from PowerShell
```powershell
.\start.ps1
```

### Option 3: Run from Command Prompt
```cmd
start.bat
```

---

## What Happens

1. ✅ Two PowerShell windows will open automatically
2. ✅ Backend API starts on port 8000
3. ✅ Frontend Dashboard starts on port 5173
4. ✅ Wait 10-20 seconds for services to initialize
5. ✅ Open http://localhost:5173 in your browser

---

## One-Line Command (PowerShell)

If you prefer a single command line:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

---

## One-Line Command (Command Prompt)

```cmd
start.bat
```

---

## Troubleshooting

### If you get "Execution Policy" error:
The scripts automatically bypass this, but if you still see errors:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\start.ps1
```

### If services don't start:
Check the PowerShell windows for error messages. Common issues:
- Python not found → Install Python and add to PATH
- Node not found → Install Node.js
- Port in use → Close other apps using ports 8000/5173

---

## Access Points

Once running:
- **Homepage:** http://localhost:5173
- **Authority Login:** http://localhost:5173/authority/login
- **Public View:** http://localhost:5173/public
- **API Docs:** http://localhost:8000/docs

---

## Stop Services

To stop:
1. Go to each PowerShell window
2. Press `Ctrl+C`
3. Confirm if prompted

---

**That's it! Just run `start.bat` or `.\start.ps1` and you're done!** 🎉
