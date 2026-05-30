# Phase 3 Implementation Plan

> **目标**：把 Phase 1 的 Supabase 客户端三件套 + Phase 2 的 `handle_new_user` trigger 接到完整的"注册 → 邮件验证 → 登录 → 忘密码 → 登出"用户旅程上；产出 Server Component 鉴权 helper；让 `(app)/*` 路由组自动重定向未登录用户。
> **依据**：`docs/migration-prd.md` v2.3 §4.3 + §3.4；`docs/api-inventory.md` A1-A11（Auth 11 条）；`docs/user-journeys.md` J1 / J9 / J10 / J12。
> **预算**：1 工作日（8 小时）。
> **状态**：待执行。
> **前置 Phase**：Phase 2 completed（4 个 migration + 测试通过 + Money 库 + types 生成）。

---

## 1. 交付物

| # | 路径 | 类型 | 用途 |
|---|---|---|---|
| F1 | `apps/web/app/(auth)/layout.tsx` | 新建 | Auth pages 公共布局（无 sidebar，居中卡片） |
| F2 | `apps/web/app/(auth)/sign-up/page.tsx` + `actions.ts` | 新建 | 注册：name + username + email + password 表单 + Server Action |
| F3 | `apps/web/app/(auth)/sign-in/page.tsx` + `actions.ts` | 新建 | 登录：email + password 表单 + Server Action |
| F4 | `apps/web/app/(auth)/verify-email/page.tsx` | 新建 | 注册后引导页（"我们已发邮件……"），含 resend 入口 |
| F5 | `apps/web/app/(auth)/forgot-password/page.tsx` + `actions.ts` | 新建 | 输入邮箱触发 `resetPasswordForEmail` |
| F6 | `apps/web/app/(auth)/reset-password/page.tsx` + `actions.ts` | 新建 | 邮件点链接进来设置新密码（要求 recovery session） |
| F7 | `apps/web/app/auth/callback/route.ts` | 新建 | Route Handler 处理邮件 confirm / recovery link 的 `?code=` PKCE 交换 |
| F8 | `apps/web/lib/auth/server.ts` | 新建 | `getUser()` / `requireUser()` / `getAppUser()` helper |
| F9 | `apps/web/lib/auth/actions.ts` | 新建 | `signOut()` Server Action（共用） |
| F10 | `apps/web/middleware.ts` 扩展 | 修改 | 加路由保护：`(app)/*` 未登录 → `/sign-in?redirectTo=...`；已登录访问 `(auth)/*` → `/dashboard` |
| F11 | `apps/web/app/(app)/layout.tsx` | 新建 | 受保护路由组布局；首句调 `requireUser()` |
| F12 | `apps/web/app/(app)/dashboard/page.tsx` | 新建 | 最小占位（Phase 4 才真做）：显示 `user.email` + 登出按钮 |
| F13 | `apps/web/app/page.tsx` | 修改 | 把 Phase 1 smoke test 改为根路由：已登录跳 `/dashboard`，未登录跳 `/sign-in` |
| F14 | `supabase/migrations/0005_handle_new_user_username.sql` | 新建 | 修订 Phase 2 trigger：同步 `username` 字段（解 §3 的 trigger gap） |
| F15 | `apps/web/components/ui/*` | 新建 | 最小 form / input / button / alert 组件（Tailwind） |

**不交付**：
- ❌ 业务页面（dashboard 真实内容、group / bill / settlement 都在 Phase 4-7）。
- ❌ OAuth provider（Google/GitHub）：本期只做邮箱密码。
- ❌ 双因素 / TOTP：超出 PRD 范围。
- ❌ Magic Link：PRD §2.2 选了邮箱密码，不切。
- ❌ shadcn/ui 全量接入：Phase 8 视觉迁移再考虑。

---

## 2. 前置条件

| ID | 任务 | 阻塞哪一步 |
|---|---|---|
| PRE-1 | Phase 2 已完成；云端项目 schema 已 push；`database.types.ts` 已生成 | Step 1 |
| PRE-2 | Supabase Dashboard → Authentication → URL Configuration：`Site URL` 设为 `http://localhost:3000`；`Redirect URLs` 加 `http://localhost:3000/auth/callback?type=signup` 和 `http://localhost:3000/auth/callback?type=recovery` | 验证邮件、reset 链接才能正常跳回 |
| PRE-3 | Authentication → Email Templates 可选自定义（本期用默认即可） | 不阻塞 |
| PRE-4 | Authentication → Providers → Email：确认"Enable email confirmations" 打开（默认开） | 验证流程要它 |

