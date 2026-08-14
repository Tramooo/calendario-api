create table if not exists hive_notes (
  hive_number smallint not null check (hive_number between 1 and 10),
  note_date date not null,
  body text not null,
  updated_at timestamptz not null default now(),
  primary key (hive_number, note_date)
);

create index if not exists hive_notes_note_date_idx on hive_notes (note_date);
