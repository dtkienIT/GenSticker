from supabase import create_client, Client
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Initialize Supabase Py client
supabase: Client | None = None
supabase_admin: Client | None = None

if settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY:
  try:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    print("[OK] Supabase client initialized successfully!")
  except Exception as e:
    print(f"[WARN] Could not initialize Supabase client: {e}")

if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
  try:
    supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    print("[OK] Supabase admin client initialized successfully!")
  except Exception as e:
    print(f"[WARN] Could not initialize Supabase admin client: {e}")

# SQLAlchemy Engine setup (for PostgreSQL direct connection)
Base = declarative_base()

engine = None
SessionLocal = None

if settings.DATABASE_URL:
  try:
    # Fix URL prefix if needed for SQLAlchemy postgresql driver
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgres://"):
      db_url = db_url.replace("postgres://", "postgresql://", 1)
      
    engine = create_engine(
      db_url,
      pool_size=10,
      max_overflow=20,
      pool_pre_ping=True
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print("[OK] Direct Postgres SQLAlchemy engine initialized!")
  except Exception as e:
    print(f"[WARN] SQLAlchemy engine initialization failed: {e}")

def get_db():
  """FastAPI dependency for database sessions"""
  if SessionLocal is None:
    yield None
    return
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()
