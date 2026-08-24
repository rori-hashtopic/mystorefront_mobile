import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" aria-label="MyStorefront home">
            <img src={logo} alt="MyStorefront" className="h-9 w-auto" />
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">MyStorefront</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective date: 25 June 2026 &nbsp;·&nbsp; Contact:{" "}
          <a href="mailto:roxi@mystorefront.io" className="underline underline-offset-4 hover:text-foreground">
            roxi@mystorefront.io
          </a>
        </p>

        <div className="mt-10 space-y-1 text-sm text-muted-foreground border border-border rounded p-4 bg-muted/30">
          <p>
            This Privacy Policy explains how MyStorefront collects, uses, stores, shares, protects and otherwise
            processes personal information when you access or use the MyStorefront website, platform, creator tools,
            brand tools, storefronts, affiliate links, campaign tools, messaging tools, analytics tools, social media
            integrations, plugin functionality, postback tools, discount-code synchronisation tools and related
            services.
          </p>
          <p className="mt-3">
            The terms "MyStorefront", "we", "us" and "our" refer to{" "}
            <strong className="text-foreground">MYSTOREFRONT (PTY) LTD</strong>, a private company registered in the
            Republic of South Africa with registration number{" "}
            <strong className="text-foreground">2026/282770/07</strong>, trading as MyStorefront.
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-7 text-foreground/90">
          <Section heading="1. Purpose of This Privacy Policy">
            <p>
              We respect your privacy and are committed to protecting personal information in accordance with applicable
              data protection laws, including the Protection of Personal Information Act, 2013 (POPIA).
            </p>
            <p>
              This Privacy Policy explains what personal information we collect, where we collect it from, why we
              process it, how we use it, when we share it, how long we keep it, how we protect it, when we transfer it
              outside South Africa, what rights you have and how you can contact us about privacy matters.
            </p>
          </Section>

          <Section heading="2. Our Role Under Data Protection Law">
            <p>
              Depending on the circumstances, MyStorefront may act as a responsible party or as an operator under
              applicable data protection law.
            </p>
            <p>
              Where MyStorefront independently determines the purpose and means of processing personal information to
              operate the Platform, administer accounts, process payments, detect fraud, provide analytics, administer
              Creator payouts and comply with legal obligations, MyStorefront acts as a responsible party.
            </p>
            <p>
              Where MyStorefront processes personal information strictly on behalf of a Brand or Creator and only in
              accordance with their instructions, MyStorefront may act as an operator.
            </p>
          </Section>

          <Section heading="3. Personal Information We Collect">
            <p className="mb-3">We may collect the following categories of personal information:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Account Information:</strong> Name, email address, username, profile
                photo and password when you create an account, apply as a Creator or onboard as a Brand.
              </li>
              <li>
                <strong className="text-foreground">Business Information (Brands):</strong> Trading name, legal name,
                company registration number, website, business category, commission structure, refund policies, billing
                details and authorised representative information.
              </li>
              <li>
                <strong className="text-foreground">Creator Profile Information:</strong> Social media handles,
                platforms, follower counts, engagement metrics, profile images, storefront content, bios, specialisation
                tags and audience information.
              </li>
              <li>
                <strong className="text-foreground">Social Media Data:</strong> Public profile information, follower
                counts, engagement metrics and analytics data when you connect a social media account.
              </li>
              <li>
                <strong className="text-foreground">Communication Data:</strong> Messages, replies, campaign
                correspondence, support queries and communications sent through or in connection with the Platform.
              </li>
              <li>
                <strong className="text-foreground">Financial and Payout Information:</strong> Bank account details,
                payout information, billing information, invoice details, payment status and tax-related information.
              </li>
              <li>
                <strong className="text-foreground">Affiliate and Tracking Data:</strong> Affiliate click IDs, tracking
                links, storefront links, referral URLs, landing page URLs, click timestamps, order attribution data,
                conversion events, commission records and campaign performance data.
              </li>
              <li>
                <strong className="text-foreground">Plugin and Integration Data:</strong> Order IDs, order values,
                payment status, refund status, chargeback data, discount codes used, partner promo codes, conversion
                events, postback records, deduplication event IDs, webhook delivery logs and HMAC signature validation
                data.
              </li>
              <li>
                <strong className="text-foreground">Usage and Analytics Data:</strong> Pages viewed, links clicked,
                session duration, referral sources, browser type, device type, operating system, screen resolution and
                error events.
              </li>
              <li>
                <strong className="text-foreground">Device and Technical Data:</strong> IP address, device identifiers,
                browser fingerprints, cookies, local storage data, session tokens and similar technical identifiers.
              </li>
              <li>
                <strong className="text-foreground">Identity and Verification Data:</strong> Identity documents, address
                verification, banking verification, tax numbers and other verification information required before
                enabling certain features or processing payouts.
              </li>
              <li>
                <strong className="text-foreground">Content Submitted to the Platform:</strong> Creator storefronts,
                product collections, product recommendations, images, videos, bios, hashtags, brand logos, campaign
                briefs, product descriptions, testimonials, reviews and feedback.
              </li>
              <li>
                <strong className="text-foreground">Application Data:</strong> Creator application details, including
                social media handles, follower ranges, primary platforms, WhatsApp numbers and referral codes.
              </li>
            </ul>
          </Section>

          <Section heading="4. How We Collect Personal Information">
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                Directly from you when you register, apply, onboard, update your account, connect social media accounts,
                message through the Platform, complete forms or interact with Platform features.
              </li>
              <li>
                Automatically when you use the Platform, through cookies, tracking technologies, analytics tools, server
                logs and device signals.
              </li>
              <li>From social media platforms when you connect your account and grant access permissions.</li>
              <li>From Brands when Plugin, webhook, postback or integration data is transmitted to us.</li>
              <li>
                From third-party service providers, verification services, analytics providers and fraud prevention
                tools.
              </li>
              <li>
                From other Users, such as Brands sharing Creator information or Creators referring other Creators.
              </li>
            </ul>
          </Section>

          <Section heading="5. Why We Process Personal Information">
            <p className="mb-3">We process personal information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide, operate, maintain, secure and improve the Platform and Services.</li>
              <li>To process Creator applications, review eligibility and administer account approvals.</li>
              <li>To create and manage Brand and Creator accounts, profiles and storefronts.</li>
              <li>
                To facilitate connections, matches, campaigns, collaborations and communications between Brands and
                Creators.
              </li>
              <li>
                To attribute affiliate clicks, track conversions, validate commissions and calculate Creator Earnings.
              </li>
              <li>
                To process Plugin data, postbacks, signed requests, retries, deduplication, refund clawbacks, chargeback
                reporting and discount-code synchronisation.
              </li>
              <li>
                To prepare and send Brand invoices and administer Brand billing, payment collection and payment
                reconciliation.
              </li>
              <li>To process Creator payouts after receiving cleared funds from Brands.</li>
              <li>To verify identity, banking details, tax information and account information.</li>
              <li>
                To detect, investigate and prevent fraud, abuse, circumvention, fake engagement, tracking manipulation,
                duplicate events and misuse of the Platform.
              </li>
              <li>To monitor compliance with these Terms, campaign briefs, applicable laws and Platform policies.</li>
              <li>To provide analytics, reporting, campaign performance insights and dashboard features.</li>
              <li>
                To communicate with you about your account, campaigns, invoices, payouts, policy updates, terms changes
                and support queries.
              </li>
              <li>
                To send you marketing communications where you have given consent or where otherwise permitted by law.
              </li>
              <li>
                To comply with legal obligations, respond to legal process, cooperate with regulators and enforce our
                rights.
              </li>
              <li>To resolve disputes, process complaints and defend legal claims.</li>
              <li>To maintain business records, audit trails, backup records and financial records.</li>
            </ul>
          </Section>

          <Section heading="6. Lawful Basis for Processing">
            <p>We process personal information on the following grounds:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li>
                <strong className="text-foreground">Performance of a contract:</strong> Processing necessary to provide
                the Services, manage your account, process payouts, administer invoices and deliver campaign features.
              </li>
              <li>
                <strong className="text-foreground">Legitimate interests:</strong> Fraud prevention, security,
                analytics, platform improvement, compliance monitoring, dispute resolution and protection of the
                Platform.
              </li>
              <li>
                <strong className="text-foreground">Consent:</strong> Marketing communications and certain cookie-based
                processing where consent is required.
              </li>
              <li>
                <strong className="text-foreground">Legal obligation:</strong> Compliance with tax laws, financial
                reporting, anti-money laundering, court orders, regulatory requirements and applicable data protection
                law.
              </li>
            </ul>
          </Section>

          <Section heading="7. Sharing of Personal Information">
            <p className="mb-3">
              We do not sell personal information. We may share personal information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Between Brands and Creators:</strong> Creator profiles, storefront
                content, analytics and performance data may be visible to Brands on the Platform. Brand campaign briefs,
                product information and commission structures may be visible to Creators.
              </li>
              <li>
                <strong className="text-foreground">Service Providers:</strong> We share information with third-party
                service providers that help us operate the Platform, including hosting providers, cloud infrastructure,
                database providers, email delivery services, payment and banking providers, analytics tools, fraud
                prevention tools, security tools, identity verification services, communication tools and customer
                support tools.
              </li>
              <li>
                <strong className="text-foreground">E-Commerce and Social Media Platforms:</strong> Integration data may
                be shared with or received from Shopify, WooCommerce, Instagram, TikTok, YouTube, Meta, payment
                providers and other connected platforms.
              </li>
              <li>
                <strong className="text-foreground">Legal Requirements:</strong> We may share information when required
                by applicable law, court order, regulatory authority, tax authority, law enforcement agency, the
                Information Regulator or other public authority, or when we reasonably believe disclosure is necessary
                to protect our rights or prevent harm.
              </li>
              <li>
                <strong className="text-foreground">Business Transfers:</strong> In connection with a merger,
                acquisition, sale of assets, restructuring, investment, financing or similar transaction, personal
                information may be transferred to a successor entity.
              </li>
              <li>
                <strong className="text-foreground">Dispute Resolution and Enforcement:</strong> We may share
                information with legal advisers, auditors, accountants, courts and counterparties in connection with
                disputes, claims, investigations or enforcement.
              </li>
            </ul>
          </Section>

          <Section heading="8. Cookies and Tracking Technologies">
            <p>
              We use cookies and similar technologies to operate the Platform, keep users logged in, remember
              preferences, secure accounts, support affiliate tracking and attribution, capture and process affiliate
              click IDs, attribute sales to Creators, detect fraud, support discount-code tracking, improve our services
              and support marketing and campaign measurement where permitted by law.
            </p>
            <p className="mt-3">
              For full details, see our{" "}
              <Link to="/cookie-notice" className="underline underline-offset-4 hover:text-foreground">
                Cookie Notice
              </Link>
              .
            </p>
          </Section>

          <Section heading="9. Plugin and Integration Processing">
            <p>
              Where a Brand installs or enables a MyStorefront Plugin or integration on its e-commerce store,
              MyStorefront may process order, refund, chargeback, discount-code, click ID, attribution, conversion and
              related store data for the purposes of affiliate attribution, commission calculation, refund clawbacks,
              discount-code synchronisation, fraud prevention, billing, reporting, analytics and payout administration.
            </p>
            <p className="mt-3">
              For full details of how Plugin data is handled, see our{" "}
              <Link to="/plugin-privacy-addendum" className="underline underline-offset-4 hover:text-foreground">
                Plugin Privacy Addendum
              </Link>
              .
            </p>
          </Section>

          <Section heading="10. Data Retention">
            <p>
              We retain personal information for as long as reasonably necessary to provide the Services, maintain your
              account, process campaigns, validate commissions, administer payouts, comply with legal obligations,
              resolve disputes, enforce our rights, maintain audit records, comply with tax and financial reporting
              requirements and protect the integrity of the Platform.
            </p>
            <p className="mt-3">
              When personal information is no longer required for any of these purposes, we will take reasonable steps
              to delete, de-identify or anonymise it.
            </p>
          </Section>

          <Section heading="11. Cross-Border Transfers">
            <p>
              MyStorefront operates in South Africa. However, some of our service providers, hosting providers,
              analytics tools, communication tools, payment providers and integration partners may process data in other
              countries.
            </p>
            <p className="mt-3">
              Where we transfer personal information outside South Africa, we take reasonable steps to ensure that
              appropriate safeguards are in place, consistent with applicable data protection law.
            </p>
          </Section>

          <Section heading="12. Security">
            <p>
              We implement appropriate technical and organisational security measures to protect personal information
              against unauthorised access, disclosure, alteration, destruction, loss and misuse. These may include
              access controls, authentication controls, encryption in transit and at rest where appropriate, audit
              logging, monitoring, incident response procedures and regular security reviews.
            </p>
            <p className="mt-3">
              No method of transmission over the internet or electronic storage is completely secure. We cannot
              guarantee absolute security.
            </p>
          </Section>

          <Section heading="13. Your Rights Under POPIA">
            <p className="mb-3">
              Under the Protection of Personal Information Act, 2013 (POPIA) and other applicable law, you may have the
              right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate, incomplete or out-of-date personal information.</li>
              <li>
                Request deletion or destruction of personal information, subject to applicable legal obligations and
                retention requirements.
              </li>
              <li>
                Object to the processing of your personal information on grounds relating to your particular situation,
                where we rely on legitimate interests as our lawful basis.
              </li>
              <li>
                Withdraw consent to processing based on consent, at any time, without affecting the lawfulness of
                processing before withdrawal.
              </li>
              <li>Lodge a complaint with the Information Regulator of South Africa.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:roxi@mystorefront.io" className="underline underline-offset-4 hover:text-foreground">
                roxi@mystorefront.io
              </a>
              . We may need to verify your identity before processing your request. We will respond within a reasonable
              time and in accordance with applicable law.
            </p>
          </Section>

          <Section heading="14. Marketing Communications">
            <p>
              Where you have given consent or where otherwise permitted by law, we may send you marketing communications
              about MyStorefront, new features, campaigns, promotions and partner offerings.
            </p>
            <p className="mt-3">
              You may unsubscribe from marketing communications at any time by using the unsubscribe link in any email
              or by contacting us at{" "}
              <a href="mailto:roxi@mystorefront.io" className="underline underline-offset-4 hover:text-foreground">
                roxi@mystorefront.io
              </a>
              . Opting out of marketing communications will not affect transactional, account or service-related
              communications.
            </p>
          </Section>

          <Section heading="15. Children's Privacy">
            <p>
              The Platform is intended for users who are at least eighteen (18) years old. We do not knowingly collect
              personal information from children under the age of 18. If we become aware that we have inadvertently
              collected personal information from a child, we will take steps to delete it.
            </p>
          </Section>

          <Section heading="16. Third-Party Websites">
            <p>
              The Platform may contain links to Brand Websites, social media platforms and other third-party websites.
              This Privacy Policy does not apply to third-party websites. We are not responsible for the privacy
              practices of third parties. You should read the relevant third party's privacy policy before sharing your
              personal information.
            </p>
          </Section>

          <Section heading="17. Changes to This Privacy Policy">
            <p>
              We may update this Privacy Policy from time to time. The latest version will be published on our website
              or made available through the Platform. If changes are material, we will provide notice by email,
              dashboard notification or other reasonable means. Your continued use of the Services after the updated
              Privacy Policy takes effect constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section heading="18. Contact">
            <address className="not-italic">
              <strong className="text-foreground">MYSTOREFRONT (PTY) LTD</strong>
              <br />
              Registration number: 2026/282770/07
              <br />
              Website:{" "}
              <a
                href="https://mystorefront.io/"
                className="underline underline-offset-4 hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                mystorefront.io
              </a>
              <br />
              Email:{" "}
              <a href="mailto:roxi@mystorefront.io" className="underline underline-offset-4 hover:text-foreground">
                roxi@mystorefront.io
              </a>
              <br />
              South Africa
            </address>
          </Section>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>
            Also see our{" "}
            <Link to="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms of Service
            </Link>
            ,{" "}
            <Link to="/cookie-notice" className="underline underline-offset-4 hover:text-foreground">
              Cookie Notice
            </Link>{" "}
            and{" "}
            <Link to="/plugin-privacy-addendum" className="underline underline-offset-4 hover:text-foreground">
              Plugin Privacy Addendum
            </Link>
            .
          </p>
          <p className="mt-2">© {new Date().getFullYear()} MyStorefront. All rights reserved.</p>
        </div>
      </section>
    </main>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold text-foreground text-base mb-3">{heading}</h2>
      <div className="space-y-3 text-muted-foreground">{children}</div>
    </div>
  );
}
