# Assistant Bridge

Python-Script als Schnittstelle zwischen **OpenClaw** und der **MariaDB-Datenbank** (via FastAPI auf YunoHost).

OpenClaw ruft dieses Script als Subprocess auf. Das Script sendet HTTPS-Requests an die FastAPI und gibt das Ergebnis als JSON oder lesbaren Text zurück.

---

## Installation

```bash
cd /opt/assistant-bridge
python3 -m venv venv
venv/bin/pip install -r requirements.txt
cp .env.example .env
```

### .env befüllen

```env
MIDDLEWARE_URL=https://api.yourdomain.tld
SYNC_TOKEN=<Wert aus SYNC_SERVICE_TOKEN in der Middleware .env>
```

---

## Aufruf durch OpenClaw

```
/opt/assistant-bridge/venv/bin/python /opt/assistant-bridge/bridge.py \
  --action <aktion> \
  --type <typ> \
  [--data '<json>'] \
  [--filter '<json>'] \
  [--id <uuid>] \
  [--format json|text]
```

| Parameter  | Pflicht | Beschreibung |
|------------|---------|--------------|
| `--action` | ✓ | `write`, `read`, `update`, `delete` |
| `--type`   | ✓ | `todo`, `event`, `idea`, `shopping_item`, `reminder` |
| `--data`   | bei write/update | JSON-String mit Feldern |
| `--filter` | nein | JSON-String mit Filterfeldern für read |
| `--id`     | bei update/delete | UUID des Eintrags |
| `--format` | nein | `json` (Standard) oder `text` (für Sprachantworten) |

**Exit-Code:** `0` = Erfolg, `1` = Fehler

---

## Aktionen & Beispiele

### write – Neuen Eintrag anlegen

#### Neues Todo
```bash
python bridge.py --action write --type todo \
  --data '{"title": "Zahnarzt anrufen", "due_date": "2026-04-10T00:00:00", "priority": 1}'
```
Felder:
- `title` (Pflicht): Bezeichnung
- `description`: Zusatzinfo
- `due_date`: ISO-Datetime z.B. `"2026-04-10T00:00:00"`
- `priority`: `1` = hoch, `2` = mittel (Standard), `3` = niedrig

#### Neuer Termin
```bash
python bridge.py --action write --type event \
  --data '{"title": "Meeting mit Max", "start_time": "2026-04-05T14:00:00", "end_time": "2026-04-05T15:00:00", "location": "Büro"}'
```
Felder:
- `title` (Pflicht)
- `start_time` (Pflicht): ISO-Datetime
- `end_time`: ISO-Datetime
- `location`: Ort
- `description`: Beschreibung
- `reminder_offset`: Erinnerung X Minuten vorher (z.B. `30`)

#### Neue Idee
```bash
python bridge.py --action write --type idea \
  --data '{"title": "Neue App-Idee", "content": "Eine App die...", "source": "audio"}'
```
Felder:
- `title` (Pflicht)
- `content`: Ausführliche Beschreibung
- `source`: `telegram` (Standard), `audio`, `manual`
- `tags`: JSON-Array z.B. `["app", "idee"]`

#### Einkaufsartikel
```bash
python bridge.py --action write --type shopping_item \
  --data '{"title": "Milch", "quantity": 2, "unit": "l", "category": "Getränke"}'
```
Felder:
- `title` (Pflicht)
- `quantity`: Menge (Zahl)
- `unit`: Einheit z.B. `"l"`, `"kg"`, `"Stück"`
- `category`: Kategorie für Gruppierung
- `store_name`: Laden
- `price`: Preis

#### Erinnerung
```bash
python bridge.py --action write --type reminder \
  --data '{"type": "todo", "remind_at": "2026-04-10T09:00:00", "channel": "telegram"}'
```
Felder:
- `type` (Pflicht): Typ der Erinnerung
- `remind_at` (Pflicht): ISO-Datetime
- `target_ref`: UUID des verknüpften Objekts
- `channel`: `telegram` (Standard)

---

### read – Einträge lesen

Ohne `--filter`: Standardfilter werden angewendet (offene Todos, aktive Ideen, etc.)
Mit `--filter '{}'`: Alle Einträge ohne Filter

