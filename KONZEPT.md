# Konzept: Persönlicher Assistent – Architektur & Umsetzungsplan

## 1. Überblick

Das System besteht aus vier klar getrennten Schichten:

```
[Telegram] → [Assistent (vorhanden)] → [Python-Sync-Service]
                                               ↕ REST/HTTP
                                       [Middleware-Server]
                                               ↕ WebSocket/SSE
                                       [Web-Dashboard]
                                               ↕ Plugin-Routing
                                   [Todoist / Google Calendar / ...]
```

Der Assistent ist bereits vorhanden und wird **nicht** neu gebaut.
Alle folgenden Komponenten werden neu entwickelt.

---

## 2. Technologie-Entscheidungen

| Komponente         | Technologie                        | Begründung                                      |
|--------------------|------------------------------------|-------------------------------------------------|
| Datenbank          | PostgreSQL                         | JSON-Support, robust, gut skalierbar            |
| Middleware/API     | Python (FastAPI)                   | async-fähig, einfache REST+WebSocket-Unterstützung |
| Echtzeit           | WebSockets (via FastAPI)           | bidirektional, kein Polling nötig               |
| Web-Dashboard      | Next.js (React) + Tailwind CSS     | mobiloptimiert, SSR, modernes UI                |
| Authentifizierung  | JWT (Access + Refresh Token)       | stateless, sicher, Session-fähig                |
| Python-Sync        | Python (aiohttp + SQLAlchemy)      | async HTTP + ORM für SQL                        |
| API-Kommunikation  | REST (JSON) + Bearer Token         | standardisiert, erweiterbar                     |
| Plugin-System      | abstrakte Basisklasse in Python    | einheitliche Schnittstelle für alle Plugins     |

---

## 3. Projektstruktur

```
/
├── middleware/                  # FastAPI-Backend (Middleware-Server)
│   ├── app/
│   │   ├── main.py              # App-Einstieg, Router-Registrierung
│   │   ├── config.py            # Umgebungsvariablen
│   │   ├── database.py          # DB-Verbindung, Session
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
│   │   ├── main.py              # Einstieg, Scheduler
│   │   ├── receiver.py          # Empfang strukturierter Daten vom Assistenten
│   │   ├── db.py                # lokale SQLite/PostgreSQL-Verbindung
│   │   ├── middleware_client.py # HTTP-Client zur Middleware
│   │   └── logger.py            # Sync-Logging
│   ├── requirements.txt
│   └── .env.example
│
├── dashboard/                   # Next.js Web-Dashboard
│   ├── app/
│   │   ├── page.tsx             # Startseite / Übersicht
│   │   ├── login/page.tsx       # Login
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
│   │   ├── api.ts               # Axios/Fetch-Client
│   │   └── auth.ts              # Token-Verwaltung
│   ├── tailwind.config.ts
│   └── package.json
│
└── shared/
    └── types/                   # Geteilte Typen/Schemas (optional)
```

---

## 4. Datenbank-Schema (PostgreSQL)

### ideas
```sql
CREATE TABLE ideas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    content     TEXT,
    tags        TEXT[],
    source      VARCHAR(20) DEFAULT 'telegram',  -- telegram | manual | audio
    status      VARCHAR(20) DEFAULT 'active',    -- active | archived
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### todos
```sql
CREATE TABLE todos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             TEXT NOT NULL,
    description       TEXT,
    due_date          TIMESTAMPTZ,
    priority          SMALLINT DEFAULT 2,         -- 1=hoch, 2=mittel, 3=niedrig
    completed         BOOLEAN DEFAULT FALSE,
    external_provider VARCHAR(50),                -- todoist | null
    external_id       VARCHAR(100),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### events
```sql
CREATE TABLE events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             TEXT NOT NULL,
    start_time        TIMESTAMPTZ NOT NULL,
    end_time          TIMESTAMPTZ,
    location          TEXT,
    description       TEXT,
    reminder_offset   INTEGER,                    -- Minuten vor dem Termin
    external_provider VARCHAR(50),                -- google_calendar | null
    external_id       VARCHAR(100),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### shopping_items
```sql
CREATE TABLE shopping_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT NOT NULL,
    category     VARCHAR(100),
    quantity     NUMERIC,
    unit         VARCHAR(30),
    checked      BOOLEAN DEFAULT FALSE,
    store_name   TEXT,
    price        NUMERIC(10,2),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### reminders
```sql
CREATE TABLE reminders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(50) NOT NULL,
    target_ref  UUID,
    remind_at   TIMESTAMPTZ NOT NULL,
    channel     VARCHAR(30) DEFAULT 'telegram',
    sent        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### integrations
```sql
CREATE TABLE integrations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name  VARCHAR(50) UNIQUE NOT NULL,
    enabled        BOOLEAN DEFAULT FALSE,
    config_json    JSONB,
    last_sync_at   TIMESTAMPTZ
);
```

### sync_jobs
```sql
CREATE TABLE sync_jobs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name  VARCHAR(50) NOT NULL,
    object_type    VARCHAR(50) NOT NULL,
    object_id      UUID NOT NULL,
    action         VARCHAR(20) NOT NULL,          -- create | update | delete
    status         VARCHAR(20) DEFAULT 'pending', -- pending | success | failed
    error_message  TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### audit_log
