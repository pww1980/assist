import logging
import sys
from config import LOG_LEVEL, LOG_FILE

handlers = [logging.StreamHandler(sys.stderr)]
if LOG_FILE:
    handlers.append(logging.FileHandler(LOG_FILE))

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=handlers,
)

logger = logging.getLogger("bridge")
