from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
import traceback

from ..schemas import UserCreate, Token, UserInDB
from ..database import users_collection
from ..auth import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
        
    hashed_password = get_password_hash(user.password)
    new_user = {
        "email": user.email,
        "password_hash": hashed_password,
        "role": user.role,
        "created_at": datetime.utcnow()
    }
    
    try:
        result = await users_collection.insert_one(new_user)
        return {"id": str(result.inserted_id), "message": "User registered successfully"}
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users_collection.find_one({"email": form_data.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"], "id": str(user["_id"])},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
