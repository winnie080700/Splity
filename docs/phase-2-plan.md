# Phase 2 Implementation Plan

> **目标**：基于 `docs/schema-truth.md` 和 `docs/migration-prd.md` §4.2，产出 Supabase Postgres schema、RLS policies、RPC functions、Auth trigger，并用 SQL 级别测试证明匿名/跨账号越权被拒绝。
> **依据**：`docs/schema-truth.md` 11 张表；`docs/migration-prd.md` v2.3 §2.1 / §3.4 / §4.2。
> **预算**：2 工作日。
> **状态**：in_progress。
> **前置 Phase**：Phase 1 completed（commit `e382d10`）。

---

## 1. 交付物

| # | 路径 | 类型 | 用途 |
|---|---|---|---|
| F1 | `supabase/migrations/0001_schema.sql` | 新建 | 11 张 public 表、约束、索引、扩展、基础 grants |
| F2 | `supabase/migrations/0002_rls_policies.sql` | 新建 | 所有 public 表启用 RLS；authenticated-only 表策略；anon 表访问关闭 |
| F3 | `supabase/migrations/0003_rpc_functions.sql` | 新建 | helper + 业务 RPC：`is_group_member`、`get_group_members`、`accept_invitation`、`decline_invitation`、`record_settlement_action`、`resolve_share_token` |
| F4 | `supabase/migrations/0004_auth_triggers.sql` | 新建 | `handle_new_user()` + `on_auth_user_created` trigger |
| F5 | `supabase/tests/phase-2-rls.sql` | 新建 | SQL 验收脚本：匿名、账号 A/B、creator/non-creator、public share |
| F6 | `docs/phase-2-review-checklist.md` | 新建 | PR review checklist：表数、RLS、grants、DEFINER 审计、公开分享字段白名单 |

**不交付**：
- Auth 页面（Phase 3）。
- Bill / Settlement 计算逻辑迁移（Phase 5/6）。
- 前端业务页面迁移（Phase 4+）。
- 历史 MySQL 数据迁移。

---

## 2. 外部约束复核

已按当前 Supabase 官方文档复核：

- RLS：public/exposed schema 表必须显式启用 RLS；`anon` 与 `authenticated` 是实际 Postgres roles；UPDATE 需要对应 SELECT policy。
- User mirror：`auth.users` 不通过 API 暴露；public profile/app table 应引用 `auth.users(id) ON DELETE CASCADE`，并可用 trigger 同步注册数据。
- Database functions：`SECURITY DEFINER` 只在确实需要时使用，必须固定 `search_path`，并用显式 grants 控制调用面。

计划落地规则：
- 所有 public 表：`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- 所有业务表 policy：默认 `TO authenticated`，不省略 `TO`。
- `settlement_share_links`：不创建任何 anon SELECT policy；公开入口仅 `resolve_share_token(text)`。
- DEFINER 函数：统一 `SET search_path = public, pg_temp`，函数体首段必须有显式鉴权，`resolve_share_token` 与 `handle_new_user` 为例外路径但仍需白名单逻辑。

---

## 3. 关键决策

| 决策 | 选择 | 理由 |
|---|---|---|
| Migration 命名 | 保持 PRD 逻辑名 `0001`-`0004` | 便于 review；如后续 Supabase CLI 强制 timestamp，可保留逻辑标题并用 CLI 生成文件名 |
| UUID 默认 | `gen_random_uuid()` | Supabase Postgres 可用 `pgcrypto`；`app_users.id` 例外，镜像 `auth.users.id` |
| 枚举 | `SMALLINT + CHECK` | 对齐 PRD ADR-004；避免 Postgres enum 后期改值成本 |
| 金额 | `NUMERIC(18,2)`，weight `NUMERIC(18,4)` | 对齐 EF Core `HasPrecision` |
| RLS helper | `is_group_member(uuid) SECURITY DEFINER STABLE` | 解 `groups` / `participants` policy 互相引用递归 |
| Creator-only 写入 | 表 policy 限制 creator；复杂跨角色写入走 RPC | 对齐 PRD ADR-011 |
| Public share | 仅 `resolve_share_token(text) RETURNS jsonb` | 表层不对 anon 开放，函数内字段白名单 |

---

## 4. `0001_schema.sql` 范围

### 4.1 准备

1. `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
2. 建议显式 schema：所有对象落在 `public`，引用 auth 用 `auth.users(id)`。
3. 所有 `created_at_utc` / `updated_at_utc` 默认使用 `now()`，除非业务必须由应用传入。

