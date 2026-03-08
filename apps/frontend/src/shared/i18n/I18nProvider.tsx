import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Language = "en" | "zh";

const STORAGE_KEY = "splity.language";

const messages = {
  en: {
    "app.title": "Splity",
    "lang.toggle": "中文",
    "nav.home": "Home",
    "nav.participants": "Participants",
    "nav.bills": "Bills",
    "nav.settlement": "Settlement",
    "home.createGroup": "Create Group",
    "home.demoMode": "Local demo mode with no authentication.",
    "home.groupPlaceholder": "Weekend Trip",
    "home.create": "Create",
    "home.recentGroups": "Recent Groups",
    "home.noGroup": "No group saved yet.",
    "home.participants": "Participants",
    "home.bills": "Bills",
    "home.settlement": "Settlement",
    "home.quickStart": "Quick Start",
    "home.quickStart1": "Create a group name for your trip, event, or house.",
    "home.quickStart2": "Add everyone in the participants page.",
    "home.quickStart3": "Add bills and choose equal or weighted split.",
    "home.quickStart4": "Open settlement to see who should pay whom.",
    "home.defaultInfo": "Default Demo Info",
    "home.defaultInfoBody": "Recommended first demo: create a group named \"Weekend Getaway\", add 3 participants, then create one bill of RM100 with 6% fee.",
    "home.tip": "Tip",
    "home.tipBody": "You can create multiple groups and switch between participants, bills, and settlements from each card.",
    "participants.title": "Participants",
    "participants.placeholder": "Add participant",
    "participants.add": "Add",
    "bills.create": "Create Bill",
    "bills.store": "Store",
    "bills.equal": "Equal Split",
    "bills.weighted": "Weighted Split",
    "bills.item": "Item",
    "bills.amount": "Amount",
    "bills.feeName": "Fee name",
    "bills.percentage": "Percentage",
    "bills.fixed": "Fixed",
    "bills.feeValue": "Fee value",
    "bills.save": "Save Bill",
    "bills.title": "Bills",
    "bills.subtotal": "Subtotal",
    "bills.fees": "Fees",
    "bills.total": "Total",
    "bills.empty": "No bills yet.",
    "settlement.netBalances": "Net Balances",
    "settlement.transferPlan": "Transfer Plan",
    "settlement.pays": "pays",
    "settlement.empty": "No transfers required."
  },
  zh: {
    "app.title": "Splity",
    "lang.toggle": "English",
    "nav.home": "首页",
    "nav.participants": "参与者",
    "nav.bills": "账单",
    "nav.settlement": "结算",
    "home.createGroup": "创建群组",
    "home.demoMode": "本地演示模式，无需登录。",
    "home.groupPlaceholder": "周末旅行",
    "home.create": "创建",
    "home.recentGroups": "最近群组",
    "home.noGroup": "还没有保存任何群组。",
    "home.participants": "参与者",
    "home.bills": "账单",
    "home.settlement": "结算",
    "home.quickStart": "快速开始",
    "home.quickStart1": "先为你的旅行、活动或家庭创建一个群组名称。",
    "home.quickStart2": "在参与者页面添加所有成员。",
    "home.quickStart3": "新增账单并选择平均或权重分摊。",
    "home.quickStart4": "打开结算页面查看谁该付给谁。",
    "home.defaultInfo": "默认演示信息",
    "home.defaultInfoBody": "建议先试：创建 \"周末出游\" 群组，添加 3 位参与者，再新增一笔 RM100 且 6% 手续费的账单。",
    "home.tip": "提示",
    "home.tipBody": "你可以创建多个群组，并从每个卡片直接进入参与者、账单和结算页面。",
    "participants.title": "参与者",
    "participants.placeholder": "添加参与者",
    "participants.add": "添加",
    "bills.create": "创建账单",
    "bills.store": "商店",
    "bills.equal": "平均分摊",
    "bills.weighted": "按权重分摊",
    "bills.item": "项目",
    "bills.amount": "金额",
    "bills.feeName": "费用名称",
    "bills.percentage": "百分比",
    "bills.fixed": "固定值",
    "bills.feeValue": "费用值",
    "bills.save": "保存账单",
    "bills.title": "账单",
    "bills.subtotal": "小计",
    "bills.fees": "费用",
    "bills.total": "总计",
    "bills.empty": "还没有账单。",
    "settlement.netBalances": "净额",
    "settlement.transferPlan": "转账方案",
    "settlement.pays": "支付给",
    "settlement.empty": "无需转账。"
  }
} as const;

type MessageKey = keyof typeof messages.en;

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nValue | undefined>(undefined);

function getInitialLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "zh") {
    return saved;
  }

  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const value = useMemo<I18nValue>(() => ({
    language,
    setLanguage: (nextLanguage) => {
      setLanguageState(nextLanguage);
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    },
    toggleLanguage: () => {
      const nextLanguage = language === "en" ? "zh" : "en";
      setLanguageState(nextLanguage);
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    },
    t: (key) => messages[language][key]
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
