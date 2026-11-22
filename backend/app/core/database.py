from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Safe SQLite schema migration to ensure new columns exist without breaking existing DB
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(hotspots);")).fetchall()
            col_names = [row[1] for row in result]
            if "zone_name" not in col_names:
                conn.execute(text("ALTER TABLE hotspots ADD COLUMN zone_name TEXT;"))
                conn.commit()
                print("[AeroClean DB] Added missing column: hotspots.zone_name")
            if "image_ids_json" not in col_names:
                conn.execute(text("ALTER TABLE hotspots ADD COLUMN image_ids_json TEXT;"))
                conn.commit()
                print("[AeroClean DB] Added missing column: hotspots.image_ids_json")
    except Exception as e:
        print(f"[AeroClean DB] Migration note: {e}")