#### Alle offenen Todos (lesbarer Text)
```bash
python bridge.py --action read --type todo --format text
```
Ausgabe:
```
3 offene Todos:
1. Zahnarzt anrufen, fällig: 10.04.2026 00:00, Priorität: hoch
2. Einkaufen gehen, Priorität: mittel
3. Auto zum TÜV, fällig: 15.04.2026 00:00, Priorität: hoch
```

#### Heutige Termine
```bash
python bridge.py --action read --type event --filter '{"date": "today"}' --format text
```

#### Einkaufsliste (nicht abgehakt)
```bash
python bridge.py --action read --type shopping_item --format text
```

#### Aktive Ideen
```bash
python bridge.py --action read --type idea --format text
```

#### Alle Todos (auch erledigte)
```bash
python bridge.py --action read --type todo --filter '{}' --format text
```

#### JSON-Antwort (für Weiterverarbeitung)
```bash
python bridge.py --action read --type todo
```
Antwort:
```json
{
  "success": true,
  "count": 2,
  "items": [
    {"id": "...", "title": "Zahnarzt anrufen", "priority": 1, "completed": false, ...},
    {"id": "...", "title": "Einkaufen", "priority": 2, "completed": false, ...}
  ]
}
```

#### Verfügbare Filter je Typ

| Typ | Filter | Werte |
|-----|--------|-------|
| `todo` | `completed` | `true` / `false` |
| `todo` | `priority` | `1`, `2`, `3` |
| `todo` | `due_today` | `true` |
| `event` | `date` | `today` |
| `event` | `upcoming` | `true` |
| `idea` | `status` | `active` / `archived` |
| `shopping_item` | `checked` | `true` / `false` |
| `reminder` | `sent` | `true` / `false` |

---

### update – Eintrag aktualisieren

ID bekommt man aus der JSON-Antwort eines `read`-Aufrufs.

#### Todo abhaken
```bash
python bridge.py --action update --type todo \
  --id "a1b2c3d4-5678-..." --data '{"completed": true}'
```

#### Priorität ändern
```bash
python bridge.py --action update --type todo \
  --id "..." --data '{"priority": 1}'
```

#### Fälligkeitsdatum setzen
```bash
python bridge.py --action update --type todo \
  --id "..." --data '{"due_date": "2026-04-15T00:00:00"}'
```

#### Idee archivieren
```bash
python bridge.py --action update --type idea \
  --id "..." --data '{"status": "archived"}'
```

#### Einkaufsartikel abhaken
```bash
python bridge.py --action update --type shopping_item \
  --id "..." --data '{"checked": true}'
```

---

### delete – Eintrag löschen

```bash
python bridge.py --action delete --type todo --id "a1b2c3d4-..."
```

---

## Fehlerbehandlung

Bei Fehlern gibt das Script einen JSON-Fehler aus und beendet sich mit Exit-Code `1`:
```json
{"success": false, "error": "API nicht erreichbar"}
```

Mit `--format text`:
```
Fehler: API nicht erreichbar
```

Mögliche Fehler:
- `MIDDLEWARE_URL ist nicht gesetzt` → .env prüfen
- `SYNC_TOKEN ist nicht gesetzt` → .env prüfen
- `HTTP-Fehler 401` → SYNC_TOKEN stimmt nicht mit Middleware überein
- `Timeout` → YunoHost nicht erreichbar oder Netzwerkproblem
- `Unbekannter Typ` → falscher `--type` Wert

---

## Dateistruktur

```
assistant-bridge/
├── bridge.py          ← Einstiegspunkt, von OpenClaw aufgerufen
├── api_client.py      ← HTTPS-Client zur FastAPI
├── config.py          ← Konfiguration aus .env
├── formatter.py       ← Textformatierung für OpenClaw
├── logger.py          ← Logging
├── actions/
│   ├── write.py       ← POST /api/{typ}
│   ├── read.py        ← GET /api/{typ}
│   └── update.py      ← PATCH/DELETE /api/{typ}/{id}
├── .env               ← Konfiguration (nicht in Git)
├── .env.example       ← Vorlage
├── requirements.txt
└── README.md
```
