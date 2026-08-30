import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.database import Base, engine, SessionLocal
from backend.api.routes import router as api_router
from backend.seed import seed_database
from backend.models.models import Employee

# Create database tables
Base.metadata.create_all(bind=engine)

# Auto-seed if database is completely empty
db = SessionLocal()
try:
    if db.query(Employee).count() == 0:
        print("Database is empty. Triggering automated demo seeding...")
        seed_database()
finally:
    db.close()

app = FastAPI(
    title="WorkLens AI API",
    description="AI Workforce Workload Intelligence & Delivery Risk Management Engine",
    version="1.1.0"
)

# Configure CORS specifically for frontend origins
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    os.getenv("FRONTEND_URL", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001")
)
allowed_origins = [orig.strip() for orig in raw_origins.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "WorkLens AI",
        "version": "1.1.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
