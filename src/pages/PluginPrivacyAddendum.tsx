import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";

export default function PluginPrivacyAddendum() {
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
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Plugin Privacy Addendum</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective date: 25 June 2026 &nbsp;·&nbsp; Contact:{" "}
          <a href="mailto:roxi@mystorefront.io" className="underline underline-offset-4 hover:text-foreground">
            roxi@mystorefront.io
          </a>
        </p>

        <div className="mt-10 space-y-1 text-sm text-muted-foreground border border-border rounded p-4 bg-muted/30">
          <p>
            This Plugin Privacy Addendum applies to Brands that install, enable, connect or authorise any MyStorefront
            plugin, app, script, webhook, API connection, postback tool, discount-code synchronisation tool or other
            technical integration on a Brand Website or e-commerce store.
          </p>
          <p className="mt-3">
            This Addendum should be read together with the MyStorefront{" "}
            <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>
            ,{" "}
            <Link to="/cookie-notice" className="underline underline-offset-4 hover:text-foreground">
              Cookie Notice
            </Link>
            ,{" "}
            <Link to="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms of Service
            </Link>
            , plugin documentation and any Brand agreement or campaign terms that apply.
          </p>
          <p className="mt-3">
            The terms "MyStorefront", "we", "us" and "our" refer to{" "}
            <strong className="text-foreground">MYSTOREFRONT (PTY) LTD</strong>, registration number{" "}
            <strong className="text-foreground">2026/282770/07</strong>, trading as MyStorefront.
          </p>
          <p className="mt-3">
            The terms "Brand", "you" and "your" refer to the business, merchant, retailer, e-commerce store owner, store
            administrator or authorised representative that installs, enables or uses the Plugin.
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-7 text-foreground/90">
          <Section heading="1. Purpose of the Plugin">
            <p>The MyStorefront Plugin connects a Brand's e-commerce store to the MyStorefront Platform.</p>
            <p>
              The Plugin may support real-time affiliate attribution, click ID capture, order attribution, conversion
              reporting, signed postbacks, automatic retries, deduplication, refund clawbacks, chargeback reporting,
              partner discount-code synchronisation, campaign reporting, Creator commission calculation, Brand
              invoicing, fraud prevention and reconciliation.
            </p>
          </Section>

          <Section heading="2. Brand Responsibility">
            <p>
              The Brand remains responsible for its own e-commerce store, Brand Website, customer relationship, checkout
              process, privacy policy, cookie notice, customer terms, consent mechanisms, product sales, fulfilment,
              returns, refunds, chargebacks and compliance with applicable law.
            </p>
            <p>
              By installing or using the Plugin, the Brand confirms that it has the lawful authority to connect its
              store to MyStorefront and to share relevant store, order, refund, discount-code and attribution data with
              MyStorefront.
            </p>
            <p>
              The Brand must ensure that its own customer-facing notices clearly explain any tracking, affiliate
              attribution, order data sharing, discount-code processing, postback reporting and related processing where
              required by law.
            </p>
          </Section>

          <Section heading="3. Information Processed Through the Plugin">
            <p className="mb-3">
              Depending on the Brand's configuration and e-commerce platform, the Plugin may process:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Affiliate click IDs, landing URLs, referral URLs and click timestamps.</li>
              <li>Order IDs, order dates and times, order values and currency.</li>
              <li>Payment status, order status, refund status, cancellation status and chargeback information.</li>
              <li>Product or SKU information, discount codes used and partner promo codes.</li>
              <li>Conversion events, deduplication event IDs and webhook delivery data.</li>
              <li>
                Postback retry logs, HMAC signature validation data and API permission and integration status
                information.
              </li>
              <li>Technical error logs and store configuration information.</li>
            </ul>
            <p className="mt-3">
              The Plugin is intended to process the minimum information reasonably required to perform attribution,
              reporting, clawback, fraud prevention, billing, payout and discount-code synchronisation functions.
            </p>
          </Section>

          <Section heading="4. Why MyStorefront Processes Plugin Data">
            <p className="mb-3">MyStorefront may use Plugin data to:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Attribute paid orders to affiliate clicks and validate Creator commissions.</li>
              <li>Calculate Creator Earnings and apply the applicable refund or validation window.</li>
              <li>Process refund clawbacks and identify chargebacks and cancellations.</li>
              <li>Deduplicate conversion events and retry failed postbacks.</li>
              <li>Verify signed postbacks and detect fraud, misuse or tracking manipulation.</li>
              <li>Generate Brand reports and prepare Brand invoices.</li>
              <li>Administer Creator payouts and sync partner discount codes into the Brand's store.</li>
              <li>Troubleshoot plugin and integration issues.</li>
              <li>Audit attribution, payout and billing records.</li>
              <li>Comply with legal, accounting, tax and dispute-resolution obligations.</li>
            </ul>
          </Section>

          <Section heading="5. Responsible Party and Operator Roles">
            <p>Depending on the context, MyStorefront may act as a responsible party or as an operator.</p>
            <p>
              Where MyStorefront decides how and why Plugin data is used for Platform operations, commission
              administration, fraud prevention, billing, payout administration, reporting, analytics, dispute resolution
              and legal compliance, MyStorefront may act as a responsible party.
            </p>
            <p>
              Where MyStorefront processes certain store, order, refund or customer data only on behalf of the Brand and
              according to the Brand's instructions, MyStorefront may act as an operator.
            </p>
            <p>
              The Brand remains responsible for determining and documenting its own lawful basis for collecting and
              sharing customer and order data with MyStorefront.
            </p>
          </Section>

          <Section heading="6. Brand Privacy and Cookie Notices">
            <p>
              The Brand must maintain an appropriate privacy policy, cookie notice and customer-facing disclosures.
              These notices should explain, where applicable, that:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-3">
              <li>Affiliate tracking may be used and click IDs or referral identifiers may be captured.</li>
              <li>Order and refund data may be shared with MyStorefront.</li>
              <li>
                Discount-code data may be processed and purchase data may be used for attribution and commission
                processing.
              </li>
              <li>Refunds, cancellations and chargebacks may trigger commission clawbacks.</li>
              <li>Cookies, tracking links, webhooks, pixels, tags or similar technologies may be used.</li>
              <li>
                Data may be shared with technology providers that support affiliate attribution, reporting, billing and
                payout administration.
              </li>
            </ul>
            <p className="mt-3">
              The Brand is responsible for obtaining any consent required from customers or website visitors.
            </p>
          </Section>

          <Section heading="7. Security Measures">
            <p>
              MyStorefront may use technical and organisational security measures to protect Plugin data, including
              access controls, authentication controls, encrypted transmission where appropriate, HMAC signing,
              timestamp checks, retry controls, deduplication controls, audit logs, event IDs, monitoring and alerting,
              limited access permissions and incident investigation procedures.
            </p>
            <p className="mt-3">
              The Brand is responsible for securing its own store, admin accounts, API credentials, webhooks, checkout
              systems, staff access and connected third-party tools.
            </p>
          </Section>

          <Section heading="8. Brand Configuration Obligations">
            <p>
              The Brand must not disable, tamper with, bypass, manipulate or interfere with click ID capture,
              attribution logic, conversion reporting, HMAC signing, webhook delivery, retry mechanisms, deduplication
              controls, refund reporting, chargeback reporting, discount-code synchronisation, plugin security controls
              or any technical measure used by MyStorefront to validate affiliate activity.
            </p>
            <p className="mt-3">
              The Brand must notify MyStorefront promptly if any of the following occur: the Plugin is uninstalled,
              disabled or disconnected; API permissions or webhooks are changed; store access or integration credentials
              are compromised; the checkout flow or refund process changes; the Brand changes e-commerce platforms;
              duplicate conversions are detected; conversion events fail; refund clawbacks fail; discount-code sync
              errors occur; or unauthorised access or a security incident occurs.
            </p>
          </Section>

          <Section heading="9. Sharing of Plugin Data">
            <p className="mb-3">Plugin data may be shared with:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>
                The relevant Brand and Creators where required to display commission, campaign or performance
                information.
              </li>
              <li>Payment, banking or payout providers.</li>
              <li>
                Hosting and infrastructure providers, analytics and reporting providers, fraud prevention and security
                providers.
              </li>
              <li>E-commerce platform providers.</li>
              <li>Professional advisers, regulators, courts or law enforcement where required or permitted by law.</li>
              <li>Other service providers required to operate the Platform.</li>
            </ul>
            <p className="mt-3">
              We do not sell Plugin data to third parties for their independent marketing purposes.
            </p>
          </Section>

          <Section heading="10. Cross-Border Processing">
            <p>
              MyStorefront and its service providers may process Plugin data in South Africa or other countries where
              our infrastructure, hosting providers, service providers, analytics tools or support systems operate.
              Where required, MyStorefront will take reasonable steps to ensure that appropriate safeguards are in place
              for cross-border processing.
            </p>
            <p className="mt-3">
              The Brand remains responsible for disclosing any cross-border processing in its own privacy notices where
              required by law.
            </p>
          </Section>

          <Section heading="11. Retention">
            <p>
              MyStorefront may retain Plugin data for as long as reasonably necessary for attribution, commission
              validation, refund clawbacks, chargeback processing, Creator payout administration, Brand invoicing, fraud
              prevention, troubleshooting, audit records, legal compliance, tax and accounting records, dispute
              resolution and enforcement of the Terms of Service.
            </p>
            <p className="mt-3">
              When Plugin data is no longer required, MyStorefront will take reasonable steps to delete, de-identify or
              anonymise it where appropriate.
            </p>
          </Section>

          <Section heading="12. Data Subject Requests">
            <p>
              If a customer, Shopper or other data subject contacts MyStorefront about Plugin data, MyStorefront may
              respond directly where appropriate or may refer the request to the relevant Brand.
            </p>
            <p className="mt-3">
              If a Brand receives a request relating to Plugin data, the Brand must notify MyStorefront where
              MyStorefront's assistance is required. The parties will reasonably cooperate to respond to lawful access,
              correction, deletion, objection or complaint requests.
            </p>
          </Section>

          <Section heading="13. Security Incidents">
            <p>
              The Brand must notify MyStorefront promptly if it becomes aware of any actual or suspected security
              incident affecting the Plugin, store data, API credentials, webhook endpoints, order data, customer data,
              discount-code data or attribution data.
            </p>
            <p className="mt-3">
              MyStorefront will take reasonable steps to investigate, contain and address security incidents involving
              systems under its control. Where required by law, the relevant party will notify affected persons and/or
              the Information Regulator.
            </p>
          </Section>

          <Section heading="14. Suspension or Disabling of Plugin Access">
            <p>
              MyStorefront may suspend, disable or restrict Plugin access, postback endpoints, API connections,
              discount-code sync or related functionality where MyStorefront reasonably believes that continued access
              creates a security, privacy, fraud, attribution, billing, legal, operational or platform integrity risk.
            </p>
          </Section>

          <Section heading="15. No Guarantee of Perfect Attribution">
            <p>
              The Plugin supports affiliate attribution and reporting, but no tracking technology is perfect.
              Attribution may be affected by browser settings, cookie restrictions, ad blockers, device switching,
              checkout changes, platform API changes, payment failures, integration errors, network outages, incorrect
              configuration, duplicate events, refund timing, user behaviour or third-party system limitations.
              MyStorefront may rely on available data to reconcile commissions, invoices, clawbacks and Creator
              Earnings.
            </p>
          </Section>

          <Section heading="16. Contact">
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
            <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/cookie-notice" className="underline underline-offset-4 hover:text-foreground">
              Cookie Notice
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