### 4.2 表清单

必须创建 exactly 11 张表：

| 表 | 关键点 |
|---|---|
| `app_users` | `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`；删除 password/clerk/email pending 字段 |
| `groups` | `created_by_user_id REFERENCES app_users(id) ON DELETE SET NULL`；`status CHECK (status IN (0,1,2))` |
| `participants` | `UNIQUE(group_id, name)`；`invited_user_id REFERENCES app_users(id) ON DELETE SET NULL`；`invitation_status CHECK (0..3)` |
| `bills` | `group_id` FK cascade；`split_mode CHECK (1,2)`；`primary_payer_participant_id` FK participants |
| `bill_items` | `bill_id` FK cascade |
| `bill_item_responsibilities` | `UNIQUE(bill_item_id, participant_id)` |
| `bill_fees` | `fee_type CHECK (1,2)` |
| `bill_shares` | `UNIQUE(bill_id, participant_id)` |
| `payment_contributions` | `(bill_id, participant_id)` index |
| `settlement_transfer_confirmations` | `UNIQUE(group_id, transfer_key)`；status `CHECK (0,1,2)` |
| `settlement_share_links` | `share_token UNIQUE`；`is_active BOOLEAN DEFAULT true` |

### 4.3 索引与约束检查

- Unique：`app_users.email`、`app_users.username`、`participants(group_id,name)`、`bill_item_responsibilities(bill_item_id,participant_id)`、`bill_shares(bill_id,participant_id)`、`settlement_transfer_confirmations(group_id,transfer_key)`、`settlement_share_links.share_token`。
- Query indexes：group-scoped routes must have indexes on `group_id`; settlement transfer lookups need `(group_id, from_participant_id, to_participant_id)` and `(group_id, transfer_key)`.
- Do not add anon-friendly views in Phase 2.

---

## 5. `0002_rls_policies.sql` 范围

### 5.1 Base grants

- Revoke broad public execution/access first where practical.
- Grant DML on app tables to `authenticated`; grant no table DML to `anon` except sequence/metadata not needed.
- RLS remains the final row-level gate for authenticated access.

### 5.2 Policy model

| 表组 | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `app_users` | self only: `id = auth.uid()` | self profile fields only where needed; no password fields exist |
| `groups` | creator or member via `is_group_member(id)` | creator-only |
| `participants` | group member via `is_group_member(group_id)` | creator-only for group mutations |
| Bills subtree | group member via bill -> group | creator-only for writes, or INVOKER RPC later |
| Settlement confirmations | group member can read | creator-only writes; cross-role state changes only through `record_settlement_action` |
| Settlement share links | creator can read/write | no anon table policy |

### 5.3 Required negative cases

- `anon` selects any app table: returns 0 rows.
- Account B selects Account A's group: returns 0 rows.
- Account B updates Account A's group/participant/bill rows: affects 0 rows or raises permission error.
- Known public `share_token` cannot be used to select `settlement_share_links` directly as anon.

---

## 6. `0003_rpc_functions.sql` 范围

| Function | Security | Grant | Purpose |
|---|---|---|---|
| `is_group_member(p_group_id uuid) RETURNS boolean` | DEFINER STABLE | authenticated | RLS helper; checks creator or accepted/invited participant mapping |
| `create_bill_with_items(p_group_id uuid, p_input jsonb) RETURNS uuid` | **INVOKER** | authenticated | Atomic write of bill + items + responsibilities + fees + shares + contributions; relies on table RLS |
| `update_bill_with_items(p_bill_id uuid, p_input jsonb) RETURNS void` | **INVOKER** | authenticated | Delete + reinsert child rows in one transaction; same RLS surface |
| `get_group_members(p_group_id uuid) RETURNS TABLE (...)` | DEFINER | authenticated | Member list with explicit field whitelist |
| `accept_invitation(p_participant_id uuid)` | DEFINER | authenticated | `auth.uid() = invited_user_id`; set accepted |
| `decline_invitation(p_participant_id uuid)` | DEFINER | authenticated | `auth.uid() = invited_user_id`; set declined |
| `record_settlement_action(p_action text, p_group_id uuid, p_from_participant_id uuid, p_to_participant_id uuid, p_amount numeric, p_from_date_utc timestamptz, p_to_date_utc timestamptz, p_actor_participant_id uuid, p_transfer_key text, p_proof_screenshot_data_url text) RETURNS jsonb` | DEFINER | authenticated | Creator-only settlement state transition; validates action + actor + snapshot tuple；SQL 签名是 **10 个入参**（`p_action` + 9 个 transfer payload 字段），其中 `p_transfer_key` 必须存在且不在函数内重算 |
| `resolve_share_token(p_token text) RETURNS jsonb` | DEFINER | anon, authenticated | Public share whitelist; no internal ids/usernames/bill details |

