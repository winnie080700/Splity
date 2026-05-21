# Phase 6 Implementation Plan

> **文档版本**：v1.3
> **目标**：把 `SettlementCalculator.cs`（72 行）+ `SettlementsService.cs` 关键 snapshot 装配（317 行中的 ~150 行）**1:1** 移植到 TS；用 ≥ 8 个 fixture 证明结算分配（greedy creditor/debtor matching）与 C# 输出完全相等；建 group-scoped settlements UI 跑通 mark-paid / mark-received 状态机；补齐 Phase 2 `record_settlement_action` 缺失的 group.status = Settling 校验 + 状态机倒退校验，以及 `settlement_transfer_confirmations` 表的 v1.5 风格 DB 层防御。
> **依据**：`docs/migration-prd.md` v2.3 §3.5 + §4.6 + ADR-010；`docs/api-inventory.md` E1-E3；`docs/user-journeys.md` J6 / J7 / J9。
> **预算**：**2 工作日（16 小时）**。比 Phase 5 短一半，但**含 1 块新 DB 防御层**——继承 Phase 5 经验，不靠后续 review 倒推。
> **状态**：completed（2026-05-20）。
> **前置 Phase**：Phase 5 completed（BillCalculator port + Bills CRUD + F13 完整防御链测试）。
> **v1.3 修订（codex review #3）**：**P1 trigger `UPDATE OF` 列名清单与 status 兜底验收冲突**——`BEFORE INSERT OR UPDATE OF group_id, from_participant_id, to_participant_id, amount` 不会在 `UPDATE ... SET status = 2` 时触发，验收第 ⑪ 项"postgres 直写 status≠1 group 被 trigger 拒"无法通过。改为 `BEFORE INSERT OR UPDATE` 无列名（对任意 UPDATE 都触发）。RPC 合法路径下 `assert_settlement_writable(NEW.group_id, NEW.from_participant_id, NEW.to_participant_id)` 仍然 pass（NEW 反映 row 全字段，from/to 不变，group.status=1 由 RPC 入口已保证），不影响正常 mark-paid/received。
> **v1.2 修订（codex review #2）**：①**P1 拆 policy 仍不封闭**：v1.1 把 `settlement_transfer_confirmations` policy 拆成 `FOR INSERT` + `FOR UPDATE` 试图封 DELETE 漏洞，但 creator 仍可 `INSERT (status=2, ...)` 直接造一条 Received，或 `UPDATE status=2` 跳过 MarkedPaid。trigger 不懂状态转移也拿不到 actor 语义。**正解**：直接 `REVOKE INSERT, UPDATE, DELETE ON public.settlement_transfer_confirmations FROM authenticated`，**只保留 SELECT GRANT + SELECT policy**；所有写入唯一入口是 `record_settlement_action` `SECURITY DEFINER` RPC（DEFINER 绕过 GRANT 限制）。F10 加 authenticated 直 INSERT / UPDATE / DELETE → 全部 0 rows 或 42501 的反例。②**F2/F4 文案残留**：§4.2 仍写"`buildSnapshot` 接 supabase client"，与 §1 v1.1 改的"F2 纯函数 / F4 查询 + 喂给 F2"冲突。本版 §4.2 全段重写，统一职责。③**"silent overflow" 措辞错**：C# `decimal → int` 显式转换超范围抛 `OverflowException`（[BillCalculator.cs:240](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L240) `(int)Math.Round(...)` 也一样），不是 silent。Fixture #11 文案改为"对齐 C# 超范围抛错行为"。
> **v1.1 修订（codex review #1）**：①**P1 RLS DELETE 漏洞**：`FOR ALL` policy 含 DELETE，creator 在 Settling 状态可直接 DELETE `settlement_transfer_confirmations` 绕状态机。F5 改为拆分 `FOR INSERT` / `FOR UPDATE`，**显式不开放 DELETE**（或 DELETE policy USING(false)）；F10 加 direct DELETE 拒绝测试。②**P1 状态机倒退**：现有 record_settlement_action 在 `p_action='mark_paid' AND v_existing.status=2 (Received)` 时仍 UPDATE 回 status=1，与 [SettlementsService.cs:91](../apps/backend/src/Splity.Application/Services/SettlementsService.cs#L91) 行为不一致。F5 同步 patch RPC：`mark_paid` 遇到 status=2 抛 `'transfer already received'`；F10 加测试。③**Fixture #5 overflow**：1e10×100 超 int.MaxValue（~2.15e9），原计划列为 happy 不成立。改为反例 fixture，或换 amount = 999_999.99（安全区间）。④**Fixture #6 collapse 假设错**：SettlementCalculator 接 net balance，B 不可能同时 creditor+debtor，自然 collapse；删除该场景，换为 tie-breaker（相同金额按 participantId 排序）。⑤**Transfer 上界错**：2 creditor + 2 debtor 可产生 3 transfer，上界 ≈ creditors+debtors-1 而非 min。修正描述。⑥**F2 职责混淆**：snapshot 既写"纯函数"又写"接 supabase client"。拆为 `settlement-snapshot.ts`（pure `buildSnapshotFromRows`）+ service 层做 RLS 查询。

