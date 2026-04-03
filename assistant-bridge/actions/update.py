"""
Update-Operationen: bestehende Einträge aktualisieren oder löschen.
"""
import api_client

PATHS = {
    "todo": "/api/todos",
    "event": "/api/events",
    "idea": "/api/ideas",
    "shopping_item": "/api/shopping",
    "reminder": "/api/reminders",
}


def update(obj_type: str, obj_id: str, data: dict) -> dict:
    """
    Aktualisiert einen bestehenden Eintrag (PATCH).

    Args:
        obj_type: Typ des Objekts
        obj_id:   UUID des Eintrags
        data:     Felder die aktualisiert werden sollen (partial update)

    Returns:
        Dict mit {success, id, message} oder {success, error}

    Beispiele:
        update("todo", "...", {"completed": True})
        update("todo", "...", {"priority": 1, "due_date": "2026-04-10T00:00:00"})
        update("idea", "...", {"status": "archived"})
        update("shopping_item", "...", {"checked": True})
    """
    path = PATHS.get(obj_type)
    if not path:
        return {"success": False, "error": f"Unbekannter Typ: {obj_type}"}

    try:
        result = api_client.patch(f"{path}/{obj_id}", data)
        return {
            "success": True,
            "id": result.get("id", obj_id),
            "message": f"{obj_type.capitalize()} aktualisiert",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def delete(obj_type: str, obj_id: str) -> dict:
    """
    Löscht einen Eintrag.

    Args:
        obj_type: Typ des Objekts
        obj_id:   UUID des Eintrags

    Returns:
        Dict mit {success, message} oder {success, error}
    """
    path = PATHS.get(obj_type)
    if not path:
        return {"success": False, "error": f"Unbekannter Typ: {obj_type}"}

    try:
        api_client.delete(f"{path}/{obj_id}")
        return {"success": True, "message": f"{obj_type.capitalize()} gelöscht"}
    except Exception as e:
        return {"success": False, "error": str(e)}
