# 個人專案任務行事曆時間管理系統 — 架構規劃（A~G）

依規劃書第五十節要求，在開始 Phase 1 開發前，先輸出以下七項供確認。確認後才會開始建立 Phase 1。

視覺方向已定案：詳見 [Today 五種風格](https://claude.ai/code/artifact/82d298d2-099b-4030-8493-f110f86cdaea) 的「6・定案方向」（結構格線 + 靜謐圓弧）。

---

## A. Architecture Plan

### 技術選型

| 分類 | 選擇 | 說明 |
|---|---|---|
| Frontend | Next.js（App Router）+ TypeScript + Tailwind CSS | |
| Backend/DB/Auth | Supabase（PostgreSQL + Supabase Auth + Realtime + RLS） | 不另外架自己的 API Server，CRUD 直接由前端透過 `supabase-js` 呼叫，靠 RLS 擋權限 |
| Server-state 快取 | TanStack Query（React Query） | 包一層在 `supabase-js` 外面，處理快取、樂觀更新（optimistic update）、背景 refetch |
| 拖曳/縮放 | 四象限拖曳用 `dnd-kit`；Calendar 時間軸的拖曳/Resize 用自寫的 pointer-event 邏輯（像素差 → 分鐘，5/15 分鐘吸附） | dnd-kit 較適合清單型拖曳，時間軸的连续座標換算自己寫比較好控制 |
| 重複規則 | `rrule` (rrule.js) | 只存 RRULE 字串，畫面上要顯示的區間才即時展開成「虛擬 instance」 |
| 日期/時區 | `date-fns` + `date-fns-tz` | DB 一律存 UTC，畫面依 `user_settings.timezone`（預設 Asia/Taipei）轉換 |
| 顏色對比 | 前端即時算 WCAG 相對亮度，決定色塊文字用白或黑 | 不額外存「文字顏色」欄位，改顏色不用遷移資料 |

### 系統輪廓

1. **Auth**：Supabase Auth（Email+Password、Google OAuth）。用 `@supabase/ssr`，session 存 cookie，middleware 每個 request 自動 refresh token。Server Component 讀 session 做初次渲染，Client Component 用瀏覽器端 client 做 mutation 跟 realtime 訂閱。
2. **資料存取**：預設直接前端呼叫 Supabase（RLS 保護），不需要自己的 API Server。少數需要伺服器端邏輯的地方（例如批次展開重複事件、複雜統計）用 Next.js Route Handler + Postgres View/Function，盡量把邏輯下推到資料庫層，V1 避免另外養一層 backend。
3. **多裝置同步**：對每個使用者訂閱一條 Supabase Realtime channel（`postgres_changes`，過濾 `user_id = 該使用者`），收到 tasks/todos/time_logs/reminders 的變動時，觸發 React Query 對應 key 的 `invalidateQueries`，讓所有開著的裝置在約 1 秒內看到最新資料，不用輪詢。
4. **樂觀更新**：Calendar 拖曳/Resize、勾選完成等操作先更新本地 Query Cache 讓 UI 立即反應，再送出 Supabase 的 update；失敗則 rollback 並跳 toast。

---

## B. Database Schema

所有主要資料表都：
- 有 `user_id uuid references auth.users` 並開 RLS，policy 一律是 `user_id = auth.uid()`（見 E 節說明為何不用 join 型 policy）
- 用 `archived_at timestamptz null` 做 Soft Delete，不 Hard Delete
- 時間欄位一律 `timestamptz`（存 UTC），全天日期用 `date` 型別（見 G 節時區風險）

```sql
-- 使用者設定
profiles (
  id uuid primary key references auth.users,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
)

user_settings (
  user_id uuid primary key references auth.users,
  timezone text default 'Asia/Taipei',
  locale text default 'zh-TW',
  personal_default_color text default '#9a86ac',
  work_fallback_color text default '#5b7f9a',
  week_start smallint default 1,           -- 0=Sun 1=Mon
  default_calendar_view text default 'day', -- month/week/day
  dark_mode text default 'system',          -- system/light/dark
  updated_at timestamptz default now()
)

-- 最上層 Area（每個使用者固定 2 筆：personal / work）
areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  type text check (type in ('personal','work')),
  name text not null,
  created_at timestamptz default now()
)

projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  area_id uuid references areas,
  name text not null,
  description text,
  color text not null,
  status text default 'active' check (status in ('active','paused','completed','archived')),
  start_date date,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz
)

tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  area_id uuid references areas,
  project_id uuid references projects,
  title text not null,
  description text,
  status text default 'inbox' check (status in
    ('inbox','todo','in_progress','waiting','review','completed','forgotten')),
  important boolean default false,
  urgent boolean default false,
  due_date date,
  scheduled_date date,
  scheduled_start time,
  scheduled_end time,
  is_all_day boolean default false,
  estimated_minutes int,
  assignee_id uuid references people,
  delegate_date date,
  delegate_deadline timestamptz,
  follow_up_at timestamptz,
  forgotten_until date,                     -- null=無限期遺忘
  recurrence_rule_id uuid references recurrence_rules,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz,
  archived_at timestamptz
)

subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  task_id uuid references tasks not null,
  title text not null,
  position int default 0,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  area_id uuid references areas,
  title text not null,
  date date,
  forgotten_until date,
  recurrence_rule_id uuid references recurrence_rules,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz
)

reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  remind_at timestamptz not null,
  linked_type text check (linked_type in ('task','todo','project','standalone')),
  linked_id uuid,
  title text,
  note text,
  completed_at timestamptz,
  created_at timestamptz default now()
)

people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  note text,
  created_at timestamptz default now(),
  archived_at timestamptz
)

time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  task_id uuid references tasks,
  subtask_id uuid references subtasks,
  todo_id uuid references todos,
  log_date date not null,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes int not null,
  note text,
  source text check (source in ('timer','manual')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint one_owner check (
    (task_id is not null)::int + (subtask_id is not null)::int + (todo_id is not null)::int = 1
  )
)

active_timers (               -- 保證同一使用者同時只有一個計時器
  user_id uuid primary key references auth.users,
  task_id uuid references tasks,
  subtask_id uuid references subtasks,
  started_at timestamptz not null
)

recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  rrule_text text not null,      -- RFC5545 RRULE 字串
  starts_on date not null,
  ends_on date,
  created_at timestamptz default now()
)

recurrence_instances (          -- 只記「被改過/被完成」的例外，其餘用 rrule 即時展開
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  recurrence_rule_id uuid references recurrence_rules,
  task_id uuid references tasks,
  todo_id uuid references todos,
  instance_date date not null,
  is_cancelled boolean default false,
  override_title text,
  override_scheduled_start time,
  override_scheduled_end time,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique (recurrence_rule_id, instance_date)
)

notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  type text check (type in ('reminder','follow_up')),
  linked_type text,
  linked_id uuid,
  title text,
  body text,
  scheduled_for timestamptz not null,
  read_at timestamptz,
  created_at timestamptz default now()
)

task_history (                  -- V1 可選
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks,
  user_id uuid references auth.users,
  field text,
  old_value text,
  new_value text,
  changed_at timestamptz default now()
)
```

**Task Actual Time / Project 統計**用 Postgres View 算，不在應用層加總，避免重複計算：

```sql
create view task_actual_minutes as
select
  t.id as task_id,
  coalesce(sum(tl.duration_minutes), 0) as actual_minutes
from tasks t
left join subtasks st on st.task_id = t.id
left join time_logs tl on tl.task_id = t.id or tl.subtask_id = st.id
group by t.id;
```

---

## C. Page / Route Map（Next.js App Router）

```
/(auth)/login
/(auth)/signup

/(app)/today                     ← 登入後預設首頁
/(app)/calendar/month
/(app)/calendar/week
/(app)/calendar/day              ← 內含「時間軸 / 四象限」切換（狀態存在 URL query ?view=quadrant）
/(app)/inbox
/(app)/waiting
/(app)/review
/(app)/forgotten
/(app)/projects
/(app)/projects/[projectId]
/(app)/completed
/(app)/settings
/(app)/settings/colors
/(app)/search
```

四象限不獨立開一條路由，是 Day View 底下的一個顯示模式（跟你的 mockup 一致），用 query string 記狀態，重新整理也能保留。

---

## D. Component Tree（重點節錄）

```
AppShell
├─ Sidebar
│  ├─ NavToday / NavCalendar
│  ├─ NavInbox / NavWaiting / NavReview / NavForgotten
│  ├─ NavPersonal
│  ├─ NavWork（展開列出各 Project，前面 Project Color Dot）
│  └─ NavCompleted / NavSettings
├─ TopBar
│  ├─ GlobalQuickAdd
│  ├─ GlobalSearch
│  └─ NotificationBell
├─ TaskDetailPanel（右側滑出，全站共用，用一個小型 UI store 控制開關）
└─ <route content>

TodayPage
├─ TodayScheduleCard / TodayTodoCard / TodayFollowUpCard / TodayReminderCard

CalendarPage
├─ AreaProjectFilter（左側篩選：Personal / Work → 底下勾 Project）
├─ ViewSwitcher（Month / Week / Day）
├─ MonthGrid / WeekGrid
└─ DayView
   ├─ TimelineTwoLane（AllDayRow、LaneWork、LanePersonal、TaskBlock）
   └─ QuadrantGrid（QuadrantCell × 4、QuadrantRow 可拖曳）

InboxPage → InboxList → InboxItemRow（快速操作）+ BatchActionBar
WaitingPage / ReviewPage → DelegationCard（deadline / follow-up / 操作按鈕）
ForgottenPage → ForgottenList
ProjectsPage → ProjectList → ProjectCard
ProjectDetailPage → ProjectHeader、ProjectStatsPanel、TaskListGroupedByStatus
SettingsPage → ColorSettings、GeneralSettings

共用：TaskDetailPanel（Subtasks、TimeLogList、TimerControl、ReminderList、RecurrenceEditor）
```

---

## E. State / Data Flow

1. **初次載入**：Server Component 讀 session；Client 端用 React Query hook 透過 `supabase-js`（RLS 範圍內）抓資料塞進快取。
2. **Mutation（例：拖曳改時間）**：先樂觀更新 Query Cache → 送出 Supabase update → 成功就對帳，失敗就 rollback + toast。
3. **Realtime**：其他裝置的變動觸發 Postgres change event → Realtime channel → 對應 query key `invalidateQueries` → 重抓 → UI 更新（自己剛做的樂觀更新會用本地 mutation id 過濾掉，避免自己的 realtime echo 把剛更新的畫面又蓋一次）。
4. **計時器**：`active_timers` 是唯一真相來源；畫面上的碼表只是本地用 `started_at` 算經過時間、每秒重繪，不會每秒寫 DB。按停止才寫一筆 `time_logs` 並刪掉 `active_timers`（用一個 Supabase RPC 包成單一交易，避免半途失敗留下孤兒資料）。
5. **重複事件**：Day/Week/Month 畫面用 `rrule` 針對「目前顯示區間」即時展開虛擬 instance，再跟 `recurrence_instances` 裡的例外資料（完成/修改/取消）合併；完成某一次，只會寫入/更新該 `(rule_id, instance_date)` 這一筆例外，绝不動到規則本身或其他次。
6. **工時加總**：一律走 B 節的 `task_actual_minutes` View（Project 統計同理），不要在前端各自加總，避免 Subtask 工時被重複計算兩次。

> **以資料庫為核心的原則**：畫面上任何一個看起來像「調整」的動作，最終都要對應到 B 節某張表的某個欄位，不能只停在畫面。對照表：
> - Day Timeline 拖曳（上下移動）→ 寫回 `tasks.scheduled_date` / `scheduled_start` / `scheduled_end`
> - Day Timeline 縮放 Resize → 只改 `scheduled_end`（起點不動）
> - 四象限拖到別的象限 → 寫回 `tasks.important` / `urgent`
> - Inbox 快速操作（今天/明天/選日期/加入專案/遺忘）→ 分別寫 `scheduled_date`、`project_id`、`forgotten_until`
> - 勾選完成 → 一般 Task/Todo 寫 `completed_at`；重複事件的某一次完成，寫入 `recurrence_instances.completed_at`（只動那一列，不動規則本身）
> - 「顯示/隱藏」類的選項（例如 Forgotten 不顯示未完成紅點、Waiting 不出現在 Today）→ 這些是**查詢條件**，不是刪除資料，資料本身永遠都在，只是列表用 `status`/`forgotten_until`/`follow_up_at` 過濾要不要呈現
>
> 目前 [Today 五種風格](https://claude.ai/code/artifact/82d298d2-099b-4030-8493-f110f86cdaea) 那份 mockup 是純前端 HTML／沒有接資料庫，拖曳、Resize、四象限拖放都只是視覺示範（程式碼裡標了 `TODO(real app)` 的地方）。等 Phase 3（Calendar）跟 Phase 4（四象限）動工時，這些互動會照上面對照表接上第 3 點講的「樂觀更新 → 放開滑鼠才真正寫入 Supabase」流程，不會有「畫面動了但資料庫沒動」的狀況。

---

## F. Development Phases

沿用規劃書第四十九節，順序不變，僅在此確認：

| Phase | 內容 |
|---|---|
| 1 | Next.js / Supabase / Auth / Schema / RLS / User Settings |
| 2 | Area、Project、顏色系統、Task、Todo、Inbox |
| 3 | Calendar（Month/Week/Day，Day 為 Work\|Personal 雙欄時間軸，含 Drag/Resize/全天） |
| 4 | 四象限（Important/Urgent） |
| 5 | Subtask、Reminder、重複任務 |
| 6 | Waiting、Assignee、Deadline、Follow-up、Review |
| 7 | Time Log、計時器、手動補登 |
| 8 | Project 工時統計 |
| 9 | Forgotten、搜尋、Archive、通知 |
| 10 | Mobile UX、效能、Realtime Sync、測試 |

---

## G. 需要特別避免的技術問題

1. **重複任務不能牽連未來 instance**：完成/修改只能寫入單一 `(rule_id, instance_date)` 例外列，程式碼層面禁止任何「批次更新某規則所有 instance」的路徑存在。
2. **時區與全天事件**：全天任務用 `date` 型別存 `scheduled_date`，不要用 `timestamptz` 推算「哪一天」，否則跨時區/日光節約會整天位移一天。
3. **拖曳/Resize 的即時同步競態**：樂觀更新 + Realtime 同時存在時，快速拖曳後緊接著別台裝置也在改，畫面可能閃爍或被自己剛送出的更新覆蓋回舊值。做法：拖曳中只更新本地 UI，放開滑鼠（dragend/resizeend）才真正送出寫入；並用本地 mutation id 過濾掉自己送出的 Realtime echo。
4. **工時重複計算**：DB 層用 CHECK constraint 強制 `time_logs` 只能屬於 task／subtask／todo 三選一；「Task 實際工時」永遠透過 View 一次性用 `task_id OR (該 task 底下的 subtask_id)` 加總，不要在前端把「Task 自己的 log」跟「Subtask 的 log」分開加總後再相加，容易重複算兩次。
5. **RLS 死角**：`recurrence_instances`、`notifications` 這類沒有直接業務意義但仍屬個人資料的表，一律直接放 `user_id` 欄位並用最簡單的 `user_id = auth.uid()` policy，不要用 join 到父表才判斷權限的寫法——join 型 policy 效能差也容易漏判。
6. **Soft Delete 外洩**：所有預設列表查詢都要記得加 `archived_at is null`，並在 `(user_id) where archived_at is null` 上建 partial index，避免資料變多後 Today / Inbox 變慢。
7. **遺忘箱到期**：沒有背景排程器（純 Supabase 前端架構），「遺忘到期回到 Inbox」不用寫 cron，改成查詢時直接判斷 `forgotten_until <= now()` 就視為已到期，畫面即時算，不用等某個 job 跑。
8. **顏色可讀性**：文字黑白不要存欄位，改色時容易忘記一起改；一律在渲染時用色塊 hex 即時算相對亮度決定文字色。
9. **Month 檢視效能**：重複事件展開範圍必須嚴格限制在「目前畫面顯示的日期區間」，不可以無限展開，否則重複規則一多，Month 畫面會很慢。

---

以上七項若沒有問題，回覆確認後就開始建立 Phase 1（Next.js + Supabase 專案初始化、Auth、完整 Schema/RLS migration、User Settings）。若某項想在動工前先調整（例如四象限要不要獨立路由、要不要先做 task_history），也可以先提出。