---

## 1. 交付物

| 层 | # | 路径 | 行数估 | 用途 |
|---|---|---|---|---|
| **核心算法** | F1 | `apps/web/lib/calculations/settlement-calculator.ts` | ~110 | **1:1** 移植 `SettlementCalculator.cs`；creditor/debtor greedy matching；`ToCents` 用 `Decimal.js` half-away-from-zero |
| | F2 | `apps/web/lib/calculations/settlement-snapshot.ts` | ~120 | **纯函数**层：`buildSnapshotFromRows(participants, billsWithSharesAndContribs, dateWindow)` → 输出 `{ netBalances, transfers }`；`buildTransferKey(...)` 也在这；**不接 Supabase**。`getTransferFromSnapshot(snapshot, input)` 同样纯函数。这层是 1:1 算法移植，fixture 不需要 mock supabase |
| | F3 | `apps/web/lib/calculations/__tests__/settlement-calculator.test.ts` + `settlement-fixtures.ts` | ~250 | ≥ 8 happy fixtures + ≥ 2 反例（sum ≠ 0）；从 C# `SettlementCalculatorTests.cs` 翻译 + `dotnet test` runtime dump 补充 |
| **服务层** | F4 | `apps/web/lib/services/settlements.ts` | ~220 | `getSettlement(groupId, from?, to?)` / `markSettlementPaid(...)` / `markSettlementReceived(...)`。**职责**：①用 Supabase user-JWT 客户端查 `participants` + `bills (with shares + contributions)`（走 RLS）；②把行喂给 F2 纯函数 `buildSnapshotFromRows`；③拿到 transfer + transferKey 后调 `record_settlement_action` RPC |
| **DB 防御层** | F5 | `supabase/migrations/0009_settlement_status_lock.sql` | **必交付** | ①补 `record_settlement_action` RPC：(a) creator 校验后加 `groups.status = 1 (Settling)` 校验（Phase 2 漏的，对齐 C# `EnsureGroupAllowsSettlementActions`）；(b) 加状态机倒退守卫——`p_action='mark_paid' AND v_existing.status = 2 (Received)` 时抛 `'transfer already received'` USING ERRCODE = '23514'（对齐 [SettlementsService.cs:91](../apps/backend/src/Splity.Application/Services/SettlementsService.cs#L91)）；②**收紧 `settlement_transfer_confirmations` GRANT**（v1.2 关键修复）：`REVOKE INSERT, UPDATE, DELETE ... FROM authenticated`，**只保留 SELECT GRANT + SELECT policy**（成员对任意 status group 都可读，对齐 R7）。所有写入唯一入口是 `record_settlement_action` `SECURITY DEFINER` RPC（DEFINER 绕过 GRANT 限制，以函数 owner 身份写表）；DROP 原计划的 INSERT/UPDATE write policy（不需要）；③新增 trigger `trg_settlement_transfer_integrity` **`BEFORE INSERT OR UPDATE`**（**v1.3：去掉 OF 列清单**，否则 `UPDATE SET status=2` 不触发，破坏 §9.2 ⑪ status 兜底验收）：用 v1.5 风格 SECURITY DEFINER + SET search_path + helper `assert_settlement_writable(NEW.group_id, NEW.from_participant_id, NEW.to_participant_id)` 强制 from/to **都**同组 + group.status=1（仍保留作为 service_role / postgres 误用兜底防线）。**性能注意**：trigger 在每次 UPDATE 都触发（含 RPC 的合法 status/timestamps/proof 更新），但 settlement 写入低频，且 helper 是 STABLE 函数查询 + planner 可缓存，可接受 |
| **UI 路由** | F6 | `apps/web/app/(app)/groups/[groupId]/settlements/page.tsx` | ~140 | 列出 net balances + transfer 列表（每行带 Mark Paid / Mark Received 按钮）；可选 from/to 日期筛选 |
| | F7 | `apps/web/app/(app)/groups/[groupId]/settlements/actions.ts` | ~150 | Server Actions：`markPaidAction` / `markReceivedAction`；含 proof 截图上传（dataURL 形式直存 `proof_screenshot_data_url`） |
| | F8 | `apps/web/app/(app)/groups/[groupId]/settlements/transfer-row.tsx` | ~100 | Client component：状态 badge + Mark Paid/Received 按钮 + proof 上传 dialog |
| | F9 | `apps/web/app/(app)/groups/[groupId]/page.tsx` | 修订 | 在 group 详情页 status=settling 时显示 "Settlement" 区块入口；status=unresolved 时仍显示 Bills；status=settled 时 read-only |
| **测试** | F10 | `supabase/tests/phase-6-settlement.sql` | ~250 | 与 F13 同模式：①RPC 各 action 越权（非 creator / 错 actor / 状态机倒退） ②RPC group.status ≠ Settling 拒绝 ③authenticated 直写 settlement_transfer_confirmations（cross-group / status ≠ 1）④postgres 直写（trigger 兜底） ⑤DEFINER 审计（含新加 helper + trigger function） |
| **文档** | F11 | `docs/phase-6-review-checklist.md` | ~30 | PR review checklist |