> Supabase 免费档**默认 SMTP** 限速：每小时 ~3 封发往未验证地址（用于注册/重置）。开发期可在 Dashboard → Auth → Email 关闭 confirmation 跑通 happy path，回头再开启验邮件全流程。

---

## 3. 关键决策

| ID | 决策 | 选择 | 理由 |
|---|---|---|---|
| D1 | Auth flow | **PKCE**（Supabase SSR 默认且强制） | `@supabase/ssr` 自动处理 code verifier，cookie-based |
| D2 | Form 提交 | **React Server Actions**（不用 client fetch） | 比 `'use client'` + fetch 少一半样板代码；表单 progressive enhancement 友好 |
| D3 | 鉴权 helper API | `getUser()` 返回 `User \| null`；`requireUser()` 重定向 + 返回 `User` | 对齐 Supabase 推荐：**永远用 `getUser()` 不用 `getSession()`**（后者只验 JWT 不查 server） |
| D4 | username 同步策略 | **修订 Phase 2 trigger**（F14），在 `handle_new_user` 内读 `raw_user_meta_data->>'username'` 并写入 `app_users.username` | 避免注册后再调一次 update profile；若 username 冲突让 trigger 抛错 → 注册失败 → 用户改 username 重试 |
| D5 | username 唯一性反馈 | trigger 抛 `unique_violation` (`23505`) → Server Action catch → form 显示 "username already taken" | DB 约束是真值，比注册时先 SELECT 检查省一次 round-trip 还避免 race |
| D6 | 密码强度策略 | 沿用 Supabase 默认（≥ 6 位）；UI 加最小校验提示 | PRD 没指定，跟默认；后续可在 Dashboard 调 |
| D7 | 邮件验证强制 | Phase 3 开发期可暂关；**生产前必开** | 与旧 .NET AuthService 行为对齐 |
| D8 | 受保护路由 | `(app)/layout.tsx` 调 `requireUser()` + `middleware.ts` 提前拦截 | 双层防御；middleware 省一次 redirect 往返 |
| D9 | `getAppUser()` 是否查 `public.app_users` | 是 | 拿 username / payment profile 需要查；登录态用 `getUser()`，业务字段用 `getAppUser()` |
| D10 | Logout 实现 | Server Action `signOut()`；form action 提交（不用 button + fetch） | 与 D2 一致 |

---

## 4. 用户旅程 → 文件 映射（对齐 user-journeys.md）

| 旅程 | 步骤 | 涉及文件 |
|---|---|---|
| J1.1-1.3 注册 + 验邮件 | A1 register → A11 verify | F2 sign-up + F7 callback + F4 verify-email + F14 trigger |
| J2.1-2.2 返回用户登录 | A2 login → A4 me | F3 sign-in + F8 server helper |
| J9.5 改密码后再登录 | A9 change-password → A2 | Phase 3 不实现 change-password（A9 留 Phase 8）；本期只做 forgot/reset |
| J10 忘密码 | A3 forgot → reset | F5 forgot-password + F6 reset-password + F7 callback |
| J12 旧 sync 接口（Clerk era） | A6 sync | **本期不实现**——PRD §1.5 决定丢弃 Clerk 资产，A6 不迁移 |

---

## 5. 输出模板（关键代码骨架）

### F8. `apps/web/lib/auth/server.ts`

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type AppUser = Database["public"]["Tables"]["app_users"]["Row"];

/** 拿登录态。未登录返回 null，不抛。 */
export async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

/** 强制登录，未登录直接 redirect (会抛 NEXT_REDIRECT)。 */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** 取业务镜像表数据（含 username/payment profile）。 */
export async function getAppUser(): Promise<AppUser | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
}
```

> **重要**（Supabase skill 强调）：业务始终用 `auth.getUser()` 不用 `auth.getSession()`——前者会回服务器验 token 真实性，后者只解码 JWT 不验签，可被 cookie 篡改欺骗。

### F2. `apps/web/app/(auth)/sign-up/actions.ts`

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SignUpResult = { error: string | null };

export async function signUp(_prev: SignUpResult, formData: FormData): Promise<SignUpResult> {
  const name = (formData.get("name") as string)?.trim();
  const username = (formData.get("username") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  // 客户端已校验过，server 这里只做必要兜底
  if (!name || !email || !password) return { error: "All fields are required" };
  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  if (username && !/^[a-z0-9_]{3,30}$/i.test(username)) {
    return { error: "Username must be 3-30 chars, alphanumeric or underscore" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // raw_user_meta_data —— trigger 读这里
      data: { name, username: username || null },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=signup`,
    },
  });

  if (error) {
    // Supabase 把 trigger 抛的 23505 (unique_violation) 包成 "Database error saving new user"
    if (error.message.toLowerCase().includes("database error")) {
      return { error: "Email or username already taken" };
    }
    return { error: error.message };
  }

  redirect("/verify-email");
}
```

### F7. `apps/web/app/auth/callback/route.ts`

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** PKCE flow callback for email confirm / password recovery. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // 'signup' | 'recovery' | 'email_change'
  const next = searchParams.get("redirectTo") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_code", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, origin)
    );
  }

  // recovery 走完 exchange 拿到一个临时 session，引导用户去 reset-password
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
```

