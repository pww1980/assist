"""
HTTPS-Client zur FastAPI Middleware auf YunoHost.
Alle Requests werden mit X-Sync-Token Header authentifiziert.
"""
import json
import httpx
from config import MIDDLEWARE_URL, SYNC_TOKEN
from logger import logger

HEADERS = {
    "X-Sync-Token": SYNC_TOKEN,
    "Content-Type": "application/json",
}

TIMEOUT = 10.0  # Sekunden


def _request(method: str, path: str, data: dict | None = None) -> dict:
    """Führt einen HTTPS-Request zur Middleware aus. Gibt das JSON-Response zurück."""
    url = f"{MIDDLEWARE_URL}{path}"
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.request(
                method=method,
                url=url,
                headers=HEADERS,
                content=json.dumps(data) if data else None,
            )
        response.raise_for_status()
        if response.status_code == 204 or not response.content:
            return {}
        return response.json()
    except httpx.TimeoutException:
        logger.error("Timeout beim Request zu %s", url)
        raise
    except httpx.HTTPStatusError as e:
        logger.error("HTTP-Fehler %s bei %s: %s", e.response.status_code, url, e.response.text)
        raise
    except httpx.RequestError as e:
        logger.error("Verbindungsfehler zu %s: %s", url, e)
        raise


def get(path: str) -> dict:
    return _request("GET", path)


def post(path: str, data: dict) -> dict:
    return _request("POST", path, data)


def patch(path: str, data: dict) -> dict:
    return _request("PATCH", path, data)


def delete(path: str) -> dict:
    return _request("DELETE", path)
