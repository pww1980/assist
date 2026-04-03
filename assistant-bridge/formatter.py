"""
Formatiert API-Antworten für die Ausgabe an OpenClaw.
JSON-Format (Standard) oder lesbarer Text (--format text).
"""
from datetime import datetime


def _fmt_date(iso: str | None) -> str:
    if not iso:
        return "kein Datum"
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return iso


def _priority_label(p: int | None) -> str:
    return {1: "hoch", 2: "mittel", 3: "niedrig"}.get(p or 2, "mittel")


def format_todos(items: list[dict]) -> str:
    if not items:
        return "Keine offenen Todos vorhanden."
    lines = [f"{len(items)} offene{'s' if len(items) == 1 else ''} Todo{'s' if len(items) != 1 else ''}:"]
    for i, t in enumerate(items, 1):
        due = f", fällig: {_fmt_date(t.get('due_date'))}" if t.get("due_date") else ""
        prio = f", Priorität: {_priority_label(t.get('priority'))}"
        lines.append(f"{i}. {t['title']}{due}{prio}")
    return "\n".join(lines)


def format_events(items: list[dict]) -> str:
    if not items:
        return "Keine Termine vorhanden."
    lines = [f"{len(items)} Termin{'e' if len(items) != 1 else ''}:"]
    for i, e in enumerate(items, 1):
        start = _fmt_date(e.get("start_time"))
        loc = f" – {e['location']}" if e.get("location") else ""
        lines.append(f"{i}. {e['title']} ({start}){loc}")
    return "\n".join(lines)


def format_ideas(items: list[dict]) -> str:
    if not items:
        return "Keine Ideen vorhanden."
    lines = [f"{len(items)} Idee{'n' if len(items) != 1 else ''}:"]
    for i, idea in enumerate(items, 1):
        content = f" – {idea['content'][:80]}" if idea.get("content") else ""
        lines.append(f"{i}. {idea['title']}{content}")
    return "\n".join(lines)


def format_shopping(items: list[dict]) -> str:
    if not items:
        return "Die Einkaufsliste ist leer."
    lines = [f"{len(items)} Artikel auf der Einkaufsliste:"]
    for i, item in enumerate(items, 1):
        qty = f" ({item['quantity']} {item.get('unit', '')}".rstrip() + ")" if item.get("quantity") else ""
        lines.append(f"{i}. {item['title']}{qty}")
    return "\n".join(lines)


def format_reminders(items: list[dict]) -> str:
    if not items:
        return "Keine aktiven Erinnerungen."
    lines = [f"{len(items)} aktive Erinnerung{'en' if len(items) != 1 else ''}:"]
    for i, r in enumerate(items, 1):
        lines.append(f"{i}. Erinnerung am {_fmt_date(r.get('remind_at'))} via {r.get('channel', 'telegram')}")
    return "\n".join(lines)


FORMATTERS = {
    "todo": format_todos,
    "event": format_events,
    "idea": format_ideas,
    "shopping_item": format_shopping,
    "reminder": format_reminders,
}


def format_items(obj_type: str, items: list[dict]) -> str:
    fn = FORMATTERS.get(obj_type)
    if fn:
        return fn(items)
    return "\n".join(str(i) for i in items)
