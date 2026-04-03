# Konzept: Persönlicher Assistent – Architektur & Umsetzungsplan

## 1. Überblick & Server-Aufteilung

```
┌──────────────────────────────────────────────┐     ┌──────────────────────────────────┐
│               Proxmox VPS                    │     │           YunoHost               │
│                                              │     │                                  │
│  [Telegram]                                  │     │  ┌────────────────────────────┐  │
│      ↓                                       │     │  │  FastAPI Middleware         │  │
│  [OpenClaw]  ← vorhandener Assistent         │     │  │  (REST + WebSocket)         │  │
│      ↓  ruft Python direkt auf               │     │  └──────────┬─────────────────┘  │
│  [Python Script / Modul]                     │     │             │ SQL                │  │
│      │                                       │     │  ┌──────────▼─────────────────┐  │
│      │  HTTPS Schreiben: POST /api/todos     │─────►  │  MariaDB                   │  │
│      │  HTTPS Lesen:     GET  /api/todos     │◄────│  └──────────┬─────────────────┘  │
│      │  → Antwort zurück an OpenClaw         │     │             │                    │
│                                              │     │  ┌──────────▼─────────────────┐  │
└──────────────────────────────────────────────┘     │  │  Next.js Dashboard          │  │
                                                     │  │  (mobiloptimiert, Echtzeit) │  │
                                                     │  └────────────────────────────┘  │
                                                     │  nginx (Reverse Proxy + SSL)     │
                                                     └──────────────────────────────────┘
                                                               ↕ Plugin-Routing
                                                   [Todoist / Google Calendar / ...]
```

**Ablauf Schreiben** (z. B. neues Todo per Sprachnachricht):
1. Telegram-Nachricht → **OpenClaw** erkennt Typ und Inhalt
2. OpenClaw ruft das **Python Script** direkt auf (mit strukturierten Daten)
3. Python sendet per HTTPS an **FastAPI** auf YunoHost: `POST /api/todos`
4. FastAPI schreibt in **MariaDB** + sendet WebSocket-Update ans Dashboard
5. Dashboard zeigt das neue Todo sofort an

