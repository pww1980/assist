# Konzept: Persönlicher Assistent – Architektur & Umsetzungsplan

## 1. Überblick

Das System besteht aus vier klar getrennten Schichten:

```
[Telegram] → [Assistent (vorhanden)] → [Python-Sync-Service]
                                               ↕ REST/HTTP (Polling)
                                       [Middleware-Server]
                                         (Proxmox VPS / OpenClaw)
                                               ↕ WebSocket
                                       [Web-Dashboard]
                                               ↕ Plugin-Routing
                                   [Todoist / Google Calendar / ...]
```

Der Assistent ist bereits vorhanden und wird **nicht** neu gebaut.
Alle folgenden Komponenten werden neu entwickelt.

---

## 2. Technologie-Entscheidungen

| Komponente         | Technologie                        | Begründung                                           |
|--------------------|------------------------------------|------------------------------------------------------|
| Datenbank          | MariaDB (MySQL)                    | auf VPS bereits verfügbar, gut unterstützt           |
| Middleware/API     | Python (FastAPI)                   | async-fähig, REST + WebSocket in einem               |
| Echtzeit           | WebSockets (via FastAPI)           | bidirektional, kein Polling im Dashboard nötig       |
| Web-Dashboard      | Next.js (React) + Tailwind CSS     | mobiloptimiert, modernes UI                          |
| Authentifizierung  | JWT (Access + Refresh Token)       | stateless, sicher, Session-fähig, Einzelnutzer       |
| Python-Sync        | Python (aiohttp + SQLAlchemy)      | async HTTP + ORM, MariaDB-kompatibel                 |
| API-Kommunikation  | REST (JSON) + Bearer Token         | standardisiert, erweiterbar                          |
| Sync-Strategie     | **Polling** (30 Sek. Intervall)    | Assistent-Server muss nicht öffentlich erreichbar sein|
| Plugin-System      | abstrakte Basisklasse in Python    | einheitliche Schnittstelle für alle Plugins          |
| Server             | Proxmox VPS mit OpenClaw           | vorhandene Infrastruktur                             |

### Warum Polling statt Webhooks
Der Python-Sync-Service läuft lokal auf dem Assistent-Server. Dieser ist
nicht zwingend öffentlich erreichbar – Webhooks würden eine eingehende
Verbindung vom Middleware-Server erfordern. Mit Polling fragt der Sync-Service
aktiv alle 30 Sekunden bei der Middleware nach Änderungen. Einfacher,
robuster, kein Port-Forwarding nötig.

### Einzelnutzer-System
Kein Multi-Tenancy. Kein Rollen- oder Rechtesystem in Phase 1–3.
Ein fester Admin-Account, JWT-gesichert.

---

## 3. Projektstruktur

```
/
├── middleware/                  # FastAPI-Backend (auf Proxmox VPS)
│   ├── app/
│   │   ├── main.py              # App-Einstieg, Router-Registrierung
│   │   ├── config.py            # Umgebungsvariablen
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
│   │   ├── routers/             # API-Endpunkte pro Ressource
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
│   │   ├── websocket/           # Echtzeit-Broadcasting
│   │   │   └── manager.py
│   │   └── auth/                # JWT-Logik
│   │       └── jwt.py
│   ├── alembic/                 # DB-Migrationen
│   ├── requirements.txt
│   └── .env.example
│
├── sync-backend/                # Python-Sync-Service (auf Assistent-Server)
│   ├── sync/
│   │   ├── main.py              # Einstieg, Polling-Scheduler
│   │   ├── receiver.py          # Empfang strukturierter Daten vom Assistenten
│   │   ├── db.py                # lokale SQLite-Pufferdatenbank
│   │   ├── middleware_client.py # HTTP-Client zur Middleware (mit Retry)
│   │   └── logger.py            # Sync-Logging
│   ├── requirements.txt
│   └── .env.example
│
├── dashboard/                   # Next.js Web-Dashboard
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
│   │   ├── api.ts               # Fetch-Client
│   │   └── auth.ts              # Token-Verwaltung
│   ├── tailwind.config.ts
│   └── package.json
│
└── shared/
    └── types/                   # Geteilte Typen/Schemas (optional)
```

---

## 4. Datenbank-Schema (MariaDB / MySQL)

