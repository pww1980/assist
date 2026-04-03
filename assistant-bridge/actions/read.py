"""
Leseoperationen: Daten aus der FastAPI abfragen.
"""
from datetime import date
import api_client

# Mapping von Typ zu API-Pfad und verfügbaren Filtern
PATHS = {
    "todo": "/api/todos",
    "event": "/api/events",
    "idea": "/api/ideas",
    "shopping_item": "/api/shopping",
    "reminder": "/api/reminders",
}

# Standardfilter pro Typ (werden angewendet wenn kein Filter angegeben)
DEFAULT_FILTERS = {
    "todo": {"completed": "false"},
    "event": {"upcoming": "true"},
    "idea": {"status": "active"},
    "shopping_item": {"checked": "false"},
    "reminder": {"sent": "false"},
}


def _build_query(filters: dict) -> str:
    """Baut Query-String aus Filter-Dict."""
    if not filters:
        return ""
    params = "&".join(f"{k}={v}" for k, v in filters.items())
    return f"?{params}"


def read(obj_type: str, filters: dict | None = None) -> dict:
    """
    Liest Einträge aus der Datenbank.

    Args:
        obj_type: Typ des Objekts (todo, event, idea, shopping_item, reminder)
        filters:  Optionale Filter als Dict. Ohne Angabe werden Standardfilter
                  verwendet (z.B. nur offene Todos, nur aktive Ideen).
                  Leeres Dict {} deaktiviert alle Filter.

    Returns:
        Dict mit {success, count, items} oder {success, error}

    Verfügbare Filter je Typ:
        todo:          completed=true|false, priority=1|2|3, due_today=true
        event:         date=today, upcoming=true
        idea:          status=active|archived
        shopping_item: checked=true|false
        reminder:      sent=true|false
    """
    path = PATHS.get(obj_type)
    if not path:
        return {"success": False, "error": f"Unbekannter Typ: {obj_type}", "count": 0, "items": []}

    # Standardfilter verwenden wenn kein Filter angegeben (None)
    active_filters = DEFAULT_FILTERS.get(obj_type, {}) if filters is None else filters

    query = _build_query(active_filters)
    try:
        result = api_client.get(f"{path}{query}")
        # API gibt entweder eine Liste oder ein Dict mit items zurück
        items = result if isinstance(result, list) else result.get("items", result)
        return {
            "success": True,
            "count": len(items),
            "items": items,
        }
    except Exception as e:
        return {"success": False, "error": str(e), "count": 0, "items": []}
