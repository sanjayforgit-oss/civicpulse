import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from backend.core.config import settings

# Default to sqlite+aiosqlite for local development if PostgreSQL is not active
DB_URL = getattr(settings, "DATABASE_URL", "")
if not DB_URL or "postgresql" in DB_URL:
    # Use SQLite for reliable zero-setup backend execution
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sqlite_path = os.path.join(base_dir, "civicpulse.db")
    ASYNC_DATABASE_URL = f"sqlite+aiosqlite:///{sqlite_path}"
else:
    ASYNC_DATABASE_URL = DB_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
