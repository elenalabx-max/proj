-- ============================================================
-- 0001_init.sql
-- Phase 1: 完整 Schema + RLS + user_settings/areas 自動初始化
-- 對照 docs/架構規劃_A-G.md 的 B 節
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- helper: 通用 updated_at 自動更新
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- user_settings
-- ------------------------------------------------------------
create table user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  timezone text not null default 'Asia/Taipei',
  locale text not null default 'zh-TW',
  personal_default_color text not null default '#9a86ac',
  work_fallback_color text not null default '#5b7f9a',
  week_start smallint not null default 1 check (week_start in (0, 1)),
  default_calendar_view text not null default 'day' check (default_calendar_view in ('month', 'week', 'day')),
  dark_mode text not null default 'system' check (dark_mode in ('system', 'light', 'dark')),
  updated_at timestamptz not null default now()
);

create trigger trg_user_settings_updated_at
  before update on user_settings
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- areas（每個使用者固定 personal / work 兩筆，由 signup trigger 建立）
-- ------------------------------------------------------------
create table areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in ('personal', 'work')),
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, type)
);

-- ------------------------------------------------------------
-- people（交辦對象，不需要有帳號）
-- ------------------------------------------------------------
create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  note text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

-- ------------------------------------------------------------
-- recurrence_rules
-- ------------------------------------------------------------
create table recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  rrule_text text not null,
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- projects
-- ------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  area_id uuid not null references areas on delete restrict,
  name text not null,
  description text,
  color text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- tasks
-- ------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  area_id uuid not null references areas on delete restrict,
  project_id uuid references projects on delete set null,
  title text not null,
  description text,
  status text not null default 'inbox' check (
    status in ('inbox', 'todo', 'in_progress', 'waiting', 'review', 'completed', 'forgotten')
  ),
  important boolean not null default false,
  urgent boolean not null default false,
  due_date date,
  scheduled_date date,
  scheduled_start time,
  scheduled_end time,
  is_all_day boolean not null default false,
  estimated_minutes int,
  assignee_id uuid references people on delete set null,
  delegate_date date,
  delegate_deadline timestamptz,
  follow_up_at timestamptz,
  forgotten_until date,
  recurrence_rule_id uuid references recurrence_rules on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz
);

create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- subtasks
-- ------------------------------------------------------------
create table subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  task_id uuid not null references tasks on delete cascade,
  title text not null,
  position int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_subtasks_updated_at
  before update on subtasks
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- todos
-- ------------------------------------------------------------
create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  area_id uuid references areas on delete set null,
  title text not null,
  date date,
  forgotten_until date,
  recurrence_rule_id uuid references recurrence_rules on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create trigger trg_todos_updated_at
  before update on todos
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- reminders（linked_type/linked_id 為多型關聯，不建外鍵）
-- ------------------------------------------------------------
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  remind_at timestamptz not null,
  linked_type text check (linked_type in ('task', 'todo', 'project', 'standalone')),
  linked_id uuid,
  title text,
  note text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- time_logs
-- ------------------------------------------------------------
create table time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  task_id uuid references tasks on delete cascade,
  subtask_id uuid references subtasks on delete cascade,
  todo_id uuid references todos on delete cascade,
  log_date date not null,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes int not null check (duration_minutes > 0),
  note text,
  source text not null check (source in ('timer', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_logs_one_owner check (
    (case when task_id is not null then 1 else 0 end
     + case when subtask_id is not null then 1 else 0 end
     + case when todo_id is not null then 1 else 0 end) = 1
  )
);

create trigger trg_time_logs_updated_at
  before update on time_logs
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- active_timers（每個使用者同時最多一筆）
-- ------------------------------------------------------------
create table active_timers (
  user_id uuid primary key references auth.users on delete cascade,
  task_id uuid references tasks on delete cascade,
  subtask_id uuid references subtasks on delete cascade,
  started_at timestamptz not null default now(),
  constraint active_timers_one_target check (
    (task_id is not null and subtask_id is null) or
    (task_id is null and subtask_id is not null)
  )
);

-- ------------------------------------------------------------
-- recurrence_instances（只記例外，其餘用 rrule 即時展開）
-- ------------------------------------------------------------
create table recurrence_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  recurrence_rule_id uuid not null references recurrence_rules on delete cascade,
  task_id uuid references tasks on delete cascade,
  todo_id uuid references todos on delete cascade,
  instance_date date not null,
  is_cancelled boolean not null default false,
  override_title text,
  override_scheduled_start time,
  override_scheduled_end time,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recurrence_rule_id, instance_date)
);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null check (type in ('reminder', 'follow_up')),
  linked_type text,
  linked_id uuid,
  title text,
  body text,
  scheduled_for timestamptz not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- task_history（V1 可選，先建表備用）
-- ------------------------------------------------------------
create table task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  field text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_tasks_user_active on tasks (user_id) where archived_at is null;
create index idx_tasks_project on tasks (project_id) where archived_at is null;
create index idx_tasks_scheduled_date on tasks (user_id, scheduled_date) where archived_at is null;
create index idx_tasks_status on tasks (user_id, status) where archived_at is null;
create index idx_todos_user_active on todos (user_id) where archived_at is null;
create index idx_todos_date on todos (user_id, date) where archived_at is null;
create index idx_subtasks_task on subtasks (task_id);
create index idx_time_logs_task on time_logs (task_id);
create index idx_time_logs_subtask on time_logs (subtask_id);
create index idx_time_logs_todo on time_logs (todo_id);
create index idx_reminders_user_remind_at on reminders (user_id, remind_at) where completed_at is null;
create index idx_recurrence_instances_rule on recurrence_instances (recurrence_rule_id);
create index idx_notifications_user_scheduled on notifications (user_id, scheduled_for) where read_at is null;

-- ============================================================
-- Row Level Security — 每張表都用最簡單的 user_id = auth.uid()
-- ============================================================
alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table areas enable row level security;
alter table people enable row level security;
alter table recurrence_rules enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;
alter table todos enable row level security;
alter table reminders enable row level security;
alter table time_logs enable row level security;
alter table active_timers enable row level security;
alter table recurrence_instances enable row level security;
alter table notifications enable row level security;
alter table task_history enable row level security;

create policy "profiles_self" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "user_settings_self" on user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "areas_self" on areas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "people_self" on people
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "recurrence_rules_self" on recurrence_rules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "projects_self" on projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "tasks_self" on tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "subtasks_self" on subtasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "todos_self" on todos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reminders_self" on reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "time_logs_self" on time_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "active_timers_self" on active_timers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "recurrence_instances_self" on recurrence_instances
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications_self" on notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "task_history_self" on task_history
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 新使用者註冊 → 自動建立 profiles / user_settings / areas(personal, work)
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.user_settings (user_id)
  values (new.id);

  insert into public.areas (user_id, type, name)
  values
    (new.id, 'personal', '個人'),
    (new.id, 'work', '工作');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- task_actual_minutes — Task 實際工時（Subtask 的 log 只算一次，不重複計算）
-- ============================================================
create view task_actual_minutes as
select
  t.id as task_id,
  t.user_id,
  coalesce(sum(tl.duration_minutes), 0)::int as actual_minutes
from tasks t
left join subtasks st on st.task_id = t.id
left join time_logs tl
  on tl.task_id = t.id or tl.subtask_id = st.id
group by t.id, t.user_id;
