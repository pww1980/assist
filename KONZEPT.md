# Konzept: Persönlicher Assistent – Architektur & Umsetzungsplan

## 1. Überblick & Server-Aufteilung

```
┌──────────────────────────────────────┐        ┌──────────────────────────────────┐
│         Proxmox VPS                  │        │           YunoHost               │
│                                      │        │                                  │
│  [Telegram]                          │  HTTPS │  ┌────────────────────────────┐  │
│      ↓                               │ ──────►│  │  FastAPI Middleware         │  │
│  [OpenClaw]  ← vorhandener Assistent │        │  │  (REST + WebSocket)         │  │
│      ↓  (lokale Übergabe)            │◄───────│  └──────────┬─────────────────┘  │
│  [Python Sync Service]               │        │             │ SQL                │  │
│      │  POST /ingest (HTTPS)         │        │  ┌──────────▼─────────────────┐  │
│      └──────────────────────────────►│        │  │  MariaDB                   │  │
│                                      │        │  └──────────┬─────────────────┘  │
└──────────────────────────────────────┘        │             │                    │
                                                │  ┌──────────▼─────────────────┐  │
                                                │  │  Next.js Dashboard          │  │
                                                │  │  (mobiloptimiert)           │  │
                                                │  └────────────────────────────┘  │
                                                │  nginx (Reverse Proxy + SSL)     │
                                                └──────────────────────────────────┘
                                                          ↕ Plugin-Routing
                                              [Todoist / Google Calendar / ...]
```

**Ablauf:**
1. Telegram-Nachricht trifft bei **OpenClaw** ein (bereits vorhanden, wird nicht geändert)
2. OpenClaw versteht den Inhalt und übergibt strukturierte Daten lokal an den **Python Sync Service**
3. Python sendet die Daten per HTTPS an die **FastAPI Middleware auf YunoHost**
4. FastAPI schreibt in **MariaDB** (lokal auf YunoHost)
5. Das **Next.js Dashboard** (auf YunoHost) zeigt die Daten in Echtzeit an
6. Statusänderungen im Dashboard fließen zurück via FastAPI → Python holt sie per Polling ab

**OpenClaw wird nicht verändert.** Nur der Python Sync Service wird neu gebaut.

---

## 2. Technologie-Entscheidungen

| Komponente              | Technologie                     | Begründung                                              |
|-------------------------|---------------------------------|---------------------------------------------------------|
| Datenbank               | MariaDB                         | YunoHost hat MariaDB bereits eingebaut                  |
| Middleware/API          | Python (FastAPI)                | async, REST + WebSocket in einem, läuft auf YunoHost    |
| Echtzeit (Dashboard)    | WebSockets (via FastAPI)        | bidirektional, kein Seiten-Reload                       |
| Web-Dashboard           | Next.js (React) + Tailwind CSS  | mobiloptimiert, modernes UI, auf YunoHost               |
| Authentifizierung       | JWT (Access + Refresh Token)    | stateless, Einzelnutzer, sicher                         |
| Python Sync Service     | Python (httpx + SQLAlchemy)     | auf Proxmox VPS, sendet Daten per HTTPS an FastAPI      |
| OpenClaw → Python       | HTTP POST auf localhost          | lokale Übergabe auf Proxmox, kein Netzwerk-Exposure     |
| Python → FastAPI        | HTTPS + Bearer Token            | öffentlich erreichbar, gesichert                        |
| Sync-Strategie          | **Polling** (30 Sek.)           | Proxmox muss nicht öffentlich erreichbar sein           |
| Plugin-System           | abstrakte Basisklasse Python    | einheitliche Schnittstelle für Drittanbieter            |

### Warum Polling statt Webhooks
Der Python Sync Service auf dem Proxmox VPS muss nicht von außen erreichbar sein.
Er fragt aktiv alle 30 Sekunden bei der FastAPI auf YunoHost nach Änderungen.
Einfacher, robuster, keine Firewall- oder Port-Forwarding-Anforderungen.

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
├── sync-backend/                # Python Sync Service → deployed auf Proxmox VPS
│   ├── sync/
│   │   ├── main.py              # Einstieg + Polling-Scheduler
│   │   ├── receiver.py          # /ingest-Endpoint (empfängt von OpenClaw)
│   │   ├── db.py                # lokale SQLite-Pufferdatenbank
│   │   ├── api_client.py        # HTTPS-Client zur FastAPI auf YunoHost
│   │   └── logger.py
│   ├── requirements.txt
│   └── .env.example
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