**不交付**：
- ❌ 公开分享（Phase 7）。
- ❌ Settlement 撤销 / 重置 / 历史变更（PRD 范围内未要求）。
- ❌ 多币种 / 汇率（Phase 8+）。
- ❌ Proof screenshot 上传到 Storage——本期沿用 `LONGTEXT data:URL` 模式（与 bills.reference_image_data_url 一致），Storage 迁移留 PRD §6 R11。

---

## 2. 前置条件

| ID | 任务 | 阻塞哪一步 |
|---|---|---|
| PRE-1 | Phase 5 闭环；浏览器可建 group / 加 bill / 看分账 | F6-F9 UI 入口 |
| PRE-2 | `vitest` + `decimal.js` + `apps/web/lib/money/Money.ts` 已就位 | F1-F3 |
| PRE-3 | `record_settlement_action` Phase 2 版本已 push 到云端（10 参数签名） | F4 service 层 |
| PRE-4 | C# 旧后端可运行（dump fixture 用）；记得 `dotnet test --no-build` 或停 dev server | F3 fixture 校对（与 Phase 5 PRE-4 同陷阱） |
| PRE-5 | 你有至少 1 个 group 含 ≥ 2 个 bill + ≥ 3 个 participant 用于浏览器实测 | §10 端到端 |

---

## 3. 关键决策（继承 Phase 5 防御教训）

| ID | 决策 | 选择 | 理由 |
|---|---|---|---|
| D1 | TS 数值类型 | `Decimal.js`（与 Phase 5 一致）；Money 包装仅边界 | 同 Phase 5 D1 |
| D2 | DTO 金额传输 | 字符串 | 同 Phase 5 D2 |
| D3 | `BuildTransferKey` 格式 | **逐字节复刻 C#**：`{groupId no-dashes}:{fromDate.toISOString() or "none"}:{toDate or "none"}:{from_pid no-dashes}:{to_pid no-dashes}:{amount with 2 decimals}` | 这是 `settlement_transfer_confirmations.transfer_key` 主键的一部分；TS 写入 + 后续 TS 读取必须用同算法。⚠️ C# 用 ISO 8601 round-trip 格式（7 位毫秒精度），JS `toISOString()` 是 3 位——见 R3 |
| D4 | Snapshot 在 Node 端计算 vs PL/pgSQL | **Node 端（TS）**——对齐 ADR-010；不在 PL/pgSQL 重写 | record_settlement_action 只做"creator + actor 校验 + UPSERT"，snapshot 在 service 层算好后传 transfer_key 进 RPC |
| D5 | `record_settlement_action` 是否新加 status check | **新加** Settling-required 校验 | C# `EnsureGroupAllowsSettlementActions` (line 261-273) 强制 `Status = Settling`；Phase 2 RPC 漏了这条；F5 必须补 |
| D6 | settlement_transfer_confirmations 写入路径 | **完全收口到 `record_settlement_action` RPC**：REVOKE INSERT/UPDATE/DELETE on table FROM authenticated；只保留 SELECT GRANT + SELECT policy；不开任何 write policy（v1.2） | 与 bills 表不同——bills 有 INVOKER 写 RPC + 直写并存（v1.5 选 trigger 兜底）。settlement 只有 DEFINER 写 RPC，**根本不需要 authenticated 写表**。封 GRANT 比加 policy 更直接、零状态机泄漏 |
| D7 | settlement_transfer_confirmations 是否加 trigger | **加**，作为 service_role / postgres 误用兜底 | 即使 GRANT 收紧，DEFINER RPC 内部和未来的维护脚本仍以 owner 写表；trigger 校验 cross-group + status=1 是最后一道防线，对齐 Phase 5 v1.5 防御纵深思想 |
| D8 | Mark-paid/received 入口 | Server Action（不 Route Handler） | 与 Phase 4/5 一致；E2/E3 旧接口的功能由 Server Action 等价提供 |
| D9 | Proof screenshot 校验 | 仅做 size 限制（< 5MB）+ 格式校验（`^data:image/(png|jpeg|webp);base64,`）；不上传 Storage | LONGTEXT data:URL 沿用现状（PRD §6 R11） |
| D10 | UI 多角色感知 | non-creator 不显示 Mark 按钮（仅展示状态）；creator 显示按钮但 actor 在 form 里选 | 对齐 C# `EnsureCanEditAsync` + `ActorParticipantId` 语义 |
| D11 | Snapshot 重算频次 | 每个 mark action 都重算（与 C# `GetTransferFromSnapshotAsync` 等价） | 避免 stale snapshot 攻击：如果用户在 mark 后立刻又有新 bill 进来，下一次 mark 的 snapshot 自然变了 |
| D12 | Transfer 在 snapshot 中找不到 | 抛 `SettlementTransferNotFoundError`（对齐 C# `EntityNotFoundException` "Settlement transfer not found"） | Server Action 翻译为 friendly form error |

