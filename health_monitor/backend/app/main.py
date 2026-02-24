from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router as sensor_router

app = FastAPI(
    title="IoT Health & Environment Monitoring API",
    description="API for receiving IoT sensor data and serving to Next.js frontend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sensor_router)

@app.get("/")
async def root():
    return {"message": "Welcome to the IoT Health & Environment Monitoring API"}