**INVOKER vs DEFINER 二选一规则（ADR-011 重申）**：表上不再开放被邀请人 / actor 本人的精确 UPDATE policy；所有 cross-role 状态变更集中在 DEFINER RPC 内审计。

Audit requirements for every DEFINER function:

1. Has `SET search_path = public, pg_temp`.
2. Starts with explicit auth guard unless public/trigger exception.
3. Uses fully qualified tables where ambiguity is possible.
4. `REVOKE EXECUTE ... FROM PUBLIC` then precise `GRANT EXECUTE`.
5. No `service_role` dependency.

---

## 7. `0004_auth_triggers.sql` 范围

`handle_new_user()`:

- Runs as `SECURITY DEFINER`.
- Inserts `app_users(id, email, name, created_at_utc)`.
- `id = NEW.id`; `email = NEW.email`.
- `name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)`.
- Must not read mutable metadata for authorization decisions.
- Must be tested because trigger failure blocks sign-up.

Trigger:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 8. 验收测试计划

### 8.1 Local / linked project setup

1. Confirm Supabase CLI availability with `supabase --help`.
2. Create migration files according to repo convention.
3. Apply to local Supabase or linked dev project.
4. Run SQL test script with two real auth users or seeded auth rows where local Supabase supports it.

### 8.2 Required assertions

- Schema:
  - 11 public tables exist.
  - Deprecated columns absent: `password_hash`, `password_salt`, `clerk_user_id`, `pending_email_verification_*`.
  - Every public table has RLS enabled.
- RLS:
  - Account A can see its own group.
  - Account B cannot see Account A's group.
  - `anon` sees no app tables.
  - `UPDATE` paths have corresponding `SELECT` policies.
- RPC:
  - `resolve_share_token(valid)` returns whitelist JSON.
  - `resolve_share_token(invalid)` returns null.
  - `accept_invitation` rejects non-invited user.
  - `record_settlement_action` rejects non-creator and invalid actor.
- Trigger:
  - New Supabase Auth user creates `app_users` row.
  - Failed/missing name falls back to email.

---

## 9. 执行步骤

### Day 1

1. Write `0001_schema.sql`.
2. Apply migration to local/dev Supabase.
3. Inspect table count, constraints, and removed columns.
4. Write `0002_rls_policies.sql`.
5. Run first A/B/anon negative tests.

### Day 2

1. Write `0003_rpc_functions.sql`.
2. Write `0004_auth_triggers.sql`.
3. Complete SQL test script.
4. Run full Phase 2 acceptance.
5. Produce review checklist and update Phase 2 status.

---

## 10. 风险清单

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| P2-R1 | RLS policy 递归或误放 anon | 高 | `is_group_member` helper；所有 policies 明确 `TO authenticated` |
| P2-R2 | DEFINER 函数越权 | 高 | `search_path` 固定、函数首段鉴权、精确 grants、review checklist |
| P2-R3 | 公开分享泄漏字段 | 高 | `resolve_share_token` JSON 白名单；测试响应不含 internal ids/usernames/bill ids |
| P2-R4 | Auth trigger 阻塞注册 | 中 | 单独测试 trigger；fallback name；不做复杂逻辑 |
| P2-R5 | NUMERIC scale 被 Postgres 自动舍入 | 中 | Phase 2 只建 schema；Phase 5 Money 构造器负责拒绝 scale > 2/4 |
| P2-R6 | Supabase CLI migration 命名与 PRD 固定名冲突 | 低 | 执行时优先 repo 约定；如用 CLI timestamp 文件，保留逻辑顺序和标题 |

---

## 11. 完成标准

