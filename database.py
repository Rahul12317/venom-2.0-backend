import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# .env file se Neon PostgreSQL ka "DATABASE_URL" uthayega
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Neon PostgreSQL ke liye connection pooling ke sath engine create karna
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()