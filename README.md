# Aftertask

個人使用的專案／任務／行事曆／時間管理系統。完整需求與架構規劃見 [docs/](docs)：

- [docs/個人專案任務行事曆時間管理系統_需求規劃.md](docs/個人專案任務行事曆時間管理系統_需求規劃.md)
- [docs/架構規劃_A-G.md](docs/架構規劃_A-G.md)

## 目前進度

**Phase 1 完成**：Next.js + Supabase 專案骨架、Email/Google 登入、完整 Schema + RLS migration、User Settings 自動初始化。

## 開發前設定（一次性）

1. 到 [supabase.com](https://supabase.com) 建立一個新專案。
2. 到 Supabase 專案的 **SQL Editor**，貼上並執行 [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) 的完整內容（之後每加一個 migration 檔案都要照順序執行一次）。
3. 到 **Authentication → Providers**：
   - Email 預設就有開，確認開著即可。
   - 開啟 Google，填入你自己申請的 Google OAuth Client ID / Secret（在 Google Cloud Console 建立 OAuth 用戶端，Authorized redirect URI 填 Supabase 專案的 `https://xxxx.supabase.co/auth/v1/callback`）。
4. 到 **Authentication → URL Configuration**，把 `http://localhost:3000/auth/callback` 加進 Redirect URLs（正式上線後再加正式網域的同路徑）。
5. 複製 `.env.local.example` 為 `.env.local`，填入該 Supabase 專案的 `Project URL` 與 `anon public key`（在 Settings → API 可以找到）。

## 本地開發

```bash
npm install
npm run dev
```

開 [http://localhost:3000](http://localhost:3000)，會導到 `/login`；註冊或用 Google 登入後導到 `/today`。

`/today` 目前只是驗證頁：確認登入後 `user_settings` 跟 `areas`（個人／工作）有透過 DB trigger 自動建立成功。真正的 Today／Calendar／Project 畫面從 Phase 2 開始建置，視覺方向見規劃文件裡的 Artifact 連結。

## 專案結構

```
src/
  app/
    (auth)/login, (auth)/signup     — 登入／註冊頁（共用 AuthForm）
    auth/callback/route.ts          — OAuth / Email 驗證信 callback
    (app)/layout.tsx                — 登入後的共用外殼（Phase 2 起會換成完整 Sidebar）
    (app)/today/page.tsx            — Phase 1 驗證頁
  components/auth/auth-form.tsx
  lib/supabase/{client,server,middleware}.ts
  middleware.ts                     — 每個 request 刷新 session、擋未登入使用者
supabase/migrations/0001_init.sql   — 完整 schema + RLS + 新使用者初始化
```