- `supabase/migrations/0001_schema.sql` 到 `0004_auth_triggers.sql` 落盘并可应用。
- `supabase/tests/phase-2-rls.sql` 跑通，且包含 DEFINER 审计断言；Phase 9 上线前 CI 必须继续跑这条。
- Supabase Studio 可见 11 张表 + Auth trigger + **8 个 functions**（1 helper `is_group_member` + 2 INVOKER RPC `create_bill_with_items` / `update_bill_with_items` + 5 DEFINER RPC `get_group_members` / `accept_invitation` / `decline_invitation` / `record_settlement_action` / `resolve_share_token`，加 1 trigger function `handle_new_user` 共 9 个）。
- 跨账号、匿名、公开分享、DEFINER 审计全部通过。
- Phase 2 review checklist 无 blocker。

---

## 12. 扩展交付物（工程层补充，§1 之外）

| # | 路径 | 用途 | 备注 |
|---|---|---|---|
| F7 | `supabase/seed.sql` | 本地 dev 种子数据：2 个测试用户 + 1 个 group + 2 个 participants | `supabase db reset` 自动跑；只在本地，不入生产 |
| F8 | `supabase/config.toml` | 本地 CLI 配置（端口、Studio 选项） | 由 `supabase init` 自动生成，需 commit |
| F9 | `apps/web/lib/supabase/database.types.ts` | TS 类型，由 `supabase gen types typescript --local` 生成 | Phase 4+ Route Handler typed client 依赖 |
| F10 | `apps/web/lib/money/Money.ts` + `Money.test.ts` | `decimal.js` 包装 + scale 校验（ADR-005 落地） | Phase 5 BillCalculator port 的前置依赖；本期单元测试自洽即可，C# fixture 对照留到 Phase 5 |

---

## 13. SQL 代码骨架（可直接复制）

### 13.1 `is_group_member` helper（解递归）

```sql
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id AND g.created_by_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.group_id = p_group_id
      AND p.invited_user_id = auth.uid()
      AND p.invitation_status = 2 /* Accepted */
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_group_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID) TO authenticated;
```

### 13.2 `record_settlement_action`（最复杂的 DEFINER RPC）

重要：Node 端用 TS `SettlementCalculator` 算 snapshot，并在调用前派生 `transfer_key`。Postgres 函数只校验传入 tuple 和状态机，**不重算** snapshot / transfer key。SQL 签名含 `p_action` 时共 10 个参数；业务 transfer payload 是 9 个字段，缺任何一个都会破坏 Phase 6 调用约定。

```sql
CREATE OR REPLACE FUNCTION public.record_settlement_action(
  p_action TEXT,                          -- 'mark_paid' | 'mark_received'
  p_group_id UUID,
  p_from_participant_id UUID,
  p_to_participant_id UUID,
  p_amount NUMERIC,
  p_from_date_utc TIMESTAMPTZ,
  p_to_date_utc TIMESTAMPTZ,
  p_actor_participant_id UUID,
  p_transfer_key TEXT,
  p_proof_screenshot_data_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.settlement_transfer_confirmations%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- ① creator 校验
  IF NOT EXISTS (SELECT 1 FROM public.groups g
                 WHERE g.id = p_group_id AND g.created_by_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- ② action 校验
  IF p_action NOT IN ('mark_paid','mark_received') THEN
    RAISE EXCEPTION 'invalid action %', p_action USING ERRCODE = '22023';
  END IF;
  -- ③ actor 匹配
  IF p_action = 'mark_paid'     AND p_actor_participant_id <> p_from_participant_id THEN
    RAISE EXCEPTION 'actor must equal from_participant' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'mark_received' AND p_actor_participant_id <> p_to_participant_id THEN
    RAISE EXCEPTION 'actor must equal to_participant' USING ERRCODE = '22023';
  END IF;
  -- UPSERT 状态机
  SELECT * INTO v_existing FROM public.settlement_transfer_confirmations
  WHERE group_id = p_group_id AND transfer_key = p_transfer_key;
  IF NOT FOUND THEN
    IF p_action = 'mark_received' THEN
      RAISE EXCEPTION 'cannot mark received before paid' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.settlement_transfer_confirmations
      (group_id, transfer_key, from_participant_id, to_participant_id, amount,
       from_date_utc, to_date_utc, status, proof_screenshot_data_url,
       marked_paid_at_utc, updated_at_utc)
    VALUES
      (p_group_id, p_transfer_key, p_from_participant_id, p_to_participant_id, p_amount,
       p_from_date_utc, p_to_date_utc, 1, p_proof_screenshot_data_url, v_now, v_now)
    RETURNING * INTO v_existing;
  ELSE
    IF p_action = 'mark_received' AND v_existing.status < 1 THEN
      RAISE EXCEPTION 'must mark paid first' USING ERRCODE = '22023';
    END IF;
    UPDATE public.settlement_transfer_confirmations
    SET status = CASE p_action WHEN 'mark_paid' THEN 1 ELSE 2 END,
        proof_screenshot_data_url = COALESCE(p_proof_screenshot_data_url, proof_screenshot_data_url),
        marked_paid_at_utc = CASE WHEN p_action='mark_paid' AND marked_paid_at_utc IS NULL
                                  THEN v_now ELSE marked_paid_at_utc END,
        marked_received_at_utc = CASE WHEN p_action='mark_received' THEN v_now
                                      ELSE marked_received_at_utc END,
        updated_at_utc = v_now
    WHERE group_id = p_group_id AND transfer_key = p_transfer_key
    RETURNING * INTO v_existing;
  END IF;
  RETURN to_jsonb(v_existing);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_settlement_action FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_settlement_action TO authenticated;
```