> Hinweis: MariaDB 10.7+ unterstützt `UUID()` als Defaultwert.
> Bei älteren Versionen werden UUIDs im Anwendungscode generiert (Python `uuid.uuid4()`).
> `JSONB` gibt es nicht in MariaDB – wird durch `JSON` ersetzt.
> Arrays (`TEXT[]`) gibt es nicht – Tags werden als `JSON`-Feld gespeichert.

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

### SQLAlchemy-Verbindung (MariaDB)
```python
# DATABASE_URL in .env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/assistant_db
```

---

## 5. API-Design (Middleware)

### Authentifizierung
```
POST /auth/login        → { access_token, refresh_token }
POST /auth/refresh      → { access_token }
POST /auth/logout
```

### Ressourcen (alle via Bearer Token gesichert)
```
GET    /todos           → Liste
POST   /todos           → Neu anlegen
PATCH  /todos/{id}      → Aktualisieren (z. B. completed=true)
DELETE /todos/{id}

GET    /events
POST   /events
PATCH  /events/{id}
DELETE /events/{id}

GET    /ideas
POST   /ideas
PATCH  /ideas/{id}
DELETE /ideas/{id}

GET    /shopping
POST   /shopping
PATCH  /shopping/{id}   → checked=true
DELETE /shopping/{id}

GET    /reminders
POST   /reminders
PATCH  /reminders/{id}

GET    /plugins                  → Plugin-Übersicht + Status
PATCH  /plugins/{provider_name}  → Plugin aktivieren/deaktivieren
GET    /sync-jobs                → Sync-Historie
```

### WebSocket (Echtzeit – Dashboard)
```
WS /ws?token=<access_token>
```
Events vom Server an den Client:
```json
{ "event": "todo.updated",     "data": { ...todo } }
{ "event": "todo.created",     "data": { ...todo } }
{ "event": "event.created",    "data": { ...event } }
{ "event": "shopping.checked", "data": { ...item } }
```

---

## 6. Assistent → Sync-Backend Interface

Der Assistent übergibt strukturierte Daten lokal an den Sync-Service.
Methode: **HTTP POST auf localhost** (einfach, kein Netzwerk-Exposure).

```
POST http://localhost:8001/ingest
Authorization: Bearer <lokaler API-Key>
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

---

## 7. Sync-Strategie (Polling)

```
Sync-Service (lokal)          Middleware-Server (VPS)
      │                               │
      │── POST /ingest ──────────────►│  neue Daten senden
      │                               │
      │── GET /changes?since=<ts> ───►│  Änderungen abholen
      │◄── [ { id, type, data } ] ───│
      │                               │
      │  (lokal aktualisieren)        │
      │                               │
      │  (alle 30 Sek. wiederholen)   │