**Ablauf Lesen** (z. B. „Was sind meine aktuellen Todos?"):
1. OpenClaw ruft das **Python Script** mit Lesebefehl auf
2. Python sendet per HTTPS an **FastAPI**: `GET /api/todos?completed=false`
3. FastAPI liest aus **MariaDB**, gibt JSON zurück
4. Python verarbeitet die Antwort und gibt sie formatiert an **OpenClaw** zurück
5. OpenClaw antwortet dem Nutzer mit den Daten

**Vorteile dieser Architektur:**
- Kein offener MariaDB-Port (3306) nötig – alles läuft über HTTPS
- FastAPI ist die einzige Schnittstelle zur Datenbank (für Python UND Dashboard)
- WebSocket-Updates ans Dashboard funktionieren automatisch bei jedem Schreibvorgang
- Python-Script gut dokumentierbar: klare Eingaben, klare HTTP-Calls, klare Ausgaben

**OpenClaw wird nicht verändert.** Nur das Python Script wird neu gebaut.

---

## 2. Technologie-Entscheidungen

| Komponente              | Technologie                     | Begründung                                              |
|-------------------------|---------------------------------|---------------------------------------------------------|
| Datenbank               | MariaDB                         | YunoHost hat MariaDB bereits eingebaut                  |
| Middleware/API          | Python (FastAPI)                | async, REST + WebSocket in einem, läuft auf YunoHost    |
| Echtzeit (Dashboard)    | WebSockets (via FastAPI)        | bidirektional, kein Seiten-Reload                       |
| Web-Dashboard           | Next.js (React) + Tailwind CSS  | mobiloptimiert, modernes UI, auf YunoHost               |
| Authentifizierung       | JWT (Access + Refresh Token)    | stateless, Einzelnutzer, sicher                         |
| Python Script           | Python (httpx)                  | auf Proxmox, von OpenClaw aufgerufen, liest + schreibt  |
| OpenClaw → Python       | direkter Aufruf (Subprocess)    | OpenClaw ruft Python mit Daten auf, bekommt Antwort     |
| Python → FastAPI        | HTTPS + Bearer Token            | lesen (GET) und schreiben (POST/PATCH) via REST          |
| Sync-Strategie          | **On-Demand** (kein Polling)    | Python wird von OpenClaw bei Bedarf aufgerufen          |
| Plugin-System           | abstrakte Basisklasse Python    | einheitliche Schnittstelle für Drittanbieter            |

### Warum FastAPI statt direktem Datenbankzugriff
Python verbindet sich nicht direkt mit MariaDB (kein offener Port 3306 nötig).
Stattdessen nutzt Python die FastAPI-Endpunkte auf YunoHost per HTTPS – sowohl
zum Schreiben als auch zum Lesen. Das hat folgende Vorteile:
- Kein Datenbankport muss nach außen geöffnet werden
- FastAPI ist automatisch die Single Source of Truth
- Schreibvorgänge triggern automatisch WebSocket-Updates ans Dashboard
- Die REST-API ist selbstdokumentierend (Swagger UI unter `/api/docs`)

### Kein Polling – On-Demand
Python wird von OpenClaw bei Bedarf aufgerufen (kein dauerhaft laufender Dienst
auf Proxmox nötig). Für Schreibvorgänge wird Python einmalig mit Daten aufgerufen.
Für Lesevorgänge wird Python mit einem Lesebefehl aufgerufen und gibt das Ergebnis
direkt zurück an OpenClaw.

### Einzelnutzer-System
Kein Multi-Tenancy. Ein fester Admin-Account. JWT-gesichert.

---

## 3. Projektstruktur

```
/
├── middleware/                  # FastAPI-Backend → deployed auf YunoHost
│   ├── app/
│   │   ├── main.py              # App-Einstieg, Router-Registrierung
│   │   ├── config.py            # Umgebungsvariablen (.env)
│   │   ├── database.py          # MariaDB-Verbindung via SQLAlchemy
│   │   ├── models/              # SQLAlchemy-Modelle
│   │   │   ├── todo.py
│   │   │   ├── event.py
│   │   │   ├── idea.py
│   │   │   ├── shopping_item.py
│   │   │   ├── reminder.py
│   │   │   ├── integration.py
│   │   │   ├── sync_job.py
│   │   │   └── audit_log.py
│   │   ├── schemas/             # Pydantic-Schemas (Request/Response)
│   │   ├── routers/             # API-Endpunkte
│   │   │   ├── auth.py
│   │   │   ├── todos.py
│   │   │   ├── events.py
│   │   │   ├── ideas.py
│   │   │   ├── shopping.py
│   │   │   ├── reminders.py
│   │   │   └── plugins.py
│   │   ├── plugins/             # Plugin-System
│   │   │   ├── base.py          # AbstractPlugin-Klasse
│   │   │   ├── todoist.py
│   │   │   └── google_calendar.py
│   │   ├── websocket/
│   │   │   └── manager.py       # WebSocket-Broadcasting
│   │   └── auth/
│   │       └── jwt.py
│   ├── alembic/                 # DB-Migrationen
│   ├── requirements.txt
│   └── .env.example
│
├── assistant-bridge/            # Python Script → auf Proxmox VPS, von OpenClaw aufgerufen
│   ├── bridge.py                # Einstiegspunkt (CLI), von OpenClaw direkt aufgerufen
│   ├── actions/
│   │   ├── write.py             # Schreiben: POST /api/todos, /api/events, etc.
│   │   └── read.py              # Lesen: GET /api/todos, /api/reminders, etc.
│   ├── api_client.py            # HTTPS-Client zur FastAPI (Auth, Retry, Fehlerbehandlung)
│   ├── formatter.py             # Antwort für OpenClaw aufbereiten (Text/JSON)
│   ├── config.py                # Konfiguration aus .env laden
│   ├── logger.py                # Logging
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md                # Vollständige Dokumentation der Schnittstelle
│
├── dashboard/                   # Next.js Dashboard → deployed auf YunoHost
│   ├── app/
│   │   ├── page.tsx             # Startseite / Übersicht
│   │   ├── login/page.tsx
│   │   ├── todos/page.tsx
│   │   ├── events/page.tsx
│   │   ├── ideas/page.tsx
│   │   ├── shopping/page.tsx
│   │   └── reminders/page.tsx
│   ├── components/
│   │   ├── TodoCard.tsx
│   │   ├── EventCard.tsx
│   │   ├── ShoppingList.tsx
│   │   └── RealTimeProvider.tsx  # WebSocket-Kontext
│   ├── lib/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── tailwind.config.ts
│   └── package.json
```

---

## 4. Datenfluss im Detail

### Neuer Eintrag (z. B. Todo per Sprachnachricht)
```
Nutzer → Telegram
  → OpenClaw (transkribiert Audio, erkennt "neues Todo")
  → POST http://localhost:8001/ingest  (lokal auf Proxmox)
  → Python Sync Service nimmt entgegen, puffert in SQLite
  → POST https://yunohost.domain/api/todos  (HTTPS)
  → FastAPI schreibt in MariaDB
  → FastAPI broadcastet via WebSocket an offene Dashboard-Verbindungen
  → Dashboard zeigt neues Todo sofort an
```

### Änderung im Dashboard (z. B. Todo abhaken)
```
Nutzer → Dashboard (PATCH /api/todos/{id} → completed=true)
  → FastAPI aktualisiert MariaDB
  → FastAPI broadcastet via WebSocket (andere offene Tabs)
  → Python Sync Service pollt GET /api/changes?since=<ts>
  → Python erhält Änderung, aktualisiert lokale SQLite
  → (optional: OpenClaw kann lokalen Status lesen)
```

---

## 5. Datenbank-Schema (MariaDB auf YunoHost)

> UUIDs werden im Python-Code generiert (`uuid.uuid4()`).
> Tags als JSON-Feld (MariaDB kennt keine Arrays).

### ideas
```sql
CREATE TABLE ideas (
    id          CHAR(36) PRIMARY KEY,
    title       TEXT NOT NULL,
    content     TEXT,
    tags        JSON,
    source      VARCHAR(20) DEFAULT 'telegram',  -- telegram | manual | audio
    status      VARCHAR(20) DEFAULT 'active',    -- active | archived
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### todos
```sql
CREATE TABLE todos (
    id                CHAR(36) PRIMARY KEY,
    title             TEXT NOT NULL,
    description       TEXT,
    due_date          DATETIME,
    priority          TINYINT DEFAULT 2,           -- 1=hoch, 2=mittel, 3=niedrig
    completed         BOOLEAN DEFAULT FALSE,
    external_provider VARCHAR(50),                 -- todoist | NULL
    external_id       VARCHAR(100),
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### events
```sql
CREATE TABLE events (
    id                CHAR(36) PRIMARY KEY,
    title             TEXT NOT NULL,
    start_time        DATETIME NOT NULL,
    end_time          DATETIME,
    location          TEXT,
    description       TEXT,
    reminder_offset   INT,                         -- Minuten vor dem Termin
    external_provider VARCHAR(50),                 -- google_calendar | NULL
    external_id       VARCHAR(100),
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### shopping_items
```sql
CREATE TABLE shopping_items (
    id           CHAR(36) PRIMARY KEY,
    title        TEXT NOT NULL,
    category     VARCHAR(100),
    quantity     DECIMAL(10,2),
    unit         VARCHAR(30),
    checked      BOOLEAN DEFAULT FALSE,
    store_name   TEXT,
    price        DECIMAL(10,2),
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### reminders
```sql
CREATE TABLE reminders (
    id          CHAR(36) PRIMARY KEY,
    type        VARCHAR(50) NOT NULL,
    target_ref  CHAR(36),
    remind_at   DATETIME NOT NULL,
    channel     VARCHAR(30) DEFAULT 'telegram',
    sent        BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### integrations
```sql
CREATE TABLE integrations (
    id             CHAR(36) PRIMARY KEY,
    provider_name  VARCHAR(50) UNIQUE NOT NULL,
    enabled        BOOLEAN DEFAULT FALSE,
    config_json    JSON,
    last_sync_at   DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### sync_jobs
```sql
CREATE TABLE sync_jobs (
    id             CHAR(36) PRIMARY KEY,
    provider_name  VARCHAR(50) NOT NULL,
    object_type    VARCHAR(50) NOT NULL,
    object_id      CHAR(36) NOT NULL,
    action         VARCHAR(20) NOT NULL,           -- create | update | delete
    status         VARCHAR(20) DEFAULT 'pending',  -- pending | success | failed
    error_message  TEXT,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### audit_log
```sql
CREATE TABLE audit_log (
    id           CHAR(36) PRIMARY KEY,
    actor        VARCHAR(100),
    action       VARCHAR(50) NOT NULL,
    entity_type  VARCHAR(50),
    entity_id    CHAR(36),
    payload_json JSON,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### SQLAlchemy-Verbindung (FastAPI auf YunoHost → lokale MariaDB)
```python
# DATABASE_URL in .env (auf YunoHost, localhost!)
DATABASE_URL=mysql+pymysql://assistant:<password>@localhost:3306/assistant_db
```

---

## 6. API-Design (FastAPI auf YunoHost)

### Authentifizierung
```
POST /api/auth/login        → { access_token, refresh_token }
POST /api/auth/refresh      → { access_token }
POST /api/auth/logout
```

### Ressourcen (alle via Bearer Token gesichert)
```
GET    /api/todos
POST   /api/todos
PATCH  /api/todos/{id}
DELETE /api/todos/{id}

GET    /api/events
POST   /api/events
PATCH  /api/events/{id}
DELETE /api/events/{id}

GET    /api/ideas
POST   /api/ideas
PATCH  /api/ideas/{id}
DELETE /api/ideas/{id}

GET    /api/shopping
POST   /api/shopping
PATCH  /api/shopping/{id}
DELETE /api/shopping/{id}

GET    /api/reminders
POST   /api/reminders
PATCH  /api/reminders/{id}

GET    /api/plugins
PATCH  /api/plugins/{provider_name}
GET    /api/sync-jobs

GET    /api/changes?since=<iso-timestamp>   ← für Python Sync Service (Polling)
```

### WebSocket (Echtzeit – Dashboard)
```
WSS /ws?token=<access_token>
```
Events:
```json
{ "event": "todo.created",     "data": { ...todo } }
{ "event": "todo.updated",     "data": { ...todo } }
{ "event": "shopping.checked", "data": { ...item } }
{ "event": "event.created",    "data": { ...event } }
```

---

## 7. Python-Schnittstelle (Bridge) – vollständige Dokumentation

Das Python Script `bridge.py` wird von OpenClaw direkt als Subprocess aufgerufen.
Es ist das einzige Bindeglied zwischen OpenClaw und der Datenbank (via FastAPI).

### Aufruf durch OpenClaw

```bash
python bridge.py --action <aktion> --type <typ> [--data '<json>'] [--filter '<json>']
```

| Parameter  | Beschreibung                                         |
|------------|------------------------------------------------------|
| `--action` | `write` oder `read`                                  |
| `--type`   | Objekttyp: `todo`, `event`, `idea`, `shopping_item`, `reminder` |
| `--data`   | JSON-String mit den Daten (nur bei `write`)          |
| `--filter` | JSON-String mit Filterkriterien (nur bei `read`)     |

### Schreiben (write)

**Neues Todo:**
```bash
python bridge.py --action write --type todo \
  --data '{"title": "Zahnarzt anrufen", "due_date": "2026-04-10", "priority": 1}'
```

**Neue Idee (aus Sprachnachricht):**
```bash
python bridge.py --action write --type idea \
  --data '{"title": "App-Idee", "content": "...", "source": "audio"}'
```

**Neuer Termin:**
```bash
python bridge.py --action write --type event \
  --data '{"title": "Meeting mit Max", "start_time": "2026-04-05T14:00:00"}'
```

**Einkaufsartikel:**
```bash
python bridge.py --action write --type shopping_item \
  --data '{"title": "Milch", "quantity": 2, "unit": "l"}'
```

**Erinnerung:**
```bash
python bridge.py --action write --type reminder \
  --data '{"type": "todo", "remind_at": "2026-04-05T09:00:00", "channel": "telegram"}'
```

**Rückgabe (stdout, JSON):**
```json
{ "success": true, "id": "a1b2c3d4-...", "message": "Todo erstellt" }
```

---

### Lesen (read)

**Alle offenen Todos:**
```bash
python bridge.py --action read --type todo \
  --filter '{"completed": false}'
```

**Heutige Termine:**
```bash
python bridge.py --action read --type event \
  --filter '{"date": "today"}'
```

**Einkaufsliste (nicht abgehakt):**
```bash
python bridge.py --action read --type shopping_item \
  --filter '{"checked": false}'
```

**Alle Ideen:**
```bash
python bridge.py --action read --type idea \
  --filter '{}'
```

**Rückgabe (stdout, JSON):**
```json
{
  "success": true,
  "count": 3,
  "items": [
    { "id": "...", "title": "Zahnarzt anrufen", "due_date": "2026-04-10", "priority": 1, "completed": false },
    { "id": "...", "title": "Einkaufen", "due_date": null, "priority": 2, "completed": false },
    { "id": "...", "title": "Auto zum TÜV", "due_date": "2026-04-15", "priority": 1, "completed": false }
  ]
}
```

**Zusätzlich als lesbarer Text** (über `--format text`):
```bash
python bridge.py --action read --type todo --filter '{"completed": false}' --format text
```
Ausgabe:
```
3 offene Todos:
1. Zahnarzt anrufen (fällig: 10.04.2026, Priorität: hoch)
2. Einkaufen (keine Fälligkeit)
3. Auto zum TÜV (fällig: 15.04.2026, Priorität: hoch)
```

---

### Aktualisieren (update)

**Todo abhaken:**
```bash
python bridge.py --action update --type todo \
  --id "a1b2c3d4-..." --data '{"completed": true}'
```

**Rückgabe:**
```json
{ "success": true, "id": "a1b2c3d4-...", "message": "Todo aktualisiert" }
```

---

### Fehlerbehandlung

Bei Verbindungsfehlern oder API-Fehler gibt Python einen klaren Fehler aus:
```json
{ "success": false, "error": "API nicht erreichbar", "code": 503 }
```
Exit-Code ist `1` bei Fehler, `0` bei Erfolg. OpenClaw kann damit umgehen.

---

### Konfiguration (.env auf Proxmox)

```env
MIDDLEWARE_URL=https://assistant.yourdomain.tld
MIDDLEWARE_TOKEN=<JWT-Token mit Rolle sync-service>
LOG_LEVEL=INFO
LOG_FILE=/var/log/assistant-bridge.log
```

Der JWT-Token wird einmalig über das Dashboard generiert und in der `.env`
gespeichert. Er muss bei Ablauf erneuert werden (oder Refresh-Token-Logik).

---

## 8. Datenbankzugriff (Python → FastAPI → MariaDB)

```
OpenClaw (Proxmox)      Python bridge.py         FastAPI (YunoHost)      MariaDB
      │                        │                        │                    │
      │── write todo ─────────►│                        │                    │
      │                        │── POST /api/todos ─────►│                    │
      │                        │                        │── INSERT ──────────►│
      │                        │                        │◄── OK ─────────────│
      │                        │◄── { id, success } ───│                    │
      │◄── Bestätigung ────────│                        │                    │
      │                        │                        │                    │
      │── was sind meine Todos►│                        │                    │
      │                        │── GET /api/todos ──────►│                    │
      │                        │                        │── SELECT ──────────►│
      │                        │                        │◄── [ ... ] ────────│
      │                        │◄── JSON Liste ─────────│                    │
      │◄── formatierter Text ──│                        │                    │
```

- Kein offener Port 3306 nötig – alles über HTTPS (Port 443)
- FastAPI ist Single Point of Truth für alle Datenzugriffe
- Schreibvorgänge triggern automatisch WebSocket-Updates ans Dashboard

---

## 9. Plugin-System

```python
# middleware/app/plugins/base.py
from abc import ABC, abstractmethod

class AbstractPlugin(ABC):
    provider_name: str

    @abstractmethod
    async def push_todo(self, todo: dict) -> str: ...

    @abstractmethod
    async def update_todo(self, external_id: str, todo: dict) -> None: ...

    @abstractmethod
    async def delete_todo(self, external_id: str) -> None: ...

    @abstractmethod
    async def push_event(self, event: dict) -> str: ...

    @abstractmethod
    async def update_event(self, external_id: str, event: dict) -> None: ...

    @abstractmethod
    async def delete_event(self, external_id: str) -> None: ...

    @abstractmethod
    async def push_reminder(self, reminder: dict) -> str: ...
```

Neue Plugins implementieren `AbstractPlugin`, registrieren sich in der
Plugin-Registry. API-Keys werden AES-verschlüsselt in `integrations.config_json`
gespeichert und über das Dashboard konfiguriert.

---

## 10. Dashboard – Kernansichten

### Startseite
- Offene Todos (heute + überfällig)
- Heutige Termine (Timeline)
- Einkaufsliste (offene Items)
- Aktive Erinnerungen
- Letzte Sync-Aktivität

### Mobile UX-Prinzipien
- Minimum Touch-Target: 48px
- Swipe-to-complete für Todos und Einkaufsartikel
- Karten-Layout, keine Tabellen
- Bottom Navigation (Übersicht / Todos / Kalender / Mehr)
- Dunkelmodus via `prefers-color-scheme` + manuellem Toggle

### Echtzeit
`RealTimeProvider.tsx` hält eine WSS-Verbindung und aktualisiert den
globalen State ohne Seiten-Reload.

---

## 11. Sicherheit

| Aspekt                         | Maßnahme                                               |
|--------------------------------|--------------------------------------------------------|
| API-Zugang (Dashboard + Sync)  | JWT Bearer Token (15 Min Laufzeit)                     |
| Session-Verlängerung           | Refresh Token (7 Tage, Rotation bei Nutzung)           |
| Passwortschutz Dashboard       | Login-Seite + httpOnly Cookie für Refresh Token        |
| OpenClaw → Python (lokal)      | statischer API-Key, nur auf localhost erreichbar       |
| Python → FastAPI (Netzwerk)    | HTTPS + JWT mit Rolle `sync-service`                   |
| Plugin-Credentials             | AES-verschlüsselt in `integrations.config_json`        |
| HTTPS                          | YunoHost verwaltet Let's Encrypt automatisch           |
| Einzelnutzer                   | kein Multi-Tenancy, ein Admin-Account                  |

---

## 12. Deployment

### YunoHost (Dashboard + FastAPI + MariaDB)

YunoHost bringt mit: nginx, MariaDB, Let's Encrypt SSL, systemd.

**MariaDB einrichten (einmalig):**
```sql
CREATE DATABASE assistant_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'assistant'@'localhost' IDENTIFIED BY '<password>';
GRANT ALL PRIVILEGES ON assistant_db.* TO 'assistant'@'localhost';
FLUSH PRIVILEGES;
```

**systemd: FastAPI** (`/etc/systemd/system/assistant-api.service`)
```ini
[Unit]
Description=Assistant FastAPI
After=network.target mariadb.service

[Service]
User=www-data
WorkingDirectory=/opt/assistant/middleware
EnvironmentFile=/opt/assistant/middleware/.env
ExecStart=/opt/assistant/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**systemd: Next.js** (`/etc/systemd/system/assistant-dashboard.service`)
```ini
[Unit]
Description=Assistant Dashboard
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/assistant/dashboard
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
```

**nginx-Snippet** (`/etc/nginx/conf.d/assistant.conf`):
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /ws {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
}
```

- SSL: von YunoHost automatisch via Let's Encrypt
- DB-Migrationen: `alembic upgrade head`
- YunoHost SSO wird **nicht** genutzt (eigener JWT-Login)

### Proxmox VPS (Python Bridge)

Das Python Script läuft **nicht** als dauerhafter Service – es wird von OpenClaw
bei Bedarf als Subprocess aufgerufen und beendet sich nach der Ausführung.

**Installation:**
```bash
cd /opt/assistant-bridge
python -m venv venv
venv/bin/pip install -r requirements.txt
cp .env.example .env
# .env mit MIDDLEWARE_URL und MIDDLEWARE_TOKEN befüllen
```

**Test (manuell):**
```bash
cd /opt/assistant-bridge
venv/bin/python bridge.py --action read --type todo --filter '{"completed": false}'
```

**OpenClaw ruft Python so auf** (Beispiel-Konfiguration in OpenClaw):
```
/opt/assistant-bridge/venv/bin/python /opt/assistant-bridge/bridge.py --action write --type todo --data '...'
```

---

## 13. Umsetzungsplan (Phasen)

### Phase 1 – YunoHost: Middleware + Dashboard
1. MariaDB-Datenbank anlegen + Alembic-Schema einrichten
2. FastAPI aufbauen: Auth (JWT), CRUD alle Objekte, WebSocket, `/changes`-Endpoint
3. Next.js-Dashboard: Login, Übersicht, alle Listenansichten, WebSocket
4. systemd-Units + nginx-Snippet einrichten, HTTPS testen

### Phase 2 – Proxmox: Python Bridge
1. `bridge.py` CLI-Interface (`--action write/read/update`, `--type`, `--data`, `--filter`)
2. `api_client.py`: HTTPS-Client zur FastAPI (Bearer Token, Retry, Fehlerbehandlung)
3. `actions/write.py`: alle Objekttypen schreiben
4. `actions/read.py`: alle Objekttypen lesen + Filterlogik
5. `formatter.py`: Ausgabe als JSON und als lesbaren Text für OpenClaw
6. Vollständige `README.md` mit Beispielaufrufen für OpenClaw-Integration

### Phase 3 – Plugins
1. Todoist-Plugin
2. Google-Calendar-Plugin
3. Reminder-Dispatcher (Erinnerungen zurück via Telegram/OpenClaw)
4. Plugin-Status + Sync-Log im Dashboard

### Phase 4 – Erweiterungen
1. Volltextsuche (MariaDB `FULLTEXT INDEX`)
2. Filter + Tags im Dashboard
3. Export (CSV / JSON)
4. KI-basierte Klassifikation und Vorschläge
5. Weitere Plugins

---

## 14. Getroffene Entscheidungen

| Frage                               | Entscheidung                                            |
|-------------------------------------|---------------------------------------------------------|
| Datenbank                           | MariaDB auf YunoHost (bereits vorhanden)                |
| Dashboard + API-Server              | YunoHost                                                |
| Assistent                           | OpenClaw (auf Proxmox VPS, bereits vorhanden)           |
| Python Bridge                       | auf Proxmox VPS, neben OpenClaw                         |
| OpenClaw → Python                   | direkter Subprocess-Aufruf (CLI mit Argumenten)         |
| Python → FastAPI                    | HTTPS REST – lesen (GET) + schreiben (POST/PATCH)       |
| Sync-Strategie                      | On-Demand, kein dauerhafter Dienst auf Proxmox          |
| Konfliktlösung                      | Server-wins + Audit-Log                                 |
| Anzahl Nutzer                       | **Einzelnutzer** – kein Multi-Tenancy                   |

---

## 15. Fazit

```
OpenClaw (Proxmox)   →   Python Bridge (Proxmox)
                               │ HTTPS
                         FastAPI + MariaDB (YunoHost)
                               │ WebSocket
                         Next.js Dashboard (YunoHost)
```

- **OpenClaw** bleibt vollständig unangetastet
- **Python Sync Service** ist die einzige neue Komponente auf dem Proxmox VPS
- **YunoHost** übernimmt API, Datenbank, Dashboard und SSL – alles an einem Ort
- **Polling** hält den Sync einfach und stabil ohne Firewall-Anforderungen
- **Modularer Aufbau** erlaubt spätere Erweiterungen ohne Umbau der Struktur
