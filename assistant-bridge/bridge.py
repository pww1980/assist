#!/usr/bin/env python3
"""
Assistant Bridge – Schnittstelle zwischen OpenClaw und der Datenbank.

Dieses Script wird von OpenClaw direkt als Subprocess aufgerufen.
Es liest und schreibt Daten über die FastAPI Middleware auf YunoHost.

Aufruf:
    python bridge.py --action <aktion> --type <typ> [--data '<json>'] [--filter '<json>'] [--id <uuid>] [--format json|text]

Aktionen:
    write   Neuen Eintrag anlegen (benötigt --data)
    read    Einträge abfragen (optional --filter)
    update  Eintrag aktualisieren (benötigt --id und --data)
    delete  Eintrag löschen (benötigt --id)

Typen:
    todo, event, idea, shopping_item, reminder

Ausgabe:
    JSON (Standard) oder lesbarer Text (--format text)
    Exit-Code 0 bei Erfolg, 1 bei Fehler

Beispiele:
    # Neues Todo anlegen
    python bridge.py --action write --type todo --data '{"title": "Zahnarzt anrufen", "due_date": "2026-04-10T00:00:00", "priority": 1}'

    # Alle offenen Todos lesen (lesbarer Text für OpenClaw)
    python bridge.py --action read --type todo --format text

    # Todos mit eigenem Filter lesen
    python bridge.py --action read --type todo --filter '{"completed": "false", "due_today": "true"}'

    # Alle Einträge eines Typs ohne Filter lesen
    python bridge.py --action read --type todo --filter '{}'

    # Heutige Termine lesen
    python bridge.py --action read --type event --filter '{"date": "today"}'

    # Todo abhaken
    python bridge.py --action update --type todo --id "a1b2c3d4-..." --data '{"completed": true}'

    # Idee archivieren
    python bridge.py --action update --type idea --id "..." --data '{"status": "archived"}'

    # Eintrag löschen
    python bridge.py --action delete --type todo --id "..."
"""

import argparse
import json
import sys

from logger import logger
from actions.write import write
from actions.read import read
from actions.update import update, delete
from formatter import format_items

VALID_TYPES = {"todo", "event", "idea", "shopping_item", "reminder"}
VALID_ACTIONS = {"write", "read", "update", "delete"}


def output(result: dict, fmt: str, obj_type: str = "") -> None:
    """Gibt das Ergebnis aus und setzt den Exit-Code."""
    if fmt == "text" and result.get("success") and "items" in result:
        print(format_items(obj_type, result["items"]))
    elif fmt == "text" and result.get("success") and "message" in result:
        print(result["message"])
    elif fmt == "text" and not result.get("success"):
        print(f"Fehler: {result.get('error', 'Unbekannter Fehler')}", file=sys.stderr)
    else:
        print(json.dumps(result, ensure_ascii=False, default=str))

    if not result.get("success"):
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Assistant Bridge – OpenClaw zu FastAPI Middleware",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--action", required=True, choices=VALID_ACTIONS,
                        help="Aktion: write, read, update, delete")
    parser.add_argument("--type", required=True, dest="obj_type", choices=VALID_TYPES,
                        help="Objekttyp: todo, event, idea, shopping_item, reminder")
    parser.add_argument("--data", default=None,
                        help="JSON-String mit Feldern (für write und update)")
    parser.add_argument("--filter", default=None, dest="filter_str",
                        help="JSON-String mit Filterfeldern (für read). '{}' = kein Filter")
    parser.add_argument("--id", default=None, dest="obj_id",
                        help="UUID des Eintrags (für update und delete)")
    parser.add_argument("--format", default="json", choices=["json", "text"],
                        help="Ausgabeformat: json (Standard) oder text (für OpenClaw)")

    args = parser.parse_args()

    # Daten parsen
    data = None
    if args.data:
        try:
            data = json.loads(args.data)
        except json.JSONDecodeError as e:
            print(json.dumps({"success": False, "error": f"Ungültiges JSON in --data: {e}"}))
            sys.exit(1)

    filters = None
    if args.filter_str is not None:
        try:
            filters = json.loads(args.filter_str)
        except json.JSONDecodeError as e:
            print(json.dumps({"success": False, "error": f"Ungültiges JSON in --filter: {e}"}))
            sys.exit(1)

    # Aktion ausführen
    logger.debug("Aktion=%s Typ=%s", args.action, args.obj_type)

    if args.action == "write":
        if not data:
            print(json.dumps({"success": False, "error": "--data ist bei 'write' erforderlich"}))
            sys.exit(1)
        result = write(args.obj_type, data)

    elif args.action == "read":
        result = read(args.obj_type, filters)

    elif args.action == "update":
        if not args.obj_id:
            print(json.dumps({"success": False, "error": "--id ist bei 'update' erforderlich"}))
            sys.exit(1)
        if not data:
            print(json.dumps({"success": False, "error": "--data ist bei 'update' erforderlich"}))
            sys.exit(1)
        result = update(args.obj_type, args.obj_id, data)

    elif args.action == "delete":
        if not args.obj_id:
            print(json.dumps({"success": False, "error": "--id ist bei 'delete' erforderlich"}))
            sys.exit(1)
        result = delete(args.obj_type, args.obj_id)

    output(result, args.format, args.obj_type)


if __name__ == "__main__":
    main()
