import os
from pathlib import Path
from dotenv import load_dotenv

# .env aus dem Verzeichnis des Scripts laden
load_dotenv(Path(__file__).parent / ".env")

MIDDLEWARE_URL = os.getenv("MIDDLEWARE_URL", "").rstrip("/")
SYNC_TOKEN = os.getenv("SYNC_TOKEN", "")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "")

if not MIDDLEWARE_URL:
    raise RuntimeError("MIDDLEWARE_URL ist nicht gesetzt. Bitte .env befüllen.")
if not SYNC_TOKEN:
    raise RuntimeError("SYNC_TOKEN ist nicht gesetzt. Bitte .env befüllen.")