---

## 4. C# → TS 移植对照

### 4.1 SettlementCalculator.cs 全函数

| C# 行 | C# 段 | TS 对应 |
|---|---|---|
| 7 | `CalculateTransfers(netBalances)` 主入口 | `function calculateTransfers(netBalances: NetBalance[]): SettlementTransfer[]` |
| 11-15 | sum check（必须 = 0） | 同；抛 `SettlementValidationError("Net balances must sum to zero.")` |
| 17-22 | creditors 排序 | 同；OrderByDescending(amount) ThenBy(participantId) |
| 24-30 | debtors 排序（取负后转正） | 同 |
| 32-61 | greedy 双指针匹配 | 同 |
| 47 | `transfers.Add(new SettlementTransfer(debtor, creditor, amount/100m))` | 注意：amount 是 cents（int），TS 用 `Decimal(amount).div(100).toFixed(2)` 转回元 |
| 66-69 | `ToCents` half-away-from-zero | `function toCents(d: Decimal.Value): number` 用 ROUND_HALF_UP |

### 4.2 SettlementsService.cs snapshot 装配（**职责拆分：F2 纯函数 + F4 服务层**，v1.2）

| C# 行 | 段 | 拆分位置 | TS 对应 |
|---|---|---|---|
| 158-165 | `BuildSnapshotAsync` 入口（取 participants + bills via repository） | **F4 服务层** | `lib/services/settlements.ts` 内：`createServerClient()` 走 RLS 查 `participants` + `bills(*, bill_shares(*), payment_contributions(*))`；把 rows 喂给 F2 |
| 166-197 | 累加 shares/contributions → net balances → CalculateTransfers | **F2 纯函数** | `lib/calculations/settlement-snapshot.ts` 内：`function buildSnapshotFromRows(participants, bills, dateWindow): { netBalances, transfers }`；**不接** Supabase；累加用 `Decimal.js` 逐条 `roundCurrency`；最后调 F1 `calculateTransfers` |
| 223-242 | `GetTransferFromSnapshotAsync` | **F2 纯函数** | `function getTransferFromSnapshot(snapshot, input): SettlementTransfer`；snapshot 已是上一步产出；amount 比较时双方都 `roundCurrency` |
| 291-300 | `BuildTransferKey` | **F2 纯函数** | `function buildTransferKey(groupId, fromDate, toDate, transfer): string`；D3 格式逐字节复刻 C# `:O` |

**架构意图**：F2 完全离线可测（fixture 不需 mock supabase）；F4 是 RLS 边界唯一接触点，service_role 不进。RLS 已通过 `is_group_member(group_id)` 强制成员可见——非成员账号查 bills 自然空 → snapshot net 全 0 → transfer 空数组 → 不会泄露任何信息。

### 4.3 `record_settlement_action` 已知签名（不变）

```
record_settlement_action(
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
) RETURNS JSONB
```

F5 RPC patch（**两处插入**）：

**A. 在 creator check 后插入 Settling 校验**：
```sql
IF NOT EXISTS (
  SELECT 1 FROM public.groups g
  WHERE g.id = p_group_id AND g.status = 1  -- Settling
) THEN
  RAISE EXCEPTION 'group is not in settling state' USING ERRCODE = '23514';
END IF;
```

