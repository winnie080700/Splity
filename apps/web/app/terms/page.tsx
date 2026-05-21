import Link from "next/link";

import { BackToHome } from "@/components/brand/back-to-home";
import { LEGAL_TYPOGRAPHY as T } from "@/components/legal/typography";

const { section: SECTION_SPACING, h2: H2, p: P, ul: UL, muted: MUTED, link: LINK } = T;

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--splity-bg)] px-4 py-10 text-[var(--splity-ink)] sm:px-8">
      <article className="mx-auto max-w-3xl">
        <BackToHome />

        <header className="mt-10 border-b border-[var(--splity-line)] pb-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--splity-muted)]">
            Legal
          </p>
          <h1 className="mt-3 font-[var(--splity-display)] text-4xl font-bold sm:text-5xl">
            Terms of Service
          </h1>
          <p className={`mt-4 text-sm ${MUTED}`}>Last updated: 21 May 2026</p>
        </header>

        <div className="mt-10 space-y-2">
          <p className={P}>
            These Terms of Use (&quot;Terms&quot;) govern your access to and use of Splity
            (&quot;Splity&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), including our
            mobile application, website, and related services (collectively, the &quot;Service&quot;).
          </p>
          <p className={P}>By using Splity, you agree to these Terms. If you do not agree, do not use the Service.</p>
        </div>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>1. What Splity Does</h2>
          <p className={P}>
            Splity is a bill-splitting and expense-tracking tool. It helps users record shared expenses,
            calculate balances, manage groups, and track settlements.
          </p>
          <p className={P}>
            Unless expressly stated otherwise, Splity is not a bank, payment processor, money transfer
            service, financial institution, debt collection service, tax advisor, accounting firm, or legal
            advisor.
          </p>
          <p className={P}>
            Splity may help calculate who owes whom, but users are responsible for verifying the accuracy of
            all entries, calculations, and settlements.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>2. Eligibility</h2>
          <p className={P}>
            You must be at least 13 years old, or the minimum age required in your jurisdiction, to use
            Splity.
          </p>
          <p className={P}>
            By using Splity, you represent that you have the legal capacity to agree to these Terms.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>3. Accounts</h2>
          <p className={P}>Some features may require an account. You agree to:</p>
          <ul className={UL}>
            <li>Provide accurate and complete account information</li>
            <li>Keep your login credentials secure</li>
            <li>Notify us if you suspect unauthorized access</li>
            <li>Be responsible for activity under your account</li>
          </ul>
          <p className={P}>
            We may suspend or terminate accounts that violate these Terms or create security, legal, or
            operational risks.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>4. User Content</h2>
          <p className={P}>
            You may enter, upload, or share content through Splity, including expense names, amounts, group
            names, member names, notes, images, receipts, and settlement records (&quot;User Content&quot;).
          </p>
          <p className={P}>You retain ownership of your User Content.</p>
          <p className={P}>
            You grant Splity a limited, non-exclusive, worldwide license to host, store, process, display,
            sync, and share User Content as necessary to provide and improve the Service.
          </p>
          <p className={P}>
            You are responsible for your User Content and for ensuring you have the right to enter or share
            it.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>5. Shared Groups and Visibility</h2>
          <p className={P}>
            When you create or join a group, certain information may be visible to other group members,
            including:
          </p>
          <ul className={UL}>
            <li>Expense details</li>
            <li>Amounts</li>
            <li>Participants</li>
            <li>Balances</li>
            <li>Notes</li>
            <li>Settlement status</li>
            <li>Member names or nicknames</li>
          </ul>
          <p className={P}>
            Do not enter confidential, sensitive, illegal, or private information into shared fields unless
            you are comfortable sharing it with the relevant group members.
          </p>
          <p className={P}>
            Splity is not responsible for how other group members use or disclose information that you share
            with them.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>6. Accuracy of Expenses and Calculations</h2>
          <p className={P}>Splity provides expense calculations based on information entered by users.</p>
          <p className={P}>You acknowledge that:</p>
          <ul className={UL}>
            <li>Users may enter incorrect or incomplete information</li>
            <li>Calculations depend on the data provided</li>
            <li>Exchange rates, rounding, percentages, and split methods may produce differences</li>
            <li>Splity does not guarantee that any person will actually pay or settle an amount</li>
            <li>Disputes between users are the responsibility of those users</li>
          </ul>
          <p className={P}>
            You should independently verify important balances, settlements, and payment obligations.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>7. Payments and Settlements</h2>
          <p className={P}>
            Unless explicitly stated in the app, Splity does not process payments or transfer money.
          </p>
          <p className={P}>
            If Splity displays a settlement amount, that amount is for recordkeeping and convenience only.
            Any actual payment or settlement is made outside Splity or through a third-party payment
            provider, if integrated.
          </p>
          <p className={P}>
            Splity is not responsible for failed payments, payment disputes, chargebacks, banking errors, or
            disputes between users.
          </p>
          <p className={P}>If payment features are later added, additional terms may apply.</p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>8. Acceptable Use</h2>
          <p className={P}>You agree not to:</p>
          <ul className={UL}>
            <li>Use Splity for unlawful, fraudulent, abusive, or harmful purposes</li>
            <li>Upload or share illegal, defamatory, harassing, discriminatory, or infringing content</li>
            <li>Enter another person&apos;s personal information without permission</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Attempt to access accounts, systems, or data without authorization</li>
            <li>Reverse engineer, scrape, copy, or misuse the Service except as allowed by law</li>
            <li>Use Splity to send spam, phishing, malware, or misleading invitations</li>
            <li>Circumvent usage limits, security measures, or access controls</li>
          </ul>
          <p className={P}>
            We may remove content, restrict access, or terminate accounts that violate these Terms.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>9. Free Service and Changes</h2>
          <p className={P}>Splity may currently be provided free of charge.</p>
          <p className={P}>
            We may add, remove, modify, suspend, or discontinue features at any time. We may also introduce
            paid features, subscriptions, advertisements, or usage limits in the future.
          </p>
          <p className={P}>
            If paid features are introduced, additional payment terms will apply before you are charged.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>10. Third-Party Services</h2>
          <p className={P}>
            Splity may use or integrate third-party services, including authentication providers, cloud
            infrastructure, analytics, crash reporting, notification tools, or payment providers.
          </p>
          <p className={P}>
            Your use of third-party services may be subject to their own terms and privacy policies. We are
            not responsible for third-party services.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>11. Intellectual Property</h2>
          <p className={P}>
            Splity, including its design, software, logo, branding, features, and content, is owned by us or
            our licensors and is protected by intellectual property laws.
          </p>
          <p className={P}>
            These Terms do not grant you ownership of Splity or any related intellectual property.
          </p>
          <p className={P}>You may use Splity only as permitted by these Terms.</p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>12. Feedback</h2>
          <p className={P}>
            If you send us feedback, ideas, suggestions, or bug reports, you grant us the right to use them
            without restriction or compensation to you.
          </p>
          <p className={P}>We may use feedback to improve Splity or develop new features.</p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>13. Privacy</h2>
          <p className={P}>
            Your use of Splity is also governed by our{" "}
            <Link
              className={LINK}
              href="/privacy"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <p className={P}>
            Please read the Privacy Policy to understand how we collect, use, store, and share information.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>14. Account Suspension and Termination</h2>
          <p className={P}>You may stop using Splity at any time.</p>
          <p className={P}>We may suspend or terminate your access if:</p>
          <ul className={UL}>
            <li>You violate these Terms</li>
            <li>Your use creates legal, security, or operational risk</li>
            <li>We are required to do so by law</li>
            <li>We discontinue the Service or part of it</li>
          </ul>
          <p className={P}>
            After termination, some provisions of these Terms will continue to apply, including ownership,
            disclaimers, limitation of liability, and dispute provisions.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>15. Disclaimers</h2>
          <p className={P}>
            Splity is provided on an &quot;as is&quot; and &quot;as available&quot; basis.
          </p>
          <p className={P}>
            To the maximum extent permitted by law, we disclaim all warranties, whether express, implied, or
            statutory, including warranties of merchantability, fitness for a particular purpose, accuracy,
            availability, security, and non-infringement.
          </p>
          <p className={P}>We do not guarantee that:</p>
          <ul className={UL}>
            <li>Splity will be uninterrupted or error-free</li>
            <li>Expense calculations will always be accurate</li>
            <li>Data will never be lost or corrupted</li>
            <li>Users will settle amounts shown in the app</li>
            <li>The Service will meet your specific needs</li>
          </ul>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>16. Limitation of Liability</h2>
          <p className={P}>
            To the maximum extent permitted by law, Splity and its developers, owners, employees,
            contractors, and service providers will not be liable for indirect, incidental, special,
            consequential, exemplary, or punitive damages, including loss of data, loss of profits, loss of
            goodwill, or disputes between users.
          </p>
          <p className={P}>
            Our total liability for any claim related to the Service will not exceed the greater of:
          </p>
          <ul className={UL}>
            <li>The amount you paid to use Splity in the 12 months before the claim; or</li>
            <li>USD $50</li>
          </ul>
          <p className={P}>
            Some jurisdictions do not allow certain limitations of liability, so some of these limitations
            may not apply to you.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>17. Indemnity</h2>
          <p className={P}>
            You agree to defend, indemnify, and hold harmless Splity and its developers, owners, employees,
            contractors, and service providers from claims, damages, losses, liabilities, costs, and
            expenses arising from:
          </p>
          <ul className={UL}>
            <li>Your use of the Service</li>
            <li>Your User Content</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of another person&apos;s rights</li>
            <li>Disputes between you and other users</li>
          </ul>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>18. Governing Law</h2>
          <p className={P}>
            These Terms are governed by the laws of Malaysia, without regard to conflict of law rules.
          </p>
          <p className={P}>
            If you are a consumer, you may also have rights under the mandatory laws of your country or
            region of residence.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>19. Dispute Resolution</h2>
          <p className={P}>
            Before filing a legal claim, you agree to contact us at{" "}
            <a
              className={LINK}
              href="mailto:winnie.chngsm@gmail.com"
            >
              winnie.chngsm@gmail.com
            </a>{" "}
            and try to resolve the dispute informally.
          </p>
          <p className={P}>
            If the dispute cannot be resolved informally, it will be handled by the courts or dispute
            resolution process applicable under the governing law section above.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>20. Changes to These Terms</h2>
          <p className={P}>We may update these Terms from time to time.</p>
          <p className={P}>
            If we make material changes, we will provide notice by updating the &quot;Last updated&quot;
            date, posting a notice in the app, or using another appropriate method.
          </p>
          <p className={P}>
            Your continued use of Splity after the updated Terms become effective means you accept the
            updated Terms.
          </p>
        </section>

        <section className={SECTION_SPACING}>
          <h2 className={H2}>21. Contact</h2>
          <p className={P}>If you have questions about these Terms, contact us at:</p>
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
            className="text-sm font-semibold text-[var(--splity-navy)] hover:underline"
            href="/privacy"
          >
            See Privacy Policy →
          </Link>
        </footer>
      </article>
    </main>
  );
}