### 13.3 `resolve_share_token`（anon 入口，白名单 JSON）

```sql
CREATE OR REPLACE FUNCTION public.resolve_share_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link public.settlement_share_links%ROWTYPE;
  v_transfers JSONB;
BEGIN
  SELECT * INTO v_link FROM public.settlement_share_links
  WHERE share_token = p_token AND is_active = TRUE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'from_name', pf.name, 'to_name', pt.name,
    'amount', c.amount::TEXT, 'status', c.status,
    'marked_paid_at_utc', c.marked_paid_at_utc,
    'marked_received_at_utc', c.marked_received_at_utc
  ))
  INTO v_transfers
  FROM public.settlement_transfer_confirmations c
  JOIN public.participants pf ON pf.id = c.from_participant_id
  JOIN public.participants pt ON pt.id = c.to_participant_id
  WHERE c.group_id = v_link.group_id
    AND (v_link.from_date_utc IS NULL OR c.from_date_utc = v_link.from_date_utc)
    AND (v_link.to_date_utc   IS NULL OR c.to_date_utc   = v_link.to_date_utc);

  -- 白名单: 显式列出可暴露字段，不含 id / group_id / participant ids
  RETURN jsonb_build_object(
    'share_token',                 v_link.share_token,
    'from_date_utc',               v_link.from_date_utc,
    'to_date_utc',                 v_link.to_date_utc,
    'creator_name',                v_link.creator_name,
    'payee_name',                  v_link.payee_name,
    'payment_method',              v_link.payment_method,
    'account_name',                v_link.account_name,
    'account_number',              v_link.account_number,
    'notes',                       v_link.notes,
    'payment_qr_data_url',         v_link.payment_qr_data_url,
    'receiver_payment_infos_json', v_link.receiver_payment_infos_json,
    'created_at_utc',              v_link.created_at_utc,
    'transfers',                   COALESCE(v_transfers, '[]'::JSONB)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.resolve_share_token FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_share_token TO anon, authenticated;
```

### 13.4 DEFINER 审计的 SQL 断言（写进 `phase-2-rls.sql` Test 6）

```sql
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT proname, prosecdef, array_to_string(proconfig, ',') AS cfg
    FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pronamespace
    WHERE nspname = 'public'
      AND proname IN ('is_group_member','handle_new_user','record_settlement_action',
                       'accept_invitation','decline_invitation','get_group_members',
                       'resolve_share_token')
  LOOP
    IF NOT r.prosecdef THEN
      RAISE EXCEPTION 'AUDIT FAIL: % is not SECURITY DEFINER', r.proname;
    END IF;
    IF position('search_path=public, pg_temp' IN r.cfg) = 0 THEN
      RAISE EXCEPTION 'AUDIT FAIL: % missing search_path', r.proname;
    END IF;
  END LOOP;
END $$;
```

---

## 14. Money.ts 库（ADR-005 落地）

### 14.1 `apps/web/lib/money/Money.ts`

