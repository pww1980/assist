# Prompt für Claude: Persönlicher Assistent mit Middleware, Dashboard und Python-Backend

Du sollst ein System umsetzen, das als persönlicher Assistent für Telegram funktioniert und später erweiterbar ist.

## Ziel
Ein persönlicher Assistent nimmt Eingaben aus Telegram an (Text und Audio), verarbeitet sie und synchronisiert strukturierte Daten mit einer webbasierten Middleware. Das Web-Dashboard ist mobiloptimiert, passwortgeschützt und zeigt Daten in Echtzeit an.

## Architekturaufteilung
- **Python-Backend auf dem Assistenten-Server**
  - nimmt Telegram-Nachrichten entgegen
  - transkribiert Audio (Whisper oder vergleichbar)
  - klassifiziert Inhalte
  - sendet strukturierte Daten an die Middleware
  - liest Änderungen von der Middleware zurück

- **Middleware im Internet**
  - API-Schicht zwischen Assistent und Dashboard
  - speichert Daten in SQL
  - verwaltet Authentifizierung
  - synchronisiert später Drittanbieter-Plugins
  - liefert Echtzeit-Updates an das Dashboard

- **Web-Dashboard**
  - passwortgeschützt
  - mobiloptimiert
  - modernes UI
  - Echtzeit-Aktualisierung
  - zeigt offene To-dos, heutige Termine, Einkaufsliste, aktive Erinnerungen und Ideen
  - erlaubt Abhaken, Bearbeiten und Archivieren

## Wichtige Datenobjekte
- **Ideas**
- **Todos**
- **Events**
- **Shopping Items**
- **Reminders**
- **Integrations / Plugins**
- **Sync Jobs**
- **Audit Log**

## Zentrale Funktionen

### Telegram / Assistent
- Telegram-Input akzeptieren
- Audio zu Text transkribieren
- Daten erkennen und strukturieren
- Inhaltstyp bestimmen:
  - Idee
  - Todo
  - Termin
  - Einkaufsliste
  - Erinnerung
- Strukturierte Daten an die Middleware senden

### Middleware
- API-Endpunkte für Create/Read/Update/Delete
- SQL-Datenbank als zentrale Quelle
- Authentifizierung per Token / API-Key
- Sync-Status speichern
- später Plugins anbinden (Todoist, Google Kalender, etc.)
- Echtzeit-Updates an das Dashboard senden

### Dashboard
- Login / Passwortschutz
- moderne UI
- mobiloptimiert
- Listen und Kartenansicht
- offene Todos abhaken
- Einkaufsliste abhaken
- Ideen anzeigen
- Termine anzeigen
- Erinnerungen anzeigen
- Echtzeit-Updates ohne manuelles Neuladen

## Synchronisationslogik
- Der Assistent sendet neue oder geänderte strukturierte Daten an die Middleware.
- Die Middleware speichert diese Daten in SQL.
- Das Dashboard liest ausschließlich aus der Middleware / SQL.
- Änderungen im Dashboard werden wieder an die Middleware gemeldet.
- Der Assistent kann Änderungen von der Middleware zurücklesen.

## Erweiterbarkeit / Plugins
Später sollen Integrationen möglich sein, z. B.:
- Todoist für Aufgaben
- Google Kalender für Termine
- E-Mail-Reminder
- weitere Drittanbieter-Plugins

## Gewünschte Umsetzungsreihenfolge
1. **Datenbank-Schema** für Ideas, Todos, Events, Shopping Items, Reminders, Integrations, Sync Jobs, Audit Log
2. **Web-Dashboard** mit Login, mobilem Layout und Echtzeit-Updates
3. **Middleware-API** zum Schreiben/Lesen der Daten
4. **Python-Backend** für Telegram, Audio-Transkription und Sync zur Middleware
5. **Plugin-System** für Todoist und Google Kalender

## Zusätzliche Anforderungen
- Sicherheit bei Authentifizierung und API-Zugriff
- saubere Trennung der Komponenten
- dokumentierte API-Verträge
- erweiterbare Architektur
- klare Statusanzeige für Sync-Fehler und erfolgreiche Synchronisationen

## Output-Erwartung
Bitte liefere:
1. eine sinnvolle Projektstruktur
2. das SQL-Schema
3. die API-Routen für Middleware und Dashboard
4. den Python-Teil für Telegram und Sync
5. eine moderne, mobiloptimierte Weboberfläche mit Login
6. eine klare Begründung für die gewählte Architektur
