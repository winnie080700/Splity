"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { BackToHome } from "@/components/brand/back-to-home";


type Category = {
  label: CategoryLabel;
  count: number;
};

type CategoryLabel =
  | "Most asked"
  | "Bills"
  | "Settlements"
  | "Groups"
  | "Account"
  | "Privacy";

type FaqItem = {
  category: CategoryLabel;
  question: string;
  answer: React.ReactNode;
  tip?: string;
};

const categoryLabels: CategoryLabel[] = [
  "Most asked",
  "Bills",
  "Settlements",
  "Groups",
  "Account",
  "Privacy",
];

const faqs: FaqItem[] = [
  // Most asked
  {
    category: "Most asked",
    question: "Is Splity really free?",
    answer: (
      <>
        Yes. Splity is free for personal use. Guests can view shared bills and settlements without creating an account. We may add optional paid features in the future, but the core bill-splitting flow stays free.
      </>
    ),
    tip: "Pro tip: share a group link so guests can check balances without signing up.",
  },
  {
    category: "Most asked",
    question: "Do guests need to create an account?",
    answer: (
      <>
        No. Guests can open a shared group or bill link and view the information they were invited to see. An account is only needed for features like creating groups, syncing data, managing history, or keeping long-term access.
      </>
    ),
  },
  {
    category: "Most asked",
    question: "Can I split a bill unevenly?",
    answer: (
      <>
        Yes. When adding a bill, choose <strong>Split unevenly</strong> and split by fixed amounts, percentages, or shares. Splity checks that the split total matches the bill amount before saving.
      </>
    ),
  },
  {
    category: "Most asked",
    question: "How does Splity reduce the number of transfers?",
    answer: (
      <>
        Splity calculates each member&apos;s net balance, then matches people who owe money with people who should receive money. This reduces unnecessary back-and-forth payments and usually creates the smallest practical set of settlements.
      </>
    ),
  },
  {
    category: "Most asked",
    question: "Does Splity support multiple currencies?",
    answer: (
      <>
        Not currently. Each group is designed around a single currency. If you paid in another currency, convert the amount first and enter it using the group&apos;s currency.
      </>
    ),
  },
  {
    category: "Most asked",
    question: "Can I attach a receipt photo to a bill?",
    answer: (
      <>
        Yes. You can attach a receipt image when creating or editing a bill. Members with access to the group can view the receipt together with the bill details.
      </>
    ),
  },
  {
    category: "Most asked",
    question: "What happens if I delete my account?",
    answer: (
      <>
        Your account and personal bill history are scheduled for deletion according to our data deletion process. Shared group records may remain visible to other group members, but your profile may be shown as <strong>Former member</strong>.
      </>
    ),
  },
  {
    category: "Most asked",
    question: "Which languages does Splity support?",
    answer: (
      <>
        Splity currently supports English and Chinese for the landing page and main app flows. You can switch language from the app header or language selector.
      </>
    ),
  },

  // Bills
  {
    category: "Bills",
    question: "How do I add a bill?",
    answer: (
      <>
        Open a group, tap <strong>Add bill</strong>, enter the amount, payer, participants, split method, and optional notes or receipt photo. Splity will calculate each person&apos;s share automatically.
      </>
    ),
  },
  {
    category: "Bills",
    question: "Who can edit a bill?",
    answer: (
      <>
        Members with access to the group can edit bills depending on the group permissions. When a bill is changed, the group balance is recalculated so everyone sees the latest result.
      </>
    ),
  },
  {
    category: "Bills",
    question: "Can I delete a bill?",
    answer: (
      <>
        Yes. Open the bill details and choose delete. Once deleted, the bill no longer counts toward group balances or settlement calculations.
      </>
    ),
  },
  {
    category: "Bills",
    question: "Can one person pay for everyone?",
    answer: (
      <>
        Yes. Set that person as the payer and include the relevant participants in the split. Splity will calculate how much each participant owes the payer.
      </>
    ),
  },
  {
    category: "Bills",
    question: "Can I split a bill with only some group members?",
    answer: (
      <>
        Yes. When adding a bill, select only the people who participated in that expense. Members who are not selected will not be included in that bill&apos;s split.
      </>
    ),
  },
  {
    category: "Bills",
    question: "What is the difference between equal, amount, percentage, and share splits?",
    answer: (
      <>
        <strong>Equal</strong> splits the bill evenly. <strong>Amount</strong> lets you enter exact values. <strong>Percentage</strong> divides the bill by custom percentages. <strong>Shares</strong> lets you assign relative portions, such as 2 shares for one person and 1 share for another.
      </>
    ),
  },
  {
    category: "Bills",
    question: "What happens if the split does not add up to the bill amount?",
    answer: (
      <>
        Splity will ask you to fix the split before saving. This prevents balances from becoming inconsistent.
      </>
    ),
  },
  {
    category: "Bills",
    question: "Can I add notes to a bill?",
    answer: (
      <>
        Yes. Notes are useful for context such as restaurant names, trip details, payment references, or what the expense included. Notes may be visible to group members.
      </>
    ),
  },
  {
    category: "Bills",
    question: "Can I change the payer after creating a bill?",
    answer: (
      <>
        Yes. Open the bill, edit the payer, and save. Splity will recalculate the balances based on the updated payer.
      </>
    ),
  },
  {
    category: "Bills",
    question: "Can I duplicate a bill?",
    answer: (
      <>
        If duplicate bill is available in your version, you can use it to quickly create a similar bill with the same members and split method. Otherwise, create a new bill manually.
      </>
    ),
  },
  {
    category: "Bills",
    question: "Are receipt images visible to everyone?",
    answer: (
      <>
        Receipt images are visible to people who have access to the group or bill. Avoid uploading receipts that contain sensitive information you do not want group members to see.
      </>
    ),
  },
  {
    category: "Bills",
    question: "Can I export bill history?",
    answer: (
      <>
        If export is enabled, you can export your group or account data as a CSV file for personal records. Exported files may include bill names, amounts, participants, dates, and settlement status.
      </>
    ),
  },

  // Settlements
  {
    category: "Settlements",
    question: "What is a settlement?",
    answer: (
      <>
        A settlement is a suggested transfer between two people to balance what they owe. For example, if Alex owes Jamie $20, Splity may show a settlement from Alex to Jamie for $20.
      </>
    ),
  },
  {
    category: "Settlements",
    question: "Does Splity transfer money?",
    answer: (
      <>
        No. Splity calculates who owes whom, but it does not move money, hold funds, or process payments. You can settle using cash, bank transfer, payment apps, or any method your group agrees on.
      </>
    ),
  },
  {
    category: "Settlements",
    question: "How does Splity decide who should pay whom?",
    answer: (
      <>
        Splity adds up all bills, calculates each person&apos;s net balance, then suggests transfers from people who owe money to people who should receive money.
      </>
    ),
  },
  {
    category: "Settlements",
    question: "Why is the settlement amount different from a single bill amount?",
    answer: (
      <>
        Settlements are based on the total balance across the whole group, not just one bill. A person may have paid for one bill but owed money on another, so Splity combines everything into a net result.
      </>
    ),
  },
  {
    category: "Settlements",
    question: "I marked a settlement as paid by mistake. Can I undo it?",
    answer: (
      <>
        Yes. Open the settlement row, change it back to pending, and save. The group can still see the updated settlement status.
      </>
    ),
  },
  {
    category: "Settlements",
    question: "Who can mark a settlement as paid?",
    answer: (
      <>
        Usually, the payer or involved group members can update settlement status. The exact behavior may depend on the group permissions in your version of Splity.
      </>
    ),
  },
  {
    category: "Settlements",
    question: "What if someone pays outside Splity?",
    answer: (
      <>
        That is expected. Splity is used to track the result. After the payment happens outside the app, mark the settlement as paid so the group record stays accurate.
      </>
    ),
  },
  {
    category: "Settlements",
    question: "Can I hide completed settlements?",
    answer: (
      <>
        If your version supports filters, you can switch between pending, paid, and all settlements. This makes it easier to focus on what still needs to be paid.
      </>
    ),
  },

  // Groups
  {
    category: "Groups",
    question: "How do I create a group?",
    answer: (
      <>
        Tap <strong>Create group</strong>, enter a group name, choose a currency, and add members. After the group is created, you can start adding bills.
      </>
    ),
  },
  {
    category: "Groups",
    question: "How do I invite people to a group?",
    answer: (
      <>
        Open the group and use the invite option to share a link. People with the link can join or view the group depending on the access settings.
      </>
    ),
  },
  {
    category: "Groups",
    question: "Can guests join a group without signing up?",
    answer: (
      <>
        Guests can access shared links without creating an account for basic viewing or settlement flows. For long-term access, sync, or managing their own groups, they may need an account.
      </>
    ),
  },
  {
    category: "Groups",
    question: "Can I remove someone from a group?",
    answer: (
      <>
        Yes, if you have permission to manage the group. Past bills involving that person may remain in the group history so balances and records stay consistent.
      </>
    ),
  },
  {
    category: "Groups",
    question: "What happens when I leave a group?",
    answer: (
      <>
        You may lose access to that group&apos;s future updates. Past shared records may remain visible to other members because they are part of the group&apos;s bill history.
      </>
    ),
  },
  {
    category: "Groups",
    question: "Can I change a group&apos;s currency?",
    answer: (
      <>
        A group is designed around one currency. To avoid confusing old and new bills, it is usually better to create a new group if you need to use a different currency.
      </>
    ),
  },

  // Account
  {
    category: "Account",
    question: "Do I need an account to use Splity?",
    answer: (
      <>
        You can view some shared content as a guest, but an account is recommended if you want to create groups, sync data, keep history, or access your bills across devices.
      </>
    ),
  },
  {
    category: "Account",
    question: "Can I change my display name?",
    answer: (
      <>
        Yes. Open your account or profile settings and update your display name. Group members may see the new name in shared groups.
      </>
    ),
  },
  {
    category: "Account",
    question: "Can I use Splity on multiple devices?",
    answer: (
      <>
        Yes, if you are signed in. Your groups and bills can sync across devices connected to the same account.
      </>
    ),
  },
  {
    category: "Account",
    question: "I lost access to my account. What should I do?",
    answer: (
      <>
        Try signing in with the same method you originally used, such as Apple, Google, or email. If you still cannot access your account, contact support with the email connected to your account.
      </>
    ),
  },
  {
    category: "Account",
    question: "How do I delete my account?",
    answer: (
      <>
        Go to account settings and choose <strong>Delete account</strong>. If you cannot access the app, contact support and request account deletion using the email linked to your account.
      </>
    ),
  },

  // Privacy
  {
    category: "Privacy",
    question: "Is my bill data private?",
    answer: (
      <>
        Your bill data is not public. It is only shown to people who have access to the relevant group, bill, or shared link. Be careful when sharing invite links with others.
      </>
    ),
  },
  {
    category: "Privacy",
    question: "Who can see my receipts, notes, and bill details?",
    answer: (
      <>
        People with access to the group or shared bill may be able to see bill details, notes, receipt images, participants, and settlement status.
      </>
    ),
  },
  {
    category: "Privacy",
    question: "Does Splity sell my personal data?",
    answer: (
      <>
        No. Splity does not sell your personal data. We may use trusted service providers for hosting, authentication, analytics, crash reporting, and support, as described in our Privacy Policy.
      </>
    ),
  },
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24">
      <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--splity-line)] bg-white shadow-[0_10px_30px_rgba(12,21,56,0.04)]">
      <button
        aria-expanded={open}
        className="grid w-full grid-cols-[34px_1fr_34px] items-center gap-4 px-5 py-5 text-left transition-colors duration-200 hover:bg-[#fbfaf5] sm:px-7"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#fff2c8] font-[var(--splity-mono)] text-xs font-bold text-[var(--splity-gold-strong)]">Q</span>
        <span className="font-[var(--splity-display)] text-[18px] font-semibold leading-snug">{item.question}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-[9px] transition-colors duration-200 ${open ? "bg-[var(--splity-navy)] text-white" : "bg-[#fbfaf5] text-[var(--splity-muted)]"}`}>
          <Chevron open={open} />
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="pb-6 pl-[72px] pr-5 text-[15px] leading-7 text-[var(--splity-muted)] sm:pl-[88px] sm:pr-14">
            <p>{item.answer}</p>
            {item.tip ? (
              <p className="mt-3 inline-flex rounded-lg bg-[#fff2c8] px-3 py-2 text-[13px] font-semibold text-[var(--splity-gold-strong)]">
                {item.tip}
              </p>
            ) : null}
            <span className="sr-only">Question {index + 1}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryLabel>("Most asked");
  const [query, setQuery] = useState("");

  const categories = useMemo<Category[]>(
    () =>
      categoryLabels.map((label) => ({
        label,
        count: faqs.filter((faq) => faq.category === label).length,
      })),
    []
  );

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return faqs.filter((faq) => {
      if (!normalizedQuery) {
        return faq.category === activeCategory;
      }

      return [faq.question, faq.category, faq.tip ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeCategory, query]);

  return (
    <main className="min-h-screen bg-[#efede7] px-3 py-7 text-[var(--splity-ink)] sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <BackToHome />
      </header>

      <section className="mt-8 overflow-hidden rounded-[26px] bg-[var(--splity-navy)] px-6 py-12 text-white sm:px-10 lg:px-12" id="help">
        <div className="relative min-h-[250px]">
          <div className="absolute -right-10 -top-16 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(233,177,66,0.22),transparent_68%)]" />
          <div className="absolute bottom-0 right-3 hidden font-[var(--splity-serif)] text-[240px] leading-none text-white/16 lg:block">?</div>
          <div className="relative max-w-[560px]">
            <p className="font-[var(--splity-mono)] text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--splity-gold)]">• Help & FAQ</p>
            <h1 className="mt-5 font-[var(--splity-display)] text-[clamp(2.6rem,5vw,4rem)] font-bold leading-tight">
              How can we <span className="font-[var(--splity-serif)] font-normal italic text-[var(--splity-gold)]">help?</span>
            </h1>
            <p className="mt-4 max-w-[460px] text-[16px] leading-7 text-white/78">
              Search the knowledge base, dig through common questions, or send us a note. We usually reply within a day.
            </p>
            <label className="mt-8 flex max-w-[560px] items-center gap-3 rounded-xl border border-white/18 bg-white/10 px-4 py-3 text-white/65">
              <SearchIcon />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/55"
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Try "remove a member" or "receipt"...'
                type="search"
                value={query}
              />
              <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 font-[var(--splity-mono)] text-xs">↵</span>
            </label>
          </div>
        </div>
      </section>

      <section className="mt-10" id="faq">
        <p className="font-[var(--splity-mono)] text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">• Frequently asked</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit rounded-2xl border border-[var(--splity-line)] bg-white p-3 shadow-[0_10px_28px_rgba(12,21,56,0.04)]">
            {categories.map((category) => (
              <button
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  activeCategory === category.label ? "bg-[var(--splity-navy)] text-white" : "text-[var(--splity-ink)] hover:bg-[#fbfaf5]"
                }`}
                key={category.label}
                onClick={() => setActiveCategory(category.label)}
                type="button"
              >
                <span>{category.label}</span>
                <span className={activeCategory === category.label ? "text-white/80" : "text-[var(--splity-muted)]"}>{category.count}</span>
              </button>
            ))}
          </aside>
          <div className="space-y-3">
            {filteredFaqs.length > 0 ? filteredFaqs.map((item, index) => (
              <FaqRow index={index} item={item} key={item.question} />
            )) : (
              <div className="rounded-2xl border border-[var(--splity-line)] bg-white p-8 text-center shadow-[0_10px_30px_rgba(12,21,56,0.04)]">
                <p className="font-[var(--splity-display)] text-xl font-semibold">No questions found.</p>
                <p className="mt-2 text-sm text-[var(--splity-muted)]">Try another keyword or switch categories.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-[18px] border border-[var(--splity-line)] bg-white px-6 py-9 shadow-[0_10px_28px_rgba(12,21,56,0.04)] sm:px-8" id="contact">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-[var(--splity-mono)] text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--splity-gold-strong)]">Still stuck?</p>
            <h2 className="mt-3 font-[var(--splity-display)] text-3xl font-semibold">
              Talk to a <span className="font-[var(--splity-serif)] font-normal italic">human.</span>
            </h2>
            <p className="mt-3 max-w-[520px] text-[14px] leading-6 text-[var(--splity-muted)]">
              Drop us a note and we&apos;ll get back to you, usually within a day. Bug reports get a love-letter response.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a className="inline-flex items-center justify-center rounded-full bg-[var(--splity-navy)] px-5 py-3 text-sm font-semibold text-white" href="mailto:winnie.chngsm@gmail.com">
              Mail
            </a>
            <a className="inline-flex items-center justify-center rounded-full border border-[var(--splity-line-strong)] px-5 py-3 text-sm font-semibold text-[var(--splity-ink)] transition-colors hover:bg-[#fbfaf5]" href="https://github.com/winnie080700/Splity" rel="noreferrer" target="_blank">
              GitHub
            </a>
          </div>
        </div>
      </section>

      <footer className="mt-12 flex flex-col gap-3 pb-3 font-[var(--splity-mono)] text-xs uppercase tracking-[0.12em] text-[var(--splity-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>+ Splity · 2026</span>
        <span>Made with care by Winnie</span>
      </footer>
    </main>
  );
}
