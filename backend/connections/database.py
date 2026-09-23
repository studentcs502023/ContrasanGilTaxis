import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Cargar las variables del archivo .env
load_dotenv()

# Leer la URL de la base de datos desde el entorno
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "mysql+pymysql://root:@localhost:3306/sistema_taxis_sangil" # Fallback por si no encuentra el .env
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verifica que la conexión con MariaDB siga viva antes de usarla
    pool_recycle=3600,   # Recicla conexiones inactivas para evitar cierres por timeout
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Dependencia de FastAPI para inyectar la sesión de base de datos
    en cada petición HTTP y cerrarla de forma segura al finalizar.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()