### F10. `apps/web/middleware.ts`（扩展 Phase 1 版本）

```ts
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-email"];
const APP_PATHS_REGEX = /^\/(dashboard|groups|bills|settlements|invitations|settings)/;

export async function middleware(request: NextRequest) {
  // 1. 让 Supabase SSR helper 处理 session 刷新
  const response = await updateSession(request);

  // 2. 在已有 cookie 基础上读 user 做路由保护
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}, // 不再写，updateSession 已经写过了
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 未登录访问 (app)/*  → /sign-in
  if (!user && APP_PATHS_REGEX.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 已登录访问 sign-in/sign-up → /dashboard
  if (user && PUBLIC_PATHS.some((p) => pathname.startsWith(p) && p !== "/verify-email" && p !== "/reset-password")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

### F14. `supabase/migrations/0005_handle_new_user_username.sql`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, name, username, created_at_utc)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'username', ''),  -- 空串当 NULL
    now()
  );
  RETURN NEW;
END;
$$;
```

> 注意：username 冲突会 raise `unique_violation` → Supabase Auth 把它包装为 "Database error saving new user" → Sign-up Server Action 友好提示。

### F13. `apps/web/app/page.tsx`（替换 Phase 1 smoke test）

```tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";

export default async function Root() {
  const user = await getUser();
  redirect(user ? "/dashboard" : "/sign-in");
}
```

---

## 6. 执行步骤（8 小时时间盒）

| 时段 | 任务 | 输出 |
|---|---|---|
| 0:00-0:30 | PRE-2/3/4 在 Supabase Dashboard 配置；本地 `apps/web/.env.local` 加 `NEXT_PUBLIC_SITE_URL=http://localhost:3000` | 环境就绪 |
| 0:30-1:00 | 写 F14 `0005_handle_new_user_username.sql` + `supabase db push` 应用；Studio 确认 trigger 已更新 | trigger v2 上线 |
| 1:00-2:00 | 写 F8 `lib/auth/server.ts` + F15 最小 form/button/input UI 组件 | helper + UI primitives |
| 2:00-3:30 | 写 F2 sign-up 页 + Server Action；本地走通注册 + 收到验证邮件 + trigger 镜像到 `app_users` | 注册旅程 |
| 3:30-4:30 | 写 F3 sign-in + F7 callback Route Handler | 登录 + PKCE 交换 |
| 4:30-5:00 | 写 F4 verify-email 引导页（含 resend 按钮调 `supabase.auth.resend`） | 验证 UX |
| 5:00-6:00 | 写 F5 forgot-password + F6 reset-password 完整链路 | 忘密码 |
| 6:00-6:45 | 扩展 F10 middleware + 写 F11 (app)/layout.tsx + F12 dashboard 占位 + F13 根路由 | 路由保护 |
| 6:45-7:30 | 写 F9 signOut Server Action + 把 dashboard 按钮接上；测试登出 → 自动重定向 | 完整闭环 |
| 7:30-8:00 | 跑验收清单（§7）；commit | Phase 3 关闭 |

---

## 7. 验收清单

### 7.1 注册 + 验证邮件
- [ ] 在 `/sign-up` 填齐 name/username/email/password → 提交 → 跳 `/verify-email` 引导页。
- [ ] Supabase Dashboard → Auth → Users 看到新用户，`email_confirmed_at = null`。
- [ ] `public.app_users` 同步出现一行，含 `username`（不是 null）和 `name`（trigger 起效）。
- [ ] 收到验证邮件；点链接跳回 `/auth/callback?code=...&type=signup` → 成功 → 跳 `/dashboard`。
- [ ] Auth → Users 的 `email_confirmed_at` 现在有值。
- [ ] **越权测试**：用 username 重复的邮箱再注册 → 友好提示 "Email or username already taken"，不是 raw "Database error saving new user"。

### 7.2 登录 / 登出
- [ ] 退出（清 cookie 或调 signOut）后在 `/sign-in` 输已注册邮箱密码 → 跳 `/dashboard`。
- [ ] dashboard 显示 `user.email`。
- [ ] 点登出按钮 → 跳 `/sign-in`；cookie 已清。

