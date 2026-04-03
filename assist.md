
# Prompt für Claude: Persönlicher Assistent mit Middleware, Dashboard und Python-Backend

Du sollst ein System umsetzen, das als persönlicher Assistent für Telegram funktioniert und später erweiterbar ist.

## Ziel
Ein persönlicher Assistent nimmt Eingaben aus Telegram an (Text und Audio), verarbeitet sie und synchronisiert strukturierte Daten mit einer webbasierten Middleware. Das Web-Dashboard ist mobiloptimiert, passwortgeschützt und zeigt Daten in Echtzeit an.

## WICHTIGE ROLLENTRENNUNG
Claude soll **nicht** versucht sein, den Assistenten selbst nachzubauen.
Der Assistent ist bereits vorhanden und bleibt als Kommunikations- und Interpretationsschicht bestehen.

### Klare Aufgabenteilung
- **Assistent (bereits vorhanden):**
  - Telegram-Nachrichten entgegennehmen
  - Audio transkribieren
  - Inhalte interpretieren und kategorisieren
  - strukturierte Daten an die Middleware weitergeben
  - Änderungen von der Middleware wieder lesen

- **Python-Backend:**
  - nur den Daten-Connector / Sync-Layer bauen
  - Daten in die SQL-Datenbank schreiben
  - Daten aus der SQL-Datenbank lesen
  - Daten an den Webserver / die Middleware synchronisieren
  - Statusänderungen vom Webserver zurückholen

- **Middleware im Internet:**
  - zentrale API-Schicht zwischen Assistent und Dashboard
  - speichert Daten in SQL
  - verwaltet Authentifizierung
  - synchronisiert später Drittanbieter-Plugins
  - liefert Echtzeit-Updates an das Dashboard

- **Web-Dashboard:**
  - passwortgeschützt
  - mobiloptimiert
  - modernes UI
  - Echtzeit-Aktualisierung
  - zeigt offene To-dos, heutige Termine, Einkaufsliste, aktive Erinnerungen und Ideen
  - erlaubt Abhaken, Bearbeiten und Archivieren

## MODULARITÄT / ERWEITERBARKEIT
Das gesamte System soll **modular** aufgebaut werden, damit später problemlos weitere Funktionen ergänzt werden können.

### Modul-Prinzip
- Jede wichtige Funktion soll als **eigenes Modul / eigene Schicht** umgesetzt werden.
- Neue Funktionen sollen ohne großen Umbau ergänzbar sein.
- Die Architektur soll klare Grenzen zwischen folgenden Bereichen haben:
  - Telegram/Assistent
  - Python-Sync-Backend
  - Middleware/API
  - Web-Dashboard
  - Plugin-System

### Erweiterbarkeit bedeutet konkret
- neue Datenobjekte später einfach ergänzen können
- neue Plugin-Integrationen hinzufügen können
- neue Dashboard-Ansichten nachrüsten können
- zusätzliche Workflows integrieren können, ohne die bestehende Struktur zu zerreißen
- neue Erinnerungs- oder Automatisierungslogik später modular anbinden können

### Erwartung an die Umsetzung
- **keine monolithische Einmal-Lösung**
- stattdessen eine saubere, erweiterbare Architektur mit klaren Schnittstellen
- das System soll langfristig wachsen können

## Hauptanforderungen

### 1. Telegram als Eingabekanal
- Kommunikation läuft weiter über Telegram.
- Eingaben können sein:
  - neue Idee
  - neues Todo
  - neuer Termin
  - Einkaufslisten-Eintrag
  - Erinnerung
- Eingaben können per Text oder Audio kommen.
- Audio wird transkribiert und dann wie Text weiterverarbeitet.

### 2. Python-Backend auf dem Assistenten-Server
Das Python-Backend ist **nicht** die eigentliche Assistentenlogik, sondern vor allem der technische Sync-Dienst.

Aufgaben:
- strukturierte Daten von der Assistentenlogik entgegennehmen
- in SQL schreiben
- aus SQL lesen
- Änderungen an die Middleware senden
- Änderungen von der Middleware zurückholen
- Sync-Status und Fehler protokollieren

### 3. Internet-Middleware als zentrale Drehscheibe
- Die Middleware läuft auf einem öffentlich erreichbaren Server.
- Sie ist die zentrale API- und Sync-Schicht.
- Sie nimmt strukturierte Daten vom Assistenten entgegen.
- Sie stellt Daten für die Weboberfläche bereit.
- Sie synchronisiert bei Bedarf mit Drittanbietern.

