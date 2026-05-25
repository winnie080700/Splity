import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { BackToHome } from "@/components/brand/back-to-home";
import { LEGAL_TYPOGRAPHY as T } from "@/components/legal/typography";

const { section: SECTION_SPACING, h2: H2, h3: H3, p: P, ul: UL, muted: MUTED, link: LINK } = T;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--splity-bg)] px-4 py-10 text-[var(--splity-ink)] sm:px-8">
      <article className="mx-auto max-w-3xl">
        <BackToHome />

        <header className="mt-10 border-b border-[var(--splity-line)] pb-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--splity-muted)]">
            Legal
          </p>
          <h1 className="mt-3 font-[var(--splity-display)] text-4xl sm:text-5xl">
            Privacy Policy
          </h1>
          <p className={`mt-4 text-sm ${MUTED}`}>Last updated: 21 May 2026</p>
        </header>

        <div className="mt-10 flex flex-col gap-2">
          <p className={P}>
            This Privacy Policy explains how Splity (&quot;Splity&quot;, &quot;we&quot;, &quot;us&quot;, or
            &quot;our&quot;) collects, uses, stores, and shares information when you use our mobile
            application, website, and related services (collectively, the &quot;Service&quot;).
          </p>
          <p className={P}>By using Splity, you agree to the practices described in this Privacy Policy.</p>
        </div>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>1. Information We Collect</h2>
          <p className={P}>We may collect the following types of information depending on how you use Splity.</p>

          <h3 className={H3}>1.1 Account Information</h3>
          <p className={P}>If you create an account, we may collect:</p>
          <ul className={UL}>
            <li>Name or display name</li>
            <li>Email address</li>
            <li>Profile photo, if provided</li>
            <li>Login provider information, such as Apple, Google, or email-based authentication</li>
            <li>Account settings and preferences</li>
          </ul>

          <h3 className={H3}>1.2 Expense and Group Information</h3>
          <p className={P}>
            Splity is a bill-splitting and expense-tracking app. To provide the Service, we may collect and
            store information you enter into the app, including:
          </p>
          <ul className={UL}>
            <li>Expense names and descriptions</li>
            <li>Expense amounts</li>
            <li>Currency</li>
            <li>Dates</li>
            <li>Group names</li>
            <li>Member names or nicknames</li>
            <li>Split percentages, shares, or balances</li>
            <li>Settlement records</li>
            <li>Notes attached to expenses</li>
            <li>Receipt images or attachments, if this feature is available and used</li>
          </ul>
          <p className={P}>
            You are responsible for ensuring that you have permission to enter or share information about
            other people in Splity.
          </p>

          <h3 className={H3}>1.3 Contacts and Invitations</h3>
          <p className={P}>
            If Splity allows you to invite other people or import contacts, we may process contact-related
            information only when you choose to use that feature. This may include:
          </p>
          <ul className={UL}>
            <li>Email addresses</li>
            <li>Phone numbers</li>
            <li>Contact names</li>
            <li>Invitation status</li>
          </ul>
          <p className={P}>
            We do not sell your contacts. We use this information only to help you invite people, identify
            group members, or share expenses.
          </p>

          <h3 className={H3}>1.4 Device, Usage, and Diagnostic Information</h3>
          <p className={P}>We may collect technical and usage information, including:</p>
          <ul className={UL}>
            <li>Device type and model</li>
            <li>Operating system and version</li>
            <li>App version</li>
            <li>Language and region settings</li>
            <li>IP address</li>
            <li>Crash reports</li>
            <li>Performance logs</li>
            <li>Feature usage</li>
            <li>Error logs</li>
            <li>Approximate location derived from IP address, where applicable</li>
          </ul>
          <p className={P}>We use this information to operate, secure, debug, and improve Splity.</p>

          <h3 className={H3}>1.5 Payment Information</h3>
          <p className={P}>
            Splity is a bill-splitting and expense calculation tool. Unless expressly stated, Splity does not
            process payments, hold user funds, provide banking services, or transfer money between users.
          </p>
          <p className={P}>
            If Splity later integrates payment providers, payment processing may be handled by third-party
            payment processors. We do not store full payment card numbers unless explicitly stated.
          </p>

          <h3 className={H3}>1.6 Communications</h3>
          <p className={P}>
            If you contact us for support, feedback, bug reports, or legal inquiries, we may collect:
          </p>
          <ul className={UL}>
            <li>Your name</li>
            <li>Email address</li>
            <li>Message content</li>
            <li>Device or diagnostic information you choose to provide</li>
          </ul>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>2. How We Use Information</h2>
          <p className={P}>We use the information we collect to:</p>
          <ul className={UL}>
            <li>Provide and maintain Splity</li>
            <li>Create and manage user accounts</li>
            <li>Create, calculate, store, and sync expenses</li>
            <li>Share expense information with group members selected by users</li>
            <li>Calculate balances and settlement amounts</li>
            <li>Send invitations and service-related notifications</li>
            <li>Provide customer support</li>
            <li>Detect, prevent, and fix errors, fraud, abuse, and security issues</li>
            <li>Analyze app performance and improve user experience</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p className={P}>
            We do not use your private expense data to target third-party advertising unless this Privacy
            Policy is updated to clearly state otherwise.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>3. How Information Is Shared</h2>
          <p className={P}>We may share information in the following situations.</p>

          <h3 className={H3}>3.1 With Other Users in Your Groups</h3>
          <p className={P}>
            Expense and group information may be visible to other members of the same group or shared
            expense. For example, group members may see expense names, amounts, participants, balances,
            notes, and settlement status.
          </p>
          <p className={P}>
            Please avoid entering sensitive information into expense names, notes, or group names unless you
            are comfortable sharing it with the relevant group members.
          </p>

          <h3 className={H3}>3.2 With Service Providers</h3>
          <p className={P}>We may use third-party service providers to operate Splity, such as:</p>
          <ul className={UL}>
            <li>Cloud hosting providers — Vercel</li>
            <li>Database providers — Supabase</li>
            <li>Authentication providers — Supabase Auth</li>
            <li>Email or notification service providers — Supabase</li>
          </ul>
          <p className={P}>
            These providers may process information on our behalf only as needed to provide their services
            to us.
          </p>

          <h3 className={H3}>3.3 Legal Compliance and Safety</h3>
          <p className={P}>We may disclose information if we believe it is reasonably necessary to:</p>
          <ul className={UL}>
            <li>Comply with applicable laws, regulations, legal processes, or government requests</li>
            <li>Protect the rights, property, or safety of Splity, our users, or others</li>
            <li>Detect or prevent fraud, abuse, security incidents, or technical issues</li>
            <li>Enforce our Terms of Use</li>
          </ul>

          <h3 className={H3}>3.4 Business Transfers</h3>
          <p className={P}>
            If Splity is involved in a merger, acquisition, financing, reorganization, sale of assets, or
            similar transaction, user information may be transferred as part of that transaction, subject to
            this Privacy Policy or a policy with materially similar protections.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>4. Data Retention</h2>
          <p className={P}>
            We retain information for as long as reasonably necessary to provide Splity, comply with legal
            obligations, resolve disputes, enforce agreements, and maintain security.
          </p>
          <p className={P}>The retention period depends on the type of information, including:</p>
          <ul className={UL}>
            <li>Account information: retained while your account is active</li>
            <li>Expense and group data: retained while needed for your account or shared groups</li>
            <li>Support messages: retained as needed for support and recordkeeping</li>
            <li>Diagnostic logs: usually retained for a limited period</li>
            <li>Backup data: may remain for a limited period before deletion from backup systems</li>
          </ul>
          <p className={P}>
            When you delete your account, we will delete or anonymize personal information associated with
            your account, unless we need to retain certain information for legal, security, fraud
            prevention, backup, or legitimate business reasons.
          </p>
          <p className={P}>
            Some shared expense or group information may remain visible to other group members if it is part
            of a shared record they are entitled to keep.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>5. Account Deletion</h2>
          <p className={P}>If Splity allows account creation, you may request deletion of your account by:</p>
          <ul className={UL}>
            <li>Using the account deletion feature inside the app; or</li>
            <li>
              Contacting us at{" "}
              <a
                className={LINK}
                href="mailto:winnie.chngsm@gmail.com"
              >
                winnie.chngsm@gmail.com
              </a>
            </li>
          </ul>
          <p className={P}>
            When your account is deleted, we will delete or anonymize personal information associated with
            your account, subject to the retention limits described above.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>6. Security</h2>
          <p className={P}>
            We use reasonable technical and organizational measures to protect information, including
            encryption in transit, access controls, and secure infrastructure practices.
          </p>
          <p className={P}>
            However, no method of transmission or storage is completely secure. We cannot guarantee absolute
            security.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>7. Your Rights and Choices</h2>
          <p className={P}>Depending on your location, you may have rights to:</p>
          <ul className={UL}>
            <li>Access the personal information we hold about you</li>
            <li>Correct inaccurate information</li>
            <li>Delete your information</li>
            <li>Object to or restrict certain processing</li>
            <li>Request a copy of your information</li>
            <li>Withdraw consent where processing is based on consent</li>
            <li>Lodge a complaint with a data protection authority</li>
          </ul>
          <p className={P}>We may need to verify your identity before responding to certain requests.</p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>8. International Data Transfers</h2>
          <p className={P}>
            Splity may process and store information in countries other than your country of residence.
            These countries may have data protection laws different from those in your jurisdiction.
          </p>
          <p className={P}>
            Where required, we use appropriate safeguards for international transfers of personal
            information.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>9. Children&apos;s Privacy</h2>
          <p className={P}>
            Splity is not intended for children under the age of 13, or the equivalent minimum age in your
            jurisdiction.
          </p>
          <p className={P}>
            We do not knowingly collect personal information from children. If you believe a child has
            provided personal information to us, contact us at{" "}
            <a
              className={LINK}
              href="mailto:winnie.chngsm@gmail.com"
            >
              winnie.chngsm@gmail.com
            </a>
            , and we will take appropriate steps to delete it.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>10. Third-Party Links and Services</h2>
          <p className={P}>
            Splity may contain links to third-party websites, services, or authentication providers. Their
            privacy practices are governed by their own privacy policies. We are not responsible for the
            privacy practices of third parties.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>11. Changes to This Privacy Policy</h2>
          <p className={P}>
            We may update this Privacy Policy from time to time. If we make material changes, we will
            provide notice by updating the &quot;Last updated&quot; date, posting a notice in the app, or
            using another appropriate method.
          </p>
          <p className={P}>
            Your continued use of Splity after the updated Privacy Policy becomes effective means you accept
            the updated policy.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>12. Contact Us</h2>
          <p className={P}>
            If you have questions about this Privacy Policy or our privacy practices, contact us at:
          </p>
          <dl className="mt-4 grid gap-2 text-base leading-relaxed text-[var(--splity-ink)] sm:grid-cols-[120px_1fr]">
            <dt className={`font-semibold ${MUTED}`}>Name</dt>
            <dd>Winnie Choong</dd>
            <dt className={`font-semibold ${MUTED}`}>Email</dt>
            <dd>
              <a
                className={LINK}
                href="mailto:winnie.chngsm@gmail.com"
              >
                winnie.chngsm@gmail.com
              </a>
            </dd>
            <dt className={`font-semibold ${MUTED}`}>GitHub</dt>
            <dd>
              <a
                className={LINK}
                href="https://github.com/winnie080700"
                target="_blank"
                rel="noreferrer"
              >
                @winnie080700
              </a>
            </dd>
            <dt className={`font-semibold ${MUTED}`}>App</dt>
            <dd>Splity</dd>
          </dl>
        </section>

        <footer className="mt-16 border-t border-[var(--splity-line)] pt-8">
          <Link
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--splity-navy)] hover:underline"
            href="/terms"
          >
            See Terms of Service
            <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
          </Link>
        </footer>
      </article>
    </main>
  );
}