### 7.3 忘密码
- [ ] 在 `/forgot-password` 输邮箱 → 收到 recovery 邮件。
- [ ] 点链接跳 `/auth/callback?code=...&type=recovery` → 跳 `/reset-password`。
- [ ] 输入新密码 → 提交 → 跳 `/sign-in`。
- [ ] 用新密码登录成功。

### 7.4 路由保护
- [ ] 未登录访问 `/dashboard` → 跳 `/sign-in?redirectTo=/dashboard`；登录后跳回 `/dashboard`。
- [ ] 已登录访问 `/sign-in` → 跳 `/dashboard`。
- [ ] 未登录访问 `/verify-email` 或 `/reset-password` → **不**被强制重定向（这两条是 auth flow 中转页，需要允许未登录访问）。

### 7.5 代码质量
- [ ] `pnpm --filter splity-web typecheck` 通过。
- [ ] `grep -rn "auth.getSession()" apps/web/` 命中 0 次（必须 getUser()）。
- [ ] `grep -rn "createAdminClient(" apps/web/` 仍命中 0 次（service_role 没被引入业务路径）。
- [ ] Server Actions 都标了 `"use server"`，没有意外把 service_role 漏到 client。
- [ ] 旧 `apps/web/app/page.tsx` smoke test 已替换为根路由 redirect。

### 7.6 PRD 对齐
- [ ] `docs/api-inventory.md` A1 (register) / A2 (login) / A3 (forgot-password) / A4 (me, 隐式) / A11 (email-verification/verify) 五条在新版可对应：A1→sign-up + trigger / A2→sign-in / A3→forgot-password / A4→`getUser()`+`getAppUser()` / A11→`/auth/callback`。
- [ ] **A5 / A6 / A7 / A8 / A9 / A10 暂留 Phase 4 或更后**：A5 用户名搜索 → Phase 4（邀请用）；A6 sync → 弃用；A7 update profile / A8 payment profile / A9 change password / A10 resend verify → Phase 8 settings 页。

---

## 8. 风险清单

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| P3-R1 | Supabase 免费档 SMTP 限速触发，注册期间收不到邮件 | 🔴 高 | 开发时去 Dashboard Auth → Email 暂关 confirmation；或自配 SMTP（SendGrid 免费档 100/day）；UI 加"未收到？"提示 |
| P3-R2 | Trigger username 冲突错误信息被 Supabase 包装成模糊的 "Database error saving new user" | 🟡 中 | Server Action 内字符串匹配 + 友好提示（F2 模板已示范）；长期可改 trigger 用 SECURITY DEFINER 主动 RAISE 友好 message |
| P3-R3 | 误用 `auth.getSession()` 在 Server Component（不验签会被 cookie 篡改） | 🔴 高 | F8 helper 强制 `getUser()`；§7.5 加 grep 断言 |
| P3-R4 | middleware 太宽，把 `/auth/callback` 也拦了导致 PKCE 交换失败 | 🟡 中 | F10 模板已排除 `/auth/callback`（不在 PUBLIC_PATHS 显式列表内，但也不在 APP_PATHS 内，自然不触发拦截） |
| P3-R5 | 邮件链接里的 `redirectTo` 没在 Dashboard Redirect URLs 白名单内 → Supabase 拒绝 | 🟢 低 | PRE-2 已要求加入 |
| P3-R6 | 已登录用户 cookie 过期后访问 `(app)/*`，middleware 拿到 stale session → 误跳 dashboard | 🟢 低 | `updateSession` 已经会刷新；万一失败 `getUser()` 返回 null 走未登录分支 |
| P3-R7 | Server Action 在 form 默认走 POST，CSRF 由 Next.js 自动加 token，但开发期偶尔报 "Invalid Server Action signature" | 🟢 低 | 重启 dev server；不影响生产 |
| P3-R8 | 用户卡在 `/verify-email` 但邮件链接已过期（默认 24h） | 🟡 中 | F4 verify-email 页带 "Resend" 按钮，调 `supabase.auth.resend({ type: 'signup', email })` |

---

## 9. 完成后立即触发

1. 标 Phase 3 → completed，Phase 4 → in_progress。
2. **强烈建议**：commit message 用 `feat(auth): supabase auth flow + protected routes (phase 3)`；含 0005 trigger migration。
3. 进入 **Phase 4 plan 生成**：Groups + Participants CRUD，含跨账号 RLS 端到端测试（用 Phase 3 真注册的两个账号跑 J3 邀请旅程的子集）。

---

**文档结束**