### 4. Handyoptimiertes Dashboard
- Die Weboberfläche soll mobilfreundlich sein.
- Funktionen:
  - Ideen anzeigen
  - Todos anzeigen und abhaken
  - Einkaufslisten verwalten und abhaken
  - Termine anzeigen
  - Erinnerungen und Status verfolgen
- Die UI soll schnell, schlicht und gut auf dem Handy bedienbar sein.
- Das Dashboard soll **passwortgeschützt** sein.
- Die Oberfläche soll **modern** aussehen.
- Aktualisierungen sollen **in Echtzeit** funktionieren.

### 5. Plugin-System für Drittanbieter
- Die Plattform soll später erweiterbar sein.
- Beispiele:
  - **Todoist-Plugin**: Todos werden zu Todoist synchronisiert
  - **Google-Kalender-Plugin**: Termine werden zu Google Calendar synchronisiert
  - weitere Plugins später möglich
- Plugins sollen möglichst standardisiert eingebunden werden.

---

## Zielarchitektur

### Lokaler Assistenten-Server
- Telegram-Input
- Sprach-zu-Text
- Klassifikation / Intent-Erkennung
- Übergabe strukturierter Daten an das Python-Backend
- optional lokale Historie / Markdown-Log

### Python-Sync-Service
- schreibt strukturierte Daten in SQL
- liest Daten aus SQL
- kommuniziert mit der Middleware per API
- holt Änderungen vom Webserver zurück
- synchronisiert Statusänderungen

### Middleware-Server im Internet
- zentrale API
- Datenbank
- Authentifizierung
- Plugin-Routing
- Sync zu Drittanbietern
- Bereitstellung fürs Dashboard
- Echtzeit-Updates an das Dashboard

### Web-Frontend
- mobiloptimiertes Dashboard
- Zugriff auf Daten via Middleware-API
- Bearbeiten / Abhaken / Verschieben / Löschen
- Passwortschutz
- modernes UI

---

## Datenfluss
1. Nachricht kommt per Telegram rein.
2. Der Assistent erkennt Typ und Inhalt.
3. Strukturierte Daten werden an das Python-Backend übergeben.
4. Python speichert diese Daten in SQL und/oder sendet sie an die Middleware.
5. Middleware speichert in SQL.
6. Dashboard zeigt Daten an.
7. Bei passenden Typen löst Middleware Plugin-Sync aus.
   - Todo → Todoist
   - Termin → Google Kalender
8. Statusänderungen aus dem Dashboard werden zurück an die Middleware geschrieben.
9. Python liest diese Änderungen wieder ein und hält die lokale Sicht synchron.
10. Das gesamte System bleibt modular und erweiterbar.

---

## Datenmodell

### Kernobjekte
- **ideas**
- **todos**
- **events**
- **shopping_items**
- **reminders**
- **integrations**
- **sync_jobs**
- **audit_log**

### Mögliche Felder

#### ideas
- id
- title
- content
- tags
- created_at
- updated_at
- source (telegram, manual, audio)
- status

#### todos
- id
- title
- description
- due_date
- priority
- completed
- external_provider (z. B. todoist)
- external_id
- created_at
- updated_at

#### events
- id
- title
- start_time
- end_time
- location
- description
- reminder_offset
- external_provider (z. B. google_calendar)
- external_id

#### shopping_items
- id
- title
- category
- quantity
- unit
- checked
- linked_offer
- store_name
- price

#### reminders
- id
- type
- target_ref
- remind_at
- channel
- sent

#### integrations
- id
- provider_name
- enabled
- config_json
- last_sync_at

#### sync_jobs
- id
- provider_name
- object_type
- object_id
- action
- status
- error_message
- created_at
- updated_at

#### audit_log
- id
- actor
- action
- entity_type
- entity_id
- payload_json
- created_at

---

## Plugin-System

### Ziel
Später sollen externe Dienste als Plugins eingebunden werden können, ohne das ganze System neu zu bauen.

### Plugin-Beispiele
- Todoist
- Google Calendar
- E-Mail
- Telegram Push
- Einkaufslisten-Sync
- weitere spätere Services

### Plugin-Anforderungen
- einheitliche Schnittstelle
- Konfiguration über Dashboard
- Ein- / Ausschalten pro Nutzer
- Statusanzeige für erfolgreiche und fehlgeschlagene Syncs
- Logging pro Sync-Vorgang

### Typische Plugin-Funktionen
- `push_todo()`
- `update_todo()`
- `delete_todo()`
- `push_event()`
- `update_event()`
- `delete_event()`
- `push_reminder()`

---

## Dashboard-Funktionen