**B. 在现有 ELSE 分支（v_existing 已存在的 UPDATE 路径）的状态机检查里，加 mark-paid 不可倒退（对齐 [SettlementsService.cs:91](../apps/backend/src/Splity.Application/Services/SettlementsService.cs#L91)）**：
```sql
-- 现有代码已有：
--   IF p_action = 'mark_received' AND v_existing.status < 1 THEN
--     RAISE EXCEPTION 'must mark paid first' ...
--   END IF;
-- v1.1 新增：mark_paid 遇到 Received 必须拒绝
IF p_action = 'mark_paid' AND v_existing.status = 2 THEN
  RAISE EXCEPTION 'transfer already received' USING ERRCODE = '23514';
END IF;
```

> **为什么不能允许 mark_paid 覆盖 Received**：旧 C# 行为是 `'This transfer has already been marked as received.'` 直接拒绝。如果允许 UPDATE 回 status=1，攻击场景：creator 误操作 mark-received 后想"撤销"——但本期产品策略是不允许撤销（"settled is final"），靠 UI 隐藏按钮 + RPC 拒绝两层守住。

---

## 5. Fixture 设计

### 5.1 必须覆盖（≥ 8 happy + ≥ 2 反例）

| # | 场景 | 关键检验 | 来源 |
|---|---|---|---|
| 1 | 2 人 simple（A 欠 B 50） | 单 transfer；sort-by-id tie-breaker 路径不触发 | C# `SettlementCalculatorTests` 直翻 |
| 2 | 3 人均分（A 付 90，B/C 各欠 30） | 1 creditor + 2 debtor，2 transfers | C# test |
| 3 | 4 人复合（2 creditor 各 30 + 2 debtor 各 30）→ greedy 匹配产生 3 transfers（**注意**：上界 ≈ `creditors + debtors - 1`，**不是** `min(c, d)`） | greedy 不优化跨链，按金额降序逐对配；验证 transfer 数与精确顺序 | C# runtime dump |
| 4 | 100/7 不能整除产生 cents 余数（3 人 + 1 fee → net 含 .34/.33/.33） | sum-to-zero 验证仍通过；transfer 金额精确到分 | runtime |
| 5 | **较大金额边界**：amount = `999999.99`（即 99,999,999 cents，远小于 `int.MaxValue ≈ 2.15e9`） | int 安全区间内 happy path；**不**用 1e10（会 overflow `int`） | runtime |
| 6 | **Tie-breaker**：2 creditor 同金额、2 debtor 同金额，**按 participantId asc 排序**决定配对顺序 | 验证排序稳定（C# `OrderByDescending(amount).ThenBy(participantId)`）| runtime |
| 7 | 一人 net = 0 不参与 transfer | 不出现在 from/to 列表 | runtime |
| 8 | 全员 net = 0（无 transfer） | 返回空数组 | runtime |
| 9 | **反例**：sum ≠ 0（cents 累加后非零） | 抛 `SettlementValidationError("Net balances must sum to zero.")` | C# 验证 |
| 10 | **反例**：null netBalances | 抛 `TypeError` 或等价 | C# 抛 `ArgumentNullException` |
| 11 | **反例**（v1.1 新增）：amount = `1e10`（21,474,836.48 以上） | 应在 ToCents 阶段抛 `SettlementValidationError("amount out of cents range")` 或等价；**对齐 C# 超范围失败行为**（C# `(int)Math.Round(amount * 100m, 0, ...)` 显式转换超 int 范围抛 `OverflowException`，**不是** silent overflow）。TS 用 `Decimal.js` 无 native overflow，需主动校验 `cents <= 2^31 - 1` 抛错以保持行为对齐 | TS 单元测试 |

**统计**：happy = 8（#1-8）；反例 = 3（#9-11）。

> **为什么 #5 不能用 1e10**：[SettlementCalculator.cs:66](../apps/backend/src/Splity.Application/Calculations/SettlementCalculator.cs#L66) 的 `ToCents` 返回 `int`，最大 ≈ 21.47e8。`1e10 × 100` = 1e12 超 int.MaxValue 几个数量级 → C# `(int)Math.Round(...)` 显式转换**抛 `OverflowException`**（不是 silent；checked conversion 是默认）。Phase 6 移植 TS 时用 `Decimal` 无 native overflow，所以若不显式拒绝超额输入，则 TS / C# 边界行为不一致（C# 抛错 vs TS 接受荒谬大数）。**反例 #11 强制对齐**：TS 主动校验 `cents <= Math.pow(2, 31) - 1`（跟 C# `int` 上界对齐），超 = 抛 `SettlementValidationError`。
>
> **为什么删原 #6 "A→B→C collapse"**：calculator 入参 `NetBalance[]` —— B 要么 net > 0 (creditor) 要么 net < 0 (debtor) 要么 0，不可能"既是 creditor 又是 debtor"。前置 snapshot 装配（F2）已经把"A 付 30 / B 中转 / B 收 30 / B 付 30 / C 欠 30"折叠为 `A: 0, B: 0, C: -30, ?: 30`。所以 calculator 本身没有 chain collapse 概念，该 fixture 站不住脚。换成 tie-breaker 场景（#6）更有意义。
>
> **为什么 #3 上界改成 `c + d - 1`**：每次 greedy 匹配至少把某一侧的当前指针推进一次（金额耗尽时）。最多 `c + d - 1` 次推进就有一侧用完。这与"min(c, d)"不同——2+2 配对当首对没耗尽就要再分裂下去，可能产生 3 transfer。

### 5.2 Snapshot 装配的 fixture（额外）

snapshot 不只是算法，还有"bills → net balances"的累加。需要 2-3 条 fixture 验证：

| # | 场景 | 输入 | 期望 |
|---|---|---|---|
| S1 | 1 bill / 3 participants | bill {payer=A, shares=[A 30, B 30, C 30], contributions=[A 90]} | net = {A: 60, B: -30, C: -30} |
| S2 | 2 bills overlap | 同 group 不同日期 + 不同 payer | net 累加 |
| S3 | date filter 排除一个 bill | from/to 限制 | net 只算窗口内 |

放在 `__tests__/settlement-snapshot.test.ts`。

### 5.3 transfer_key 格式 fixture（D3 关键）

| # | 输入 | 期望 key 字符串 |
|---|---|---|
| K1 | groupId=`00000000-...-0001`, from=null, to=null, from_p=`...001`, to_p=`...002`, amount=`50.00` | `00000000000000000000000000000001:none:none:00000000000000000000000000000001:00000000000000000000000000000002:50.00` |
| K2 | with from/to dates | C# `:O` format 实测 vs JS `toISOString()` 实测对比；如不等，**用 C# 输出为准**调整 TS 实现（见 R3） |

---

## 6. UI 设计

### 6.1 Settlement 页面（F6 + F8）

```
┌─ Settlement (Phase 5 Group, 2026-05-15 ~ 2026-05-19) ────────┐
│ Date filter: [📅 from] [📅 to] [Apply]                       │
│                                                              │
│ Net balances                                                 │
│  Alice   +106.00                                             │
│  Bob      -35.34                                             │
│  Carl     -35.33                                             │
│  David    -35.33                                             │
│                                                              │
│ Transfers (suggested)                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Bob   →  Alice    35.34   [Pending]    [Mark Paid]   │   │
│  │ Carl  →  Alice    35.33   [MarkedPaid] [Mark Received│   │
│  │ David →  Alice    35.33   [Received]   ✓             │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Mark Paid Dialog（F8）

```
┌─ Mark Bob → Alice (35.34) as paid ──────────┐
│ Actor (who paid): [Bob ▾]   ← creator 选     │
│ Proof screenshot: [📷 Upload] (optional)     │
│                                              │
│ [Cancel] [Mark as paid]                      │
└──────────────────────────────────────────────┘
```

- creator 操作但 actor 必须是 fromParticipant（mark-paid）或 toParticipant（mark-received）——dropdown 默认填好，但允许 creator 改（C# 允许任意 actor，service 内再校验）。
- Proof screenshot 上传为可选，预览 + 大小校验在 client 层。

### 6.3 Group 详情页扩展（F9）

`status = settling` 时显示 "Manage settlements" 链接。`status = settled` 时显示 "View settlements (read-only)"。`status = unresolved` 时不显示（保留 Phase 5 Bills 区块）。

---

## 7. 执行步骤（16 小时）

### Day 1（8h）：算法 + Snapshot + DB 防御

| 时段 | 任务 | 输出 |
|---|---|---|
| 0:00-0:30 | 读 SettlementCalculator.cs + SettlementsService.cs:158-300 | 头脑模型 |
| 0:30-2:30 | F1 `settlement-calculator.ts` + F2 `settlement-snapshot.ts` + BuildTransferKey | 算法层 |
| 2:30-4:00 | 翻 C# 2 条测试为 Fixture #1/#2；写 F3 测试架构；跑通 | 2 fixtures 通过 |
| 4:00-5:00 | 加临时 `[Fact]` 注入 fixture #3-#8 input → `dotnet test --no-build` dump JSON | 6 条 expected dump |
| 5:00-6:00 | 把 dump 转成 TS fixtures；跑测试，预计 1-2 处差异调试（特别是 BuildTransferKey 格式） | 8 happy + 2 反例 通过 |
| 6:00-7:00 | **F5 必做**：写 `0009_settlement_status_lock.sql`（含 RPC patch + RLS 修订 + 新 trigger + helper）→ push → Studio 看 trigger 在 Functions 列表 | DB 防御层上线 |
| 7:00-8:00 | F4 `settlements.ts` 服务层骨架 + Server Action 占位 + 本地跑通最简 mark-paid | service 层 happy path |

### Day 2（8h）：UI + 测试

| 时段 | 任务 | 输出 |
|---|---|---|
| 8:00-10:00 | F6 settlements page + F8 transfer-row client + actions | 列表 + 按钮可点 |
| 10:00-11:00 | F9 group page 加 settlements 入口 + 整体跑 J7 旅程 | 端到端 happy 通过 |
| 11:00-12:00 | F7 mark-paid/received Server Actions + proof 上传逻辑 + dialog | 完整 mark flow |
| 12:00-14:00 | F10 `phase-6-settlement.sql`：①RPC 越权 ②RPC status ≠ Settling ③authenticated 直写 ④postgres 直写 ⑤DEFINER 审计；按 Phase 5 F13 同模板写 | 防御链完整测试 |
| 14:00-15:00 | 本地跑 F10 + 浏览器实测 J7（A 建 settling group + 加 bill + mark paid + mark received） | 验收通过 |
| 15:00-16:00 | F11 review checklist + commit | Phase 6 关闭 |

---

## 8. 风险清单

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| P6-R1 | SettlementCalculator 输出与 C# 差 1 分（cents 边界） | 🔴 高 | F3 fixture 字符串精确比对；测试 #4 / #5 专门覆盖整除边界 |
| P6-R2 | `BuildTransferKey` JS toISOString() 与 C# `:O` 格式毫秒精度不一致（JS 3 位、C# 7 位） | 🔴 高 | D3 决策"以 C# 输出为准"；如不等，TS 端补 4 个 `'0'` 凑到 7 位，或反向用 C# `T_HH:mm:ss.fffffff` 模板。具体形态在 Day 1 Fixture K2 实测后定 |
| P6-R3 | record_settlement_action 旧 RPC 没 status check，F5 patch 必须保留 v_target_group_id 模式（与 Phase 5 v1.4 一致） | 🟡 中 | F5 SQL 骨架在 plan 这里说明用 `p_group_id`（这个 RPC 有 p_group_id 参数）；不需要 v_target_group_id 反查 |
| P6-R4 | snapshot 重算时 RLS 让用户看不到所有需要的 bills（如部分 bill 在跨 group 之外） | 🟢 低 | settlements 是 group-scoped，RLS `is_group_member(group_id)` 已覆盖；不存在跨 group 读 |
| P6-R5 | UI 上 actor 选错（creator 给 mark-paid 选了 to 而不是 from） | 🟡 中 | service 层校验抛 `BillValidationError` 等价错误；UI 显示 dialog 默认值 + 校验 |
| P6-R6 | Proof screenshot 5MB+ 上传卡住 server action | 🟢 低 | D9 client 端先校验大小拒大文件；Phase 8 改 Storage |
| P6-R7 | settlement_transfer_confirmations RLS 加 status=1 条件后，settled group 无法读 history（用户期望"已结算的记录"看得到） | 🟡 中 | **关键**：D6 加 status=1 只在 **write policy**（INSERT/UPDATE/DELETE）；**SELECT policy** 不动（成员对任意 status group 都可读）。验收必跑 settled group 仍可看 transfers |
| P6-R8 | mark-received 前没 mark-paid 时的状态机检查在 RPC 内已有，但 trigger 不重复检查 | 🟢 低 | RPC 是状态机的唯一入口；trigger 仅校验"参与者同组 + status=1"；状态转移逻辑不重复 |
| P6-R9 | F10 测试 fixture 角色分层（authenticated vs postgres） | 🟡 中 | 沿用 Phase 5 F13 模式：set_config + SET LOCAL ROLE authenticated 测 RLS；RESET ROLE 测 trigger 兜底 |
| P6-R10 | Day 2 12:00-14:00 写 F10 时间紧（参考 Phase 5 F13 后期还要 codex review 补全 80 行） | 🟡 中 | **直接按 Phase 5 v1.5 §10.2.5 完整矩阵起稿**——本期不留缺口给后续 review 补 |

---

## 9. 验收清单

### 9.1 算法 1:1 移植
- [ ] `pnpm --filter splity-web vitest run lib/calculations/__tests__/settlement-calculator` 全绿。
- [ ] ≥ 8 happy + ≥ 2 反例 fixture；每条与 C# 输出**字符串精确相等**。
- [ ] `BuildTransferKey` fixture K1/K2 通过；TS 与 C# 输出 byte-for-byte 一致。
- [ ] Snapshot fixtures S1/S2/S3 通过（net balances 派生正确）。

### 9.2 RPC + DB 防御
- [ ] **F5 已 push**：`record_settlement_action` 函数体首段含 `g.status = 1` 检查；grep `'group is not in settling state'` 命中。
- [ ] **6 张 bill 表 RLS status=0 仍存在**（Phase 5 F15 不被回归）。
- [ ] **`settlement_transfer_confirmations` GRANT 已收紧**（v1.2）：以下 SQL 必须返回**零行**（authenticated 不持有写权限）：
      ```sql
      SELECT privilege_type FROM information_schema.role_table_grants
      WHERE grantee = 'authenticated'
        AND table_schema = 'public'
        AND table_name = 'settlement_transfer_confirmations'
        AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE');
      ```
- [ ] **`trg_settlement_transfer_integrity` trigger + `assert_settlement_writable` helper** 都存在，且全部 `prosecdef = true` + `search_path = public, pg_temp`（v1.5 审计模式延伸）。
- [ ] **`phase-6-settlement.sql` 全段通过**：
  - ① RPC 非 creator 拒
  - ② RPC status=Unresolved 拒
  - ③ RPC status=Settled 拒
  - ④ RPC actor mismatch 拒（mark_paid actor ≠ from / mark_received actor ≠ to）
  - ⑤ RPC mark-received 前必须 mark-paid
  - ⑥ **RPC mark-paid 不可倒退**：已 Received 的 transfer 再 mark-paid 抛 `'transfer already received'`
  - ⑦ **authenticated 直 INSERT 任意 payload**（v1.2 修订）：以 authenticated JWT `INSERT INTO settlement_transfer_confirmations (group_id, transfer_key, ..., status=2)` → 抛 42501（GRANT 已 revoke）
  - ⑧ **authenticated 直 UPDATE 任意 row**（v1.2 修订）：`UPDATE settlement_transfer_confirmations SET status = 2 WHERE id = ?` → 抛 42501
  - ⑨ **authenticated 直 DELETE 任意 row**（v1.2 修订）：`DELETE FROM settlement_transfer_confirmations WHERE id = ?` → 抛 42501
  - ⑩ postgres 直写 cross-group 被 trigger 拒（兜底防线）
  - ⑪ postgres 直写 status ≠ 1 group 被 trigger 拒
  - ⑫ DEFINER 审计通过（含 `record_settlement_action` / `assert_settlement_writable` / `trg_settlement_transfer_integrity`）

### 9.3 RLS / 跨账号
- [ ] **settled group 仍可看 transfer history**（R7 反向断言）：把 group 改 Settled (2) 后 `SELECT * FROM settlement_transfer_confirmations` 仍返回数据（成员对历史可读）。
- [ ] 非 creator 账号访问 mark-paid 端点 → 403 / RPC 拒绝。
- [ ] 跨账号 SELECT settlements RPC：B 不是 A 的 group member → empty 结果。

### 9.4 UI 端到端（J7）
- [ ] A 建 group → 加 ≥ 2 个 bill → 改 status 到 Settling → 进 settlements 页 → 看到 net balances + transfers。
- [ ] 点 Mark Paid → 选 actor → 上传 proof（可选）→ 提交 → row 显示 MarkedPaid。
- [ ] 点 Mark Received（同一行）→ 提交 → row 显示 Received，时间戳显示。
- [ ] 改 status 到 Settled → settlements 页变只读（按钮消失）。
- [ ] 改回 Unresolved（如 UI 允许）→ settlements 入口隐藏。

### 9.5 代码质量
- [ ] `pnpm --filter splity-web typecheck` 通过。
- [ ] `grep -rn "auth.getSession()" apps/web --include='*.ts'` 仍 0 命中。
- [ ] `grep -rn "createAdminClient(" apps/web --include='*.ts' | grep -v 'lib/supabase/admin.ts'` 仍 0 命中。
- [ ] settlement-calculator.ts 每个 `roundCurrency` / `toCents` 调用上方含 C# 行号注释。

### 9.6 PRD 对齐
- [ ] api-inventory.md E1-E3 三条接口在新版可复现（每个 Server Action 注释关联 ID）。
- [ ] **DEFINER 审计的 SQL 断言更新**：含 v1.5 的 5 个 + Phase 6 新加的 `assert_settlement_writable` + `trg_settlement_transfer_integrity` 共 7 个函数全 pass。

---

## 10. 完成后立即触发

1. 标 Phase 6 → completed，Phase 7 → in_progress。
2. commit: `feat(settlements): settlement calculator port + crud + db defense (phase 6)`。
3. 进入 **Phase 7 plan 生成**：Invitations（accept/decline）+ public share via `resolve_share_token` RPC + `/share/[token]` 公开页面。
4. **关键里程碑**：Phase 6 完成 ≈ J1/J3/J5/J6/J7 五条核心旅程全跑通。剩 Phase 7-9 都是"对齐+发布"性质。

---

**文档结束**
