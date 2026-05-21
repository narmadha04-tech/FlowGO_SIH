# 🔧 Fix: "Failed to fetch" Login Error

## Problem
You're seeing "Failed to fetch" error when trying to sign in.

## Common Causes

### 1. ❌ Backend API Not Running (Most Common)

**The backend server must be running for login to work!**

**Check:**
```powershell
# Test if backend is running
Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing
```

**If it fails, start the backend:**
```powershell
cd e:\FlowGO\rl
python -m uvicorn api.monitoring_server:app --host 127.0.0.1 --port 8000
```

### 2. ❌ Wrong API URL

**Check your `.env.local` file:**
```env
VITE_API_URL=http://localhost:8000
```

**Or the default in `auth.ts` should be:**
```typescript
const API_BASE_URL = 'http://localhost:8000';
```

### 3. ❌ CORS Issues

The backend should have CORS enabled. Check `monitoring_server.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. ❌ Port Conflict

Make sure port 8000 is not used by another application.

---

## ✅ Solution

### Step 1: Start Backend API

**Open a PowerShell terminal and run:**

```powershell
cd e:\FlowGO\rl
python -m uvicorn api.monitoring_server:app --host 127.0.0.1 --port 8000
```

**You should see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Keep this terminal open!**

### Step 2: Verify Backend is Running

**Test the API:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing
```

**Should return:** Status 200

### Step 3: Try Login Again

1. **Make sure backend is running** (Step 1)
2. **Refresh your browser**
3. **Try logging in again**

---

## 🔍 Debug Steps

### Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Try to login
4. Look for error messages:
   - "Failed to fetch" → Backend not running
   - "NetworkError" → Connection issue
   - "CORS error" → CORS configuration issue

### Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for the `/api/auth/login` request:
   - **Red** = Failed
   - **Status 200** = Success
   - **Status 0** = Backend not running

---

## 📋 Quick Checklist

- [ ] Backend API is running (port 8000)
- [ ] Backend shows "Application startup complete"
- [ ] Can access http://localhost:8000/api/health
- [ ] Frontend is running (port 5173)
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows login request (not failed)

---

## 🐛 Still Not Working?

### Check Backend Logs

Look at the backend terminal for:
- Error messages
- Import errors
- Port already in use errors

### Test API Directly

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing

# Test login endpoint (will fail with 422, but should connect)
$body = @{ authority_id = "test"; password = "test" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:8000/api/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

If these fail, the backend is not running or not accessible.

---

## 💡 Common Fixes

### Backend Won't Start

```powershell
# Check Python
python --version

# Install dependencies
cd e:\FlowGO\rl
pip install -r requirements.txt

# Try starting again
python -m uvicorn api.monitoring_server:app --host 127.0.0.1 --port 8000
```

### Port 8000 Already in Use

```powershell
# Find what's using port 8000
netstat -ano | findstr ":8000"

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
python -m uvicorn api.monitoring_server:app --host 127.0.0.1 --port 8001
```

Then update `.env.local`:
```env
VITE_API_URL=http://localhost:8001
```

---

## ✅ After Fix

Once backend is running:
- ✅ Login should work
- ✅ Registration should work
- ✅ No "Failed to fetch" errors
- ✅ Network tab shows successful requests

---

**Most likely fix: Start the backend API server!** 🚀