```

- Der Sync-Service speichert einen `last_sync_at`-Timestamp lokal.
- Die Middleware stellt einen `/changes`-Endpunkt bereit, der alle seit
  `last_sync_at` geänderten Objekte zurückgibt.
- Bei Verbindungsfehlern: exponential backoff (5s, 10s, 20s, max 5 Min).
- Lokale SQLite dient als Puffer bei Offline-Phasen.

---

## 8. Plugin-System

### Abstrakte Basisklasse
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

Jedes neue Plugin implementiert `AbstractPlugin` und registriert sich
in einer zentralen Plugin-Registry. Konfiguration (API-Keys etc.) wird
AES-verschlüsselt in `integrations.config_json` gespeichert.

---

## 9. Dashboard – Kernansichten

### Startseite
- Offene Todos (heute + überfällig)
- Heutige Termine (Timeline)
- Einkaufsliste (offene Items)
- Aktive Erinnerungen
- Letzte Sync-Aktivität

### Mobile UX-Prinzipien
- Minimum Touch-Target: 48px
- Swipe-to-complete für Todos und Einkaufsartikel
- Karten-Layout statt Tabellen
- Bottom Navigation (4 Icons: Übersicht / Todos / Kalender / Mehr)
- Dunkelmodus via `prefers-color-scheme` + manuellem Toggle

### Echtzeit
`RealTimeProvider.tsx` hält eine WebSocket-Verbindung und aktualisiert
den globalen State ohne Seiten-Reload.

---

## 10. Sicherheit

| Aspekt                    | Maßnahme                                           |
|---------------------------|----------------------------------------------------|
| API-Zugang                | JWT Bearer Token (Laufzeit: 15 Min)                |
| Session-Verlängerung      | Refresh Token (7 Tage, Rotation bei Nutzung)       |
| Passwortschutz Dashboard  | Login-Seite + httpOnly Cookie für Refresh Token    |
| Assistent → Sync          | statischer lokaler API-Key (Umgebungsvariable)     |
| Sync → Middleware         | JWT-Token mit Rolle `sync-service`                 |
| Plugin-Credentials        | AES-verschlüsselt in `config_json`                 |
| HTTPS                     | TLS via Reverse Proxy (nginx / OpenClaw + Let's Encrypt) |
| Einzelnutzer              | kein Multi-Tenancy, ein Admin-Account              |

---

## 11. Deployment (Proxmox VPS / OpenClaw)

```
VPS (OpenClaw)
├── MariaDB                         # bereits auf dem Server
├── Python (FastAPI via uvicorn)    # als systemd-Service oder Docker
├── Next.js (Node.js)               # als systemd-Service oder Docker
└── Reverse Proxy (nginx / OLS)
    ├── /api/*   → FastAPI (Port 8000)
    ├── /ws      → FastAPI WebSocket (Port 8000)
    └── /*       → Next.js (Port 3000)
```

- HTTPS über Let's Encrypt (OpenClaw hat i.d.R. SSL-Verwaltung integriert)
- FastAPI läuft als `uvicorn middleware.app.main:app --host 127.0.0.1 --port 8000`
- Alembic-Migrationen werden beim Deployment ausgeführt

---

## 12. Umsetzungsplan (Phasen)

### Phase 1 – Fundament (Middleware + Dashboard)
1. MariaDB-Datenbank anlegen + Alembic-Migrationen einrichten
2. FastAPI-Middleware aufbauen:
   - Auth (Login, JWT, Refresh)
   - CRUD-Endpunkte für alle Kernobjekte
   - WebSocket-Manager
   - `/changes`-Endpunkt für Polling
3. Next.js-Dashboard:
   - Login
   - Übersichtsseite
   - Todo-, Kalender-, Einkaufs-, Ideen-Ansicht
   - WebSocket-Integration
4. Deployment auf VPS einrichten

### Phase 2 – Sync-Backend
1. Python-Sync-Service aufbauen (`/ingest`-Endpoint)
2. Lokale SQLite für Offline-Pufferung
3. HTTP-Client zur Middleware (mit exponential backoff)
4. Polling-Scheduler (30 Sek.) für bidirektionalen Sync
5. Statusänderungen vom Dashboard zurückholen + lokal anwenden

### Phase 3 – Plugins
1. Todoist-Plugin implementieren
2. Google-Calendar-Plugin implementieren
3. Reminder-Dispatcher (sendet Erinnerungen via Telegram zurück)
4. Plugin-Status und Sync-Log im Dashboard

### Phase 4 – Erweiterungen
1. Volltextsuche (MariaDB `FULLTEXT INDEX`)
2. Filter + Tags im Dashboard
3. Export (CSV / JSON)
4. KI-basierte Klassifikation und Vorschläge
5. Weitere Plugins nach Bedarf

---

## 13. Getroffene Entscheidungen (Zusammenfassung)

| Frage                                      | Entscheidung                                        |
|--------------------------------------------|-----------------------------------------------------|
| Datenbank                                  | MariaDB (MySQL) – auf VPS vorhanden                 |
| Server-Infrastruktur                       | Proxmox VPS mit OpenClaw                            |
| Webhook vs. Polling                        | **Polling** (30 Sek.) – kein öffentlicher Endpoint nötig |
| Konfliktlösung bei gleichzeitigen Updates  | Server-wins + Audit-Log                             |
| Anzahl Nutzer                              | **Einzelnutzer** – kein Multi-Tenancy               |
| Assistent-Authentifizierung                | lokaler API-Key (Umgebungsvariable im Sync-Service) |
| Lokale Pufferdatenbank                     | SQLite (einfach, kein extra Dienst)                 |

---

## 14. Fazit

Das System nutzt die vorhandene Infrastruktur (Proxmox VPS, OpenClaw, MariaDB)
und ergänzt sie mit:

- **FastAPI** als Middleware (async, REST + WebSocket)
- **MariaDB** als zentrale Datenbank (MySQL-kompatibel, kein Extra-Setup)
- **Next.js + Tailwind** für das mobile Dashboard
- **Polling** für den lokalen Sync (robust, keine Firewall-Anforderungen)
- **Plugin-Basisklasse** für saubere Drittanbieter-Anbindung
- **JWT + Einzelnutzer** für einfaches, sicheres Auth

Der vorhandene Assistent bleibt vollständig unangetastet.
