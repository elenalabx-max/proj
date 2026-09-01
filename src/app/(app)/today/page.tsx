import { createClient } from "@/lib/supabase/server";

type UserSettings = {
  timezone: string;
  locale: string;
  personal_default_color: string;
  work_fallback_color: string;
  week_start: number;
  default_calendar_view: string;
  dark_mode: string;
};

type Area = {
  id: string;
  type: "personal" | "work";
  name: string;
};

export default async function TodayPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: areas }] = await Promise.all([
    supabase.from("user_settings").select("*").maybeSingle<UserSettings>(),
    supabase.from("areas").select("id, type, name").order("type"),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Today</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Phase 1：Auth、Schema、RLS、User Settings 已就緒。Today 畫面的實際內容從 Phase 2 開始建置。
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">User Settings</h2>
        {settings ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-neutral-500">Timezone</dt>
              <dd className="text-neutral-900">{settings.timezone}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Locale</dt>
              <dd className="text-neutral-900">{settings.locale}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">預設檢視</dt>
              <dd className="text-neutral-900">{settings.default_calendar_view}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Personal 預設色</dt>
              <dd className="flex items-center gap-2 text-neutral-900">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: settings.personal_default_color }}
                />
                {settings.personal_default_color}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Work Fallback 色</dt>
              <dd className="flex items-center gap-2 text-neutral-900">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: settings.work_fallback_color }}
                />
                {settings.work_fallback_color}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">週首日</dt>
              <dd className="text-neutral-900">{settings.week_start === 1 ? "星期一" : "星期日"}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-red-600">
            找不到 user_settings — 請確認 supabase/migrations/0001_init.sql 已在 Supabase 專案執行，
            且新帳號建立時的 trigger 有正確觸發。
          </p>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Areas</h2>
        {areas && areas.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-neutral-900">
            {areas.map((a: Area) => (
              <li key={a.id}>
                {a.type === "personal" ? "個人" : "工作"} — {a.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-red-600">找不到 areas 資料。</p>
        )}
      </section>
    </div>
  );
}
