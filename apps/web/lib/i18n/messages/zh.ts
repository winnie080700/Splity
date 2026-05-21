import type { MessageKey } from "./en";

export const zh: Partial<Record<MessageKey, string>> = {
  "common.back": "返回",
  "common.cancel": "取消",
  "common.loading": "加载中...",
  "common.saveChanges": "保存更改",
  "dashboard.groupsTitle": "群组",
  "dashboard.noGroupsTitle": "还没有群组",
  "dashboard.noGroupsBody": "先创建一个群组，然后添加成员和账单。",
  "settings.title": "设置",
  "settings.body": "管理个人资料、收款默认值、密码和邮箱验证。",
  "settings.profileTitle": "个人资料",
  "settings.profileBody": "更新朋友邀请你时看到的名称和用户名。",
  "settings.paymentTitle": "收款资料",
  "settings.paymentBody": "这些默认值会预填到结算分享链接中。",
  "settings.passwordTitle": "修改密码",
  "settings.passwordBody": "设置新密码前请先确认当前密码。",
  "settings.emailTitle": "邮箱验证",
  "settings.emailVerified": "已验证",
  "settings.emailPending": "待验证",
  "settings.resendVerification": "重新发送验证邮件",
};
