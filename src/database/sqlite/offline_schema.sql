-- Reference schema for the device-local store.
-- The IndexedDB adapter (Phase 1) mirrors these four tables as object
-- stores; this file becomes the literal migration once real SQLite
-- (@capacitor-community/sqlite) is wired in during the APK phase.

create table offline_projects (
  id text primary key,
  name text not null,
  ladder_json text not null,
  synced integer not null default 0,
  updated_at text not null
);

create table offline_materials (
  id text primary key,
  title text not null,
  content text not null,
  category text not null
);

create table offline_settings (
  key text primary key,
  value text
);

create table simulation_cache (
  project_id text not null,
  scan_state text not null,
  updated_at text not null
);
