# Authentication & Verification System Guide

## Overview

The system now includes a complete authentication and verification system with:
- User registration
- Login with JWT tokens
- Account verification
- Protected routes
- Session management

---

## Backend Authentication

### Endpoints

#### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "authority_id": "AUTH-001",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please verify your account.",
  "authority_id": "AUTH-001",
  "verification_code": "123456"
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "authority_id": "AUTH-001",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "authority_id": "AUTH-001",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "authority"
  }
}
```

#### 3. Verify Account
```http
POST /api/auth/verify
Content-Type: application/json

{
  "authority_id": "AUTH-001",
  "verification_code": "123456"
}
```

**Response:**
```json
{
  "message": "Account verified successfully",
  "authority_id": "AUTH-001"
}
```

#### 4. Resend Verification Code
```http
POST /api/auth/resend-verification?authority_id=AUTH-001
```

**Response:**
```json
{
  "message": "Verification code sent",
  "authority_id": "AUTH-001",
  "verification_code": "654321"
}
```

#### 5. Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "authority_id": "AUTH-001",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "authority",
  "is_verified": true
}
```

#### 6. Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## Frontend Integration

### Authentication Flow

1. **Registration:**
   - User fills registration form
   - System creates account (unverified)
   - Verification code is returned
   - User enters code to verify

2. **Login:**
   - User enters credentials
   - System returns JWT token
   - Token stored in localStorage
   - User redirected to dashboard

3. **Protected Routes:**
   - Routes check for valid token
   - Token validated on backend
   - Unauthorized users redirected to login

4. **Logout:**
   - Token removed from localStorage
   - User redirected to home

### Usage Examples

**Login:**
```typescript
import { login } from "@/lib/auth";

try {
  const result = await login({
    authority_id: "AUTH-001",
    password: "password123"
  });
  // Token automatically stored
  navigate("/authority/dashboard");
} catch (error) {
  toast.error(error.message);
}
```

**Register:**
```typescript
import { register, verifyAccount } from "@/lib/auth";

// Register
const result = await register({
  authority_id: "AUTH-001",
  name: "John Doe",
  email: "john@example.com",
  password: "password123"
});

// Verify
await verifyAccount({
  authority_id: "AUTH-001",
  verification_code: result.verification_code
});
```

**Check Authentication:**
```typescript
import { isAuthenticated, getCurrentUser } from "@/lib/auth";

if (isAuthenticated()) {
  const user = await getCurrentUser();
  console.log(user.name);
}
```

---

## Security Features

### Password Hashing
- Passwords hashed using SHA-256
- **Note:** In production, use bcrypt or Argon2

### JWT Tokens
- Tokens expire after 24 hours
- Signed with secret key
- Contains user ID and role

### Verification System
- 6-digit verification codes
- Codes expire after 1 hour
- Maximum 5 verification attempts
- Codes can be resent

### Protected Endpoints
- `/api/auth/me` - Requires authentication
- `/api/auth/logout` - Requires authentication
- `/api/predict` - Can be protected (optional)

---

## Database Structure

### Users Database (`artifacts/users.json`)
```json
{
  "AUTH-001": {
    "authority_id": "AUTH-001",
    "name": "John Doe",
    "email": "john@example.com",
    "password_hash": "hashed_password",
    "role": "authority",
    "is_verified": true,
    "created_at": 1234567890.123,
    "last_login": 1234567890.123
  }
}
```

### Verifications Database (`artifacts/verifications.json`)
```json
{
  "AUTH-001": {
    "code": "123456",
    "created_at": 1234567890.123,
    "expires_at": 1234567890.123,
    "attempts": 0
  }
}
```

---

## Production Recommendations

### 1. Use Environment Variables
```python
import os
SECRET_KEY = os.getenv("SECRET_KEY", "default-key")
```

### 2. Use Bcrypt for Passwords
```python
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())
```

### 3. Send Verification Codes via Email/SMS
```python
# Instead of returning code, send via email
send_verification_email(user.email, verification_code)
```

### 4. Use Database Instead of JSON Files
- PostgreSQL, MySQL, or MongoDB
- Better for production scalability

### 5. Add Rate Limiting
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(...):
    ...
```

---

## Testing

### Test Registration
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "authority_id": "TEST-001",
    "name": "Test User",
    "password": "test123"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "authority_id": "TEST-001",
    "password": "test123"
  }'
```

### Test Protected Endpoint
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

---

## Troubleshooting

### Issue: "Account not verified"
**Solution:** Verify account using the verification code

### Issue: "Invalid authentication credentials"
**Solution:** Check token is valid and not expired

### Issue: "Session expired"
**Solution:** Login again to get new token

### Issue: "Verification code expired"
**Solution:** Request new verification code

---

## Files Created

- `rl/auth_system.py` - Backend authentication system
- `rl/monitoring_server.py` - Updated with auth endpoints
- `frontend/src/lib/auth.ts` - Frontend auth utilities
- `frontend/src/pages/AuthorityLogin.tsx` - Updated login page
- `frontend/src/components/ProtectedRoute.tsx` - Route protection
- `frontend/src/lib/api.ts` - Updated with auth headers

---

## Summary

✅ **Complete Authentication System:**
- User registration
- Login with JWT tokens
- Account verification
- Protected routes
- Session management

✅ **Security Features:**
- Password hashing
- Token-based authentication
- Verification codes
- Protected endpoints

✅ **Frontend Integration:**
- Login/Register pages
- Protected routes
- Auto token management
- Session handling

**The authentication and verification system is now fully integrated!** 🔐

