# 🔧 FlowGo Traffic AI - Troubleshooting Guide

## "Failed to fetch" Error on Login

### Common Causes & Solutions

#### 1. Backend API Not Running

**Symptom:** "Failed to fetch" or "Cannot connect to backend API"

**Solution:**
```powershell
# Check if backend is running
curl http://localhost:8000/api/health

# If not running, start it:
cd rl
python -m uvicorn api.monitoring_server:app --host 0.0.0.0 --port 8000 --reload
```

**Or use the single command runner:**
```powershell
.\run.ps1
```

#### 2. Port Mismatch

**Symptom:** Frontend can't reach backend

**Check:**
- Backend should be on port **8000**
- Frontend should be on port **5173**
- Check `frontend/.env` file has: `VITE_MONITORING_API=http://localhost:8000`

**Solution:**
```powershell
# Create/update frontend/.env
echo "VITE_MONITORING_API=http://localhost:8000" > frontend/.env

# Restart frontend
cd frontend
npm run dev
```

#### 3. CORS Issues

**Symptom:** Network error in browser console

**Solution:**
The backend CORS is already configured to allow all origins. If you still see CORS errors:

1. Check `rl/api/monitoring_server.py` has:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. Restart the backend server

#### 4. Firewall Blocking

**Symptom:** Connection timeout

**Solution:**
- Check Windows Firewall settings
- Allow Python and Node.js through firewall
- Or temporarily disable firewall for testing

#### 5. Wrong API URL

**Symptom:** 404 Not Found errors

**Check:**
- Open browser DevTools (F12)
- Check Network tab for failed requests
- Verify the URL is `http://localhost:8000/api/auth/login`

**Solution:**
```typescript
// frontend/src/lib/auth.ts should have:
const API_BASE = import.meta.env.VITE_MONITORING_API ?? "http://localhost:8000";
```

---

## Quick Diagnostic Steps

### Step 1: Check Backend
```powershell
# Test backend health
curl http://localhost:8000/api/health

# Should return: {"status":"ok","timestamp":...}
```

### Step 2: Check Frontend
```powershell
# Open browser console (F12)
# Look for errors in Console tab
# Check Network tab for failed requests
```

### Step 3: Check Ports
```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Check what's using port 5173
netstat -ano | findstr :5173
```

### Step 4: Verify Services
```powershell
# Backend should show:
# "Uvicorn running on http://0.0.0.0:8000"

# Frontend should show:
# "Local: http://localhost:5173/"
```

---

## Complete Reset

If nothing works, do a complete reset:

```powershell
# 1. Stop all services (Ctrl+C in all terminals)

# 2. Kill any remaining processes
taskkill /F /IM python.exe
taskkill /F /IM node.exe

# 3. Restart with single command
.\run.ps1
```

---

## Browser Console Debugging

Open browser DevTools (F12) and check:

1. **Console Tab:**
   - Look for red error messages
   - Check for CORS errors
   - Check for network errors

2. **Network Tab:**
   - Filter by "XHR" or "Fetch"
   - Look for failed requests (red)
   - Click on failed request to see details
   - Check Request URL and Response

3. **Application Tab:**
   - Check Local Storage
   - Verify `auth_token` is stored after login

---

## Common Error Messages

### "Cannot connect to backend API"
- **Cause:** Backend not running
- **Fix:** Start backend with `.\run.ps1` or manually

### "NetworkError when attempting to fetch resource"
- **Cause:** CORS or network issue
- **Fix:** Check CORS settings, restart backend

### "404 Not Found"
- **Cause:** Wrong API endpoint
- **Fix:** Verify API routes in `rl/api/monitoring_server.py`

### "500 Internal Server Error"
- **Cause:** Backend error
- **Fix:** Check backend terminal for error messages

### "401 Unauthorized"
- **Cause:** Invalid credentials or token
- **Fix:** Check login credentials, verify account

---

## Still Having Issues?

1. **Check Logs:**
   - Backend: Check PowerShell window running backend
   - Frontend: Check browser console (F12)

2. **Verify Installation:**
   ```powershell
   cd rl
   python -c "import fastapi, uvicorn; print('OK')"
   
   cd ../frontend
   npm list --depth=0
   ```

3. **Test API Directly:**
   ```powershell
   # Test health endpoint
   curl http://localhost:8000/api/health
   
   # Test login endpoint (should fail with 422, not connection error)
   curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{}"
   ```

---

**Need more help?** Check the main README.md or docs/ folder for detailed guides.

**FlowGo Team** - AI-Powered Traffic Management