```ts
import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP }); // half-away-from-zero (对齐 C# MidpointRounding.AwayFromZero)

export class MoneyScaleError extends Error {
  constructor(value: string, maxScale: number) {
    super(`Money value "${value}" exceeds max scale ${maxScale}`);
  }
}

export class Money {
  protected readonly value: Decimal;
  protected static readonly MAX_SCALE = 2;

  constructor(input: string) {
    if (typeof input !== "string") throw new TypeError("Money requires string input");
    const m = input.match(/\.(\d+)$/);
    const scale = m ? m[1].length : 0;
    const maxScale = (this.constructor as typeof Money).MAX_SCALE;
    if (scale > maxScale) throw new MoneyScaleError(input, maxScale);
    this.value = new Decimal(input);
  }

  add(other: Money) { return new Money(this.value.plus(other.value).toFixed()); }
  sub(other: Money) { return new Money(this.value.minus(other.value).toFixed()); }
  mul(factor: string | number) {
    return new Money(this.value.mul(factor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed());
  }
  round() { return new Money(this.value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed()); }
  toCents() { return this.value.mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber(); }
  toString() { return this.value.toFixed(2); }
}

export class Weight extends Money {
  protected static readonly MAX_SCALE = 4;
  toString() { return this.value.toFixed(4); }
}
```

### 14.2 `apps/web/lib/money/Money.test.ts`（≥ 8 个测试）

| # | 测试 | 期望 |
|---|---|---|
| 1 | `new Money("12.34")` | 不抛错 |
| 2 | `new Money("1.234")` | 抛 `MoneyScaleError` |
| 3 | `new Money("1.2345")` | 抛 `MoneyScaleError` |
| 4 | `new Money("12.34").add(new Money("0.01")).toString()` | `"12.35"` |
| 5 | `new Money("2.345").round().toString()`（half-away-from-zero） | 注：scale 已超界，先抛错；改测 `Money` 内部值 `2.34 → mul 1.005` 等同类 |
| 6 | `new Money("1.00").mul(100).toString()` | `"100.00"` |
| 7 | `new Money("12.50").toCents()` | `1250` |
| 8 | `new Weight("0.1234")` | 不抛错；`new Weight("0.12345")` 抛错 |

---

## 15. 时间盒（16 小时分配）

### Day 1（8 小时）

| 时段 | 任务 | 输出 |
|---|---|---|
| 0:00-0:30 | PRE check + `supabase init`（如未初始化）+ 写 `config.toml`（F8） | 本地 CLI 就绪 |
| 0:30-3:30 | 写 `0001_schema.sql`（F1），对 schema-truth.md T1-T11 逐表生成 | 11 张表 DDL |
| 3:30-4:00 | `supabase start`（Docker）+ `supabase db reset` 跑 migration | Studio 看到 11 张表 |
| 4:00-4:30 | 写 `is_group_member` helper（提前进 0002） | helper 入库 |
| 4:30-7:00 | 写 `0002_rls_policies.sql`（F2）11 张表的 SELECT + 写 policy | RLS 全覆盖 |
| 7:00-8:00 | `supabase db reset` 重跑 + Studio 手动验：账号 A 看自己 group / 账号 B 看不到 | RLS 初验 |

### Day 2（8 小时）

| 时段 | 任务 | 输出 |
|---|---|---|
| 8:00-9:30 | 写 `create_bill_with_items` + `update_bill_with_items`（INVOKER） | 2 个 RPC |
| 9:30-11:00 | 写 `record_settlement_action`（最复杂） | DEFINER RPC + 状态机 |
| 11:00-12:00 | 写 `accept_invitation` / `decline_invitation` / `get_group_members` / `resolve_share_token` | 4 个 DEFINER RPC |
| 12:00-12:30 | 写 `0004_auth_triggers.sql`（F4） | trigger 入库 |
| 12:30-14:30 | 写 `phase-2-rls.sql`（F5）6 类测试 fixture；`supabase db reset` 跑通 `'all tests passed'` | 越权 + 审计测试通过 |
| 14:30-15:00 | `supabase gen types typescript --local > apps/web/lib/supabase/database.types.ts`（F9） | typed client 就绪 |
| 15:00-16:00 | 写 `Money.ts` + `Money.test.ts`（F10）；`pnpm test` 8 个测试通过 | Money 库就绪 |

---

**文档结束（v1.1，2026-05-19 合并工程细节）**
