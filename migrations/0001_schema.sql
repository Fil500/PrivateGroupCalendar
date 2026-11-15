-- Datenbankschema des Gruppenkalenders (vollständig, ohne Beispieldaten).
-- Zeitpunkte als lokale Zeit 'YYYY-MM-DDTHH:MM' (eine Gruppe, eine Zeitzone), Bereichsabfragen per Stringvergleich.
-- Alle Anweisungen sind wiederholbar (IF NOT EXISTS), damit eine bestehende Datenbank unverändert bleibt.

CREATE TABLE IF NOT EXISTS members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT 'blue',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  start_time  TEXT NOT NULL,              -- 'HH:MM'
  end_time    TEXT NOT NULL,              -- 'HH:MM' (kleiner als start_time = endet am Folgetag)
  color       TEXT NOT NULL DEFAULT 'blue',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  member_id   TEXT,                       -- Person, der die Vorlage gehört (optional)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  start_at     TEXT NOT NULL,             -- 'YYYY-MM-DDTHH:MM'
  end_at       TEXT NOT NULL,             -- 'YYYY-MM-DDTHH:MM'
  all_day      INTEGER NOT NULL DEFAULT 0,
  color        TEXT NOT NULL DEFAULT 'blue',
  notes        TEXT,
  template_id  TEXT,                      -- aus welcher Vorlage erstellt (optional)
  series_id    TEXT,                      -- gemeinsam erstellte Termine (mehrere Tage, Import)
  member_id    TEXT,                      -- Person; NULL = niemand Bestimmtes
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_start  ON events (start_at);
CREATE INDEX IF NOT EXISTS idx_events_end    ON events (end_at);
CREATE INDEX IF NOT EXISTS idx_events_series ON events (series_id);
CREATE INDEX IF NOT EXISTS idx_events_member ON events (member_id);
