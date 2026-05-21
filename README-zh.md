# Splity

Splity 是一个面向真实分账流程的共享账单工作区。当前版本已经迁移到 Next.js + Supabase。

核心流程：

`创建群组 -> 添加成员 -> 添加账单 -> 进入结算 -> 分享付款链接 -> 确认收款`

旧的前端、后端和数据库初始化脚本已移除。

## 项目结构

- `apps/web`: Next.js App Router 应用，使用 Server Actions 和 Tailwind CSS
- `supabase/migrations`: Supabase Postgres schema、RLS policy、trigger 和 RPC
- `supabase/tests`: RLS 与迁移行为的 SQL fixture
- `packages/api-client`: 仅保留共享 DTO 类型定义

## 主要能力

- Supabase Auth 邮箱密码注册、登录、重置密码和邮箱验证
- Settings 页面维护昵称、用户名、密码、邮箱验证和默认收款资料
- 群组状态：`unresolved -> settling -> settled`
- 成员管理，支持通过 username 邀请注册用户
- 账单创建和编辑，包含确定性的分账计算
- 结算转账状态跟踪
- 公开结算分享链接，支持收款信息和 QR data URL
- 邀请 inbox，可接受或拒绝待处理邀请

## 本地开发

### 要求

- Node.js
- pnpm
- 已配置迁移所需的 Supabase 项目或本地 Supabase 环境

### 环境变量

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```

常用变量：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 安装

```powershell
pnpm install
```

### 启动

```powershell
pnpm dev
```

默认地址：

- `http://localhost:3000`

### 检查与构建

```powershell
pnpm typecheck
pnpm build
```

## 安全模型

- 所有业务数据在 Supabase Postgres 中。
- public schema 表启用 RLS。
- 用户写入通过 Server Actions 和当前用户 session 执行。
- username 搜索只走白名单 RPC，仅返回 `id`、`name`、`username`。
- `packages/api-client` 是纯类型包，不再包含旧 HTTP fetch 客户端。