### Startseite / Übersicht
- offene Todos
- heutige Termine
- Einkaufsliste
- aktive Erinnerungen
- letzte Syncs

### Listenansichten
- Todos
- Termine
- Ideen
- Einkaufsliste
- Erinnerungen

### Interaktionen
- Todo abhaken
- Einkaufsliste abhaken
- Termin bestätigen / bearbeiten
- Idee archivieren
- Erinnerungsstatus ansehen

### Mobile Anforderungen
- große Buttons
- einfache Listen
- wenig Klicks
- schnelle Ladezeit
- ideal für unterwegs

### UI / UX Anforderungen
- modernes, sauberes Design
- klare Karten / Kacheln
- gute Lesbarkeit auf dem Smartphone
- dezente Animationen
- dunkler Modus optional
- Passwortschutz für Login und Sessions

### Echtzeit-Anforderungen
- Änderungen sollen ohne manuelles Neuladen sichtbar werden
- geeignete Optionen:
  - WebSockets
  - Server-Sent Events
  - Live-Refresh / Polling als Fallback
- neue To-dos, Termine oder Abhak-Änderungen sollen sofort im Dashboard erscheinen

---

## Python-Sync-Backend: Kernaufgaben
- Telegram-Input entgegennehmen
- Audio transkribieren
- Daten vom Assistenten strukturiert erhalten
- Daten in SQL schreiben
- Daten aus SQL lesen
- Änderungen an die Middleware senden
- Änderungen von der Middleware zurückholen
- Statusänderungen in beide Richtungen synchron halten

### Was Python hier **nicht** machen soll
- nicht die komplette Assistenten-Logik ersetzen
- nicht die UI bauen
- nicht die Rolle des vorhandenen Telegram-Assistenten übernehmen

---

## Middleware-Aufgaben
- Datenbankzugriff
- Authentifizierung
- API-Endpunkte für Assistent und Webfrontend
- Plugin-Sync
- Synchronisationsstatus
- Benutzer- und Rechteverwaltung
- Audit-Logging
- Echtzeit-Broadcast an das Dashboard

---

## Offene technische Entscheidungen
- Welche SQL-Datenbank? (PostgreSQL empfohlen, MySQL möglich)
- Welche Web-Technik? (z. B. PHP, Python, Node)
- Wie wird der Assistent authentifiziert?
- Wie werden API-Tokens sicher gespeichert?
- Soll es Webhooks oder Polling für Syncs geben?
- Wie werden Konflikte zwischen lokalem Status und Drittanbietern gelöst?
- Welche Echtzeit-Technik wird genutzt?

---

## Sinnvolle Zusatzfunktionen
- Volltextsuche
- Tagging
- Prioritäten
- Fälligkeiten
- Benachrichtigungsregeln
- Sync-Historie
- Export nach CSV / Excel / JSON
- Offline-freundliche Ansicht
- Mehrere Profile / Haushalte
- Rechte pro Kategorie oder Bereich
- Automatische Duplikaterkennung
- Aktivitätsfeed
- Filter nach Typ, Priorität und Status

---

## Empfehlung für die Umsetzung
### Phase 1
- Datenbank-Schema
- Web-Dashboard mit Login und mobiloptimiertem UI
- Middleware-API
- Echtzeit-Updates

### Phase 2
- Python-Sync-Backend
- Telegram-Input-Anbindung
- Speicher- und Lese-Logik zur Middleware
- Status-Synchronisation

### Phase 3
- Todoist-Plugin
- Google-Kalender-Plugin
- Reminder-System
- Plugin-Status und Sync-Log
- weitere Integrationen

### Phase 4
- weitere Plugins
- bessere Automatisierung
- Rollen / Rechte
- erweiterte Suche
- KI-basierte Klassifikation und Vorschläge
- neue Module jederzeit ergänzbar

---

## Fazit
Die Architektur sollte so aussehen:
- **Assistent**: versteht Telegram und liefert strukturierte Daten
- **Python-Sync-Service**: schreibt/liest Daten und hält alles synchron
- **Middleware im Internet**: zentrale API, SQL, Plugins und Echtzeit
- **mobiloptimiertes, passwortgeschütztes Dashboard**: Kontrolle, Bearbeitung und Abhaken
- **Echtzeit-Updates** für moderne Nutzung
- **Plugin-System** für Drittanbieter wie Todoist und Google Kalender
- **modularer Aufbau**, damit später neue Funktionen einfach ergänzt werden können

Wichtig: Claude soll **nicht** versuchen, den Assistenten nachzubauen, sondern den vorhandenen Assistenten als vorgelagerte Kommunikations- und Interpretationsschicht annehmen.