```sql
CREATE TABLE audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor        VARCHAR(100),
    action       VARCHAR(50) NOT NULL,
    entity_type  VARCHAR(50),
    entity_id    UUID,
    payload_json JSONB,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
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

### WebSocket (Echtzeit)
```
WS /ws?token=<access_token>
```
Events vom Server an den Client:
```json
{ "event": "todo.updated",  "data": { ...todo } }
{ "event": "todo.created",  "data": { ...todo } }
{ "event": "event.created", "data": { ...event } }
{ "event": "shopping.checked", "data": { ...item } }
```

---

## 6. Assistent → Sync-Backend Interface

Der Assistent übergibt strukturierte Daten lokal an den Sync-Service.
Empfohlene Methode: **HTTP POST auf localhost** (einfach, entkoppelt).

```
POST http://localhost:8001/ingest
Authorization: Bearer <lokaler API-Key>
Content-Type: application/json
```

Payload-Beispiele:
```json
{ "type": "todo",  "data": { "title": "Zahnarzt anrufen", "due_date": "2026-04-10" } }
{ "type": "idea",  "data": { "title": "App-Idee", "content": "...", "source": "audio" } }
{ "type": "event", "data": { "title": "Meeting", "start_time": "2026-04-05T14:00:00Z" } }
{ "type": "shopping_item", "data": { "title": "Milch", "quantity": 2, "unit": "l" } }
{ "type": "reminder", "data": { "target_ref": "<uuid>", "remind_at": "...", "channel": "telegram" } }
```

---

## 7. Plugin-System

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
verschlüsselt in `integrations.config_json` gespeichert.

---

## 8. Dashboard – Kernansichten

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
- Dunkelmodus über `prefers-color-scheme` + manuellem Toggle

### Echtzeit
`RealTimeProvider.tsx` hält eine WebSocket-Verbindung und aktualisiert
den globalen State (Zustand via Zustand/Jotai) ohne Seiten-Reload.

---

## 9. Sicherheit

| Aspekt                    | Maßnahme                                           |
|---------------------------|----------------------------------------------------|
| API-Zugang                | JWT Bearer Token (kurze Laufzeit: 15 Min)          |
| Session-Verlängerung      | Refresh Token (7 Tage, rotation bei Nutzung)       |
| Passwortschutz Dashboard  | Login-Seite + httpOnly Cookie für Refresh Token    |
| Assistent → Sync          | statischer lokaler API-Key (Umgebungsvariable)     |
| Sync → Middleware         | JWT-Token mit eigener Rolle (`sync-service`)       |
| Plugin-Credentials        | AES-verschlüsselt in `config_json`                 |
| HTTPS                     | TLS via Reverse Proxy (nginx + Let's Encrypt)      |

---

## 10. Umsetzungsplan (Phasen)

### Phase 1 – Fundament (Middleware + Dashboard)
1. PostgreSQL-Schema anlegen + Alembic-Migrationen einrichten
2. FastAPI-Middleware aufbauen:
   - Auth (Login, JWT, Refresh)
   - CRUD-Endpunkte für alle Kernobjekte
   - WebSocket-Manager
3. Next.js-Dashboard:
   - Login
   - Übersichtsseite
   - Todo-, Kalender-, Einkaufs-, Ideen-Ansicht
   - WebSocket-Integration
4. Deployment: Docker Compose (Middleware + PostgreSQL + Dashboard)

### Phase 2 – Sync-Backend
1. Python-Sync-Service aufbauen (`/ingest`-Endpoint)
2. Lokale SQLite für Offline-Pufferung
3. HTTP-Client zur Middleware (mit Retry-Logik)
4. Bidirektionaler Sync (Statusänderungen vom Dashboard zurückholen)
5. Scheduler für periodischen Sync (z. B. alle 30 Sekunden)

### Phase 3 – Plugins
1. Todoist-Plugin implementieren
2. Google-Calendar-Plugin implementieren
3. Reminder-Dispatcher (sendet Erinnerungen via Telegram zurück)
4. Plugin-Status im Dashboard anzeigen
5. Sync-Log im Dashboard

### Phase 4 – Erweiterungen
1. Volltextsuche (PostgreSQL `tsvector`)
2. Filter + Tags im Dashboard
3. Export (CSV / JSON)
4. Mehrere Profile / Haushalte
5. KI-basierte Klassifikation und Vorschläge
6. Weitere Plugins nach Bedarf

---

## 11. Offene Entscheidungen (Klärungsbedarf)

| Frage                                      | Empfehlung / Optionen                              |
|--------------------------------------------|----------------------------------------------------|
| Wo läuft der Middleware-Server?            | VPS (z. B. Hetzner), Docker Compose                |
| Lokale DB im Sync-Backend                  | SQLite (einfach) oder PostgreSQL (konsistent)      |
| Webhook vs. Polling für Sync               | Polling (einfacher) → später auf Webhooks migrieren|
| Konfliktlösung bei gleichzeitigen Updates  | Server-wins-Strategie + Audit-Log                  |
| Anzahl Nutzer                              | Einzelnutzer → kein Multi-Tenancy nötig (Phase 1)  |
| Wie authentifiziert sich der Assistent?    | Lokaler API-Key (Umgebungsvariable im Sync-Service)|

---

## 12. Fazit

Das Konzept setzt die in `assist.md` beschriebene Architektur mit konkreten
Technologieentscheidungen um:

- **FastAPI** als schnelle, async-fähige Middleware mit WebSocket-Support
- **PostgreSQL** als robuste, erweiterbare Datenbank
- **Next.js + Tailwind** für ein modernes, mobiloptimiertes Dashboard
- **Plugin-Basisklasse** für standardisierte Drittanbieter-Anbindung
- **JWT + Refresh Token** für sicheren, sessionfähigen Zugang
- **Phasenweise Umsetzung** für kontrollierten, erweiterbaren Aufbau

Der vorhandene Assistent bleibt vollständig unangetastet und übergibt
lediglich strukturierte Daten an den Sync-Service.
