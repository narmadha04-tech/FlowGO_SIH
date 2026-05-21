from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid

app = FastAPI(title="FlowGO API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock user database
fake_users_db = {}

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str

@app.post("/api/auth/register", response_model=UserOut)
async def register(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    fake_users_db[user.email] = {
        "id": user_id,
        "email": user.email,
        "password": user.password,  # In a real app, hash the password
        "full_name": user.full_name
    }
    return {
        "id": user_id,
        "email": user.email,
        "full_name": user.full_name
    }

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user = fake_users_db.get(credentials.email)
    if not user or user["password"] != credentials.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # In a real app, return a JWT token
    return {"message": "Login successful", "user_id": user["id"]}

@app.get("/")
async def root():
    return {"message": "FlowGO API is running"}