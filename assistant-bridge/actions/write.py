"""
Schreiboperationen: neue Einträge über die FastAPI anlegen.
"""
import api_client

# Mapping von Typ zu API-Pfad
PATHS = {
    "todo": "/api/todos",
    "event": "/api/events",
    "idea": "/api/ideas",
    "shopping_item": "/api/shopping",
    "reminder": "/api/reminders",
}


def write(obj_type: str, data: dict) -> dict:
    """
    Legt einen neuen Eintrag in der Datenbank an.

    Args:
        obj_type: Typ des Objekts (todo, event, idea, shopping_item, reminder)
        data:     Felder des Objekts als Dict

    Returns:
        Dict mit {success, id, message} oder {success, error}
    """
    path = PATHS.get(obj_type)
    if not path:
        return {"success": False, "error": f"Unbekannter Typ: {obj_type}"}

    try:
        result = api_client.post(path, data)
        return {
            "success": True,
            "id": result.get("id"),
            "message": f"{obj_type.capitalize()} angelegt",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