## 7. OpenClaw → Python Sync Service (lokal auf Proxmox)

OpenClaw übergibt strukturierte Daten lokal per HTTP (kein Netzwerk-Exposure).

```
POST http://localhost:8001/ingest
Authorization: Bearer <lokaler API-Key aus .env>
Content-Type: application/json
```

Payload-Beispiele:
```json
{ "type": "todo",          "data": { "title": "Zahnarzt anrufen", "due_date": "2026-04-10" } }
{ "type": "idea",          "data": { "title": "App-Idee", "content": "...", "source": "audio" } }
{ "type": "event",         "data": { "title": "Meeting", "start_time": "2026-04-05T14:00:00Z" } }
{ "type": "shopping_item", "data": { "title": "Milch", "quantity": 2, "unit": "l" } }
{ "type": "reminder",      "data": { "target_ref": "<uuid>", "remind_at": "...", "channel": "telegram" } }
```

Python puffert eingehende Daten in lokaler SQLite und sendet sie anschließend
per HTTPS an die FastAPI auf YunoHost.

---

## 8. Sync-Strategie (Polling, Proxmox → YunoHost)

```
Python Sync Service (Proxmox)        FastAPI (YunoHost)
           │                               │
           │── POST /api/todos ───────────►│  neue Daten pushen (HTTPS)
           │                               │
           │── GET /api/changes?since= ───►│  Änderungen abholen (alle 30 Sek.)
           │◄── [{ id, type, data, ... }] ─│
           │                               │
           │  lokale SQLite aktualisieren  │
```

- `last_sync_at`-Timestamp wird lokal in SQLite gespeichert
- Bei Verbindungsfehler: exponential backoff (5s → 10s → 20s → max 5 Min)
- SQLite puffert Daten bei Offline-Phasen, sendet nach Wiederverbindung nach

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

### Proxmox VPS (Python Sync Service)

**systemd: Python Sync** (`/etc/systemd/system/assistant-sync.service`)
```ini
[Unit]
Description=Assistant Python Sync Service
After=network.target

[Service]
User=openclaw                     # oder passender User
WorkingDirectory=/opt/assistant-sync
EnvironmentFile=/opt/assistant-sync/.env
ExecStart=/opt/assistant-sync/venv/bin/python -m sync.main
Restart=always

[Install]
WantedBy=multi-user.target
```

**.env auf Proxmox:**
```env
LOCAL_API_KEY=<zufälliger Key, den OpenClaw beim POST mitschickt>
MIDDLEWARE_URL=https://assistant.yourdomain.tld/api
MIDDLEWARE_TOKEN=<JWT sync-service Token>
SQLITE_PATH=/opt/assistant-sync/buffer.db
POLL_INTERVAL=30
```

---

## 13. Umsetzungsplan (Phasen)

### Phase 1 – YunoHost: Middleware + Dashboard
1. MariaDB-Datenbank anlegen + Alembic-Schema einrichten
2. FastAPI aufbauen: Auth (JWT), CRUD alle Objekte, WebSocket, `/changes`-Endpoint
3. Next.js-Dashboard: Login, Übersicht, alle Listenansichten, WebSocket
4. systemd-Units + nginx-Snippet einrichten, HTTPS testen

### Phase 2 – Proxmox: Python Sync Service
1. `/ingest`-Endpoint aufbauen (OpenClaw übergibt hier)
2. SQLite-Puffer für Offline-Phasen
3. HTTPS-Client zur FastAPI auf YunoHost (mit exponential backoff)
4. Polling-Scheduler (30 Sek.) für bidirektionalen Sync
5. systemd-Unit auf Proxmox einrichten

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
| Python Sync Service                 | auf Proxmox VPS, neben OpenClaw                         |
| OpenClaw → Python Kommunikation     | HTTP POST localhost:8001 (lokal, kein Netzwerk)         |
| Python → FastAPI Kommunikation      | HTTPS (öffentlich, JWT-gesichert)                       |
| Webhook vs. Polling                 | **Polling** (30 Sek.) – Proxmox muss nicht erreichbar sein |
| Konfliktlösung                      | Server-wins + Audit-Log                                 |
| Anzahl Nutzer                       | **Einzelnutzer** – kein Multi-Tenancy                   |

---

## 15. Fazit

```
OpenClaw (Proxmox)   →   Python Sync Service (Proxmox)
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
