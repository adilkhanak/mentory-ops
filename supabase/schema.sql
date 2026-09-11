begin;

create table if not exists public.users (
  id text primary key,
  email text not null unique,
  name text,
  role text not null default 'VIEWER' check (role in ('ADMIN','MANAGER','TEACHER','VIEWER')),
  created_at text not null
);

create table if not exists public.program_cycles (
  id text primary key,
  name text not null,
  regional_minimum integer not null default 30 check (regional_minimum between 0 and 100),
  motivation_deadline text not null,
  calendly_url text,
  active integer not null default 1,
  created_at text not null
);

create table if not exists public.courses (
  id text primary key,
  cycle_id text not null references public.program_cycles(id),
  name text not null,
  quota integer not null check (quota >= 0),
  sort_order integer not null default 0
);
create index if not exists idx_courses_cycle on public.courses(cycle_id);

create table if not exists public.people (
  id text primary key,
  iin text unique,
  full_name text not null,
  email text,
  phone text,
  birth_date text,
  identity_number text,
  identity_issued_at text,
  birth_region text,
  birth_city text,
  city text,
  region text,
  education text,
  employment_status text,
  it_experience text,
  regional integer not null default 0,
  created_at text not null
);
create index if not exists idx_people_name on public.people(full_name);
create index if not exists idx_people_email on public.people(lower(email));

create table if not exists public.applications (
  id text primary key,
  application_number text,
  person_id text not null references public.people(id),
  cycle_id text not null references public.program_cycles(id),
  course_id text not null references public.courses(id),
  applied_at text,
  signed_at text,
  source_application_status text,
  sender_status text,
  learning_goal text,
  status text not null default 'NEW',
  cv_status text not null default 'NOT_REVIEWED',
  cv_url text,
  motivation_status text not null default 'NOT_SENT',
  interview_status text not null default 'NOT_SCHEDULED',
  final_decision text not null default 'PENDING',
  source text not null default 'MANUAL',
  notes text,
  created_at text not null,
  updated_at text not null,
  unique(person_id, cycle_id, course_id)
);
create index if not exists idx_applications_cycle_status on public.applications(cycle_id,status);
create index if not exists idx_applications_course on public.applications(course_id);
create index if not exists idx_applications_number on public.applications(application_number);

create table if not exists public.cv_reviews (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  decision text not null,
  comment text,
  reviewer_id text references public.users(id),
  created_at text not null
);
create index if not exists idx_cv_reviews_application on public.cv_reviews(application_id);
create index if not exists idx_cv_reviews_reviewer on public.cv_reviews(reviewer_id);

create table if not exists public.interviews (
  id text primary key,
  application_id text not null unique references public.applications(id) on delete cascade,
  scheduled_at text,
  calendly_url text,
  attendance text not null default 'UNKNOWN',
  decision text not null default 'PENDING',
  comment text,
  updated_at text not null
);

create table if not exists public.email_messages (
  id text primary key,
  message_id text unique,
  uid integer,
  from_email text,
  to_email text,
  subject text,
  body_text text,
  has_attachments integer not null default 0,
  attachments_json text,
  received_at text,
  status text not null default 'RECEIVED',
  application_id text references public.applications(id) on delete set null,
  created_at text not null
);
create index if not exists idx_email_received on public.email_messages(received_at desc);
create index if not exists idx_email_application on public.email_messages(application_id);

create table if not exists public.motivation_submissions (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  email_message_id text references public.email_messages(id) on delete set null,
  received_at text not null,
  status text not null default 'RECEIVED',
  created_at text not null
);
create index if not exists idx_motivation_application on public.motivation_submissions(application_id);
create index if not exists idx_motivation_email on public.motivation_submissions(email_message_id);

create table if not exists public.import_runs (
  id text primary key,
  source_name text not null,
  status text not null,
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_skipped integer not null default 0,
  issues_json text,
  actor_id text references public.users(id),
  created_at text not null
);
create index if not exists idx_import_actor on public.import_runs(actor_id);

create table if not exists public.audit_log (
  id text primary key,
  actor_id text references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  changes_json text,
  created_at text not null
);
create index if not exists idx_audit_entity on public.audit_log(entity_type,entity_id);
create index if not exists idx_audit_actor on public.audit_log(actor_id);

create table if not exists public.sync_state (
  key text primary key,
  value text,
  updated_at text not null
);

insert into public.program_cycles(id,name,regional_minimum,motivation_deadline,calendly_url,active,created_at)
values ('tech-orda-2026','Tech Orda 2026',30,'2026-09-17',null,1,now()::text)
on conflict(id) do update set name=excluded.name,regional_minimum=excluded.regional_minimum,motivation_deadline=excluded.motivation_deadline;

insert into public.courses(id,cycle_id,name,quota,sort_order) values
('junior-frontend','tech-orda-2026','Junior Frontend Developer',21,1),
('middle-frontend','tech-orda-2026','Middle Frontend Engineer',23,2)
on conflict(id) do update set name=excluded.name,quota=excluded.quota,sort_order=excluded.sort_order;

insert into public.users(id,email,name,role,created_at)
values ('invite_info_mentory_pro','info@mentory.pro','Mentory Admin','ADMIN',now()::text)
on conflict(email) do update set role='ADMIN';

alter table public.users enable row level security;
alter table public.program_cycles enable row level security;
alter table public.courses enable row level security;
alter table public.people enable row level security;
alter table public.applications enable row level security;
alter table public.cv_reviews enable row level security;
alter table public.interviews enable row level security;
alter table public.email_messages enable row level security;
alter table public.motivation_submissions enable row level security;
alter table public.import_runs enable row level security;
alter table public.audit_log enable row level security;
alter table public.sync_state enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

commit;
