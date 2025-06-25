import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "UK Property Data API (BCP Focus)"
    API_V1_STR: str = "/api/v1"

    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL")

    # API Security
    API_KEY: str = os.getenv("API_KEY")
    API_KEY_NAME: str = "X-API-Key"

settings = Settings()
