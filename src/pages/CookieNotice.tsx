import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";

export default function CookieNotice() {
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
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Cookie Notice</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective date: 25 June 2026 &nbsp;·&nbsp; Contact:{" "}
          <a href="mailto:roxi@mystorefront.io" className="underline underline-offset-4 hover:text-foreground">
            roxi@mystorefront.io
          </a>
        </p>

        <div className="mt-10 space-y-1 text-sm text-muted-foreground border border-border rounded p-4 bg-muted/30">
          <p>
            This Cookie Notice explains how MyStorefront uses cookies and similar technologies on our website, platform,
            creator storefronts, affiliate links, dashboards, plugin tools and related services.
          </p>
          <p className="mt-3">
            The terms "MyStorefront", "we", "us" and "our" refer to{" "}
            <strong className="text-foreground">MYSTOREFRONT (PTY) LTD</strong>, registration number{" "}
            <strong className="text-foreground">2026/282770/07</strong>, trading as MyStorefront.
          </p>
          <p className="mt-3">
            This Cookie Notice should be read together with our{" "}
            <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms of Service
            </Link>
            .
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-7 text-foreground/90">
          <Section heading="1. What Cookies Are">
            <p>
              Cookies are small text files placed on your browser or device when you visit a website or use an online
              service.
            </p>
            <p>
              We may also use similar technologies, including pixels, tags, scripts, web beacons, local storage,
              tracking links, click IDs and other identifiers. In this Cookie Notice, we refer to these collectively as
              "cookies".
            </p>
          </Section>

          <Section heading="2. Why We Use Cookies">
            <p>MyStorefront uses cookies to:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-3">
              <li>Operate the website and Platform.</li>
              <li>Keep users logged in and remember user preferences.</li>
              <li>Secure accounts and sessions.</li>
              <li>Understand how visitors use our website and creator storefronts.</li>
              <li>Measure Platform performance.</li>
              <li>Support affiliate tracking and attribution.</li>
              <li>Capture and process affiliate click IDs.</li>
              <li>Attribute sales to Creators.</li>
              <li>Detect fraud, duplicate events and misuse.</li>
              <li>Support discount-code tracking.</li>
              <li>Improve our services, dashboards and user experience.</li>
              <li>Support marketing and campaign measurement where permitted by law.</li>
            </ul>
          </Section>

          <Section heading="3. Types of Cookies We Use">
            <SubSection heading="3.1 Strictly Necessary Cookies">
              <p>
                These cookies are required for the website and Platform to work properly. They may be used for login
                sessions, account security, fraud prevention, system stability, load balancing, checkout redirection,
                affiliate link routing and basic Platform functionality.
              </p>
              <p className="mt-2">
                You cannot disable these cookies through our cookie tools where they are necessary for the service to
                operate, but you may block them through your browser settings. Blocking them may cause parts of the
                Platform to stop working.
              </p>
            </SubSection>
            <SubSection heading="3.2 Preference Cookies">
              <p>
                These cookies help us remember choices you make, such as account settings, dashboard preferences, saved
                filters, display preferences or other customisations.
              </p>
            </SubSection>
            <SubSection heading="3.3 Analytics Cookies">
              <p>
                These cookies help us understand how users interact with our website, Platform and storefronts. They may
                collect information such as pages viewed, links clicked, referral sources, session duration, browser
                type, device type and error events. We use this information to improve MyStorefront and understand
                Platform performance.
              </p>
            </SubSection>
            <SubSection heading="3.4 Affiliate Attribution Cookies and Tracking Technologies">
              <p>
                These cookies and related technologies help us track affiliate clicks, capture click IDs, attribute
                conversions, detect duplicate events and support Creator commission calculations.
              </p>
              <p className="mt-2">
                For example, when a Shopper clicks a Creator's product link, a click ID or similar identifier may be
                created or stored. If the Shopper later purchases from a Brand Website, the Brand's store or
                MyStorefront Plugin may report limited conversion data back to MyStorefront for affiliate attribution
                and commission processing.
              </p>
              <p className="mt-2">
                If affiliate attribution cookies are blocked or deleted, some clicks, conversions, commissions, discount
                codes or tracking events may not be attributed correctly.
              </p>
            </SubSection>
            <SubSection heading="3.5 Marketing Cookies">
              <p>
                Where permitted by law, we may use cookies to measure marketing campaigns, understand referral sources
                and improve promotional activity. We do not sell personal information to third parties for their
                independent marketing purposes.
              </p>
            </SubSection>
          </Section>

          <Section heading="4. Third-Party Cookies">
            <p>
              Some cookies may be set by third-party service providers, such as hosting providers, analytics providers,
              security tools, communication tools, social media platforms, e-commerce platforms or integration
              providers. Third-party cookies are subject to the relevant third party's own privacy and cookie policies.
            </p>
          </Section>

          <Section heading="5. Brand Websites and Third-Party Stores">
            <p>
              When you click a product link or discount code on MyStorefront, you may be redirected to a Brand Website
              or third-party store. Those websites may use their own cookies, tracking technologies, checkout tools and
              analytics systems. MyStorefront does not control cookies used by Brand Websites or third-party stores.
            </p>
            <p className="mt-3">
              You should read the relevant Brand's privacy policy and cookie notice before purchasing.
            </p>
          </Section>

          <Section heading="6. Managing Cookies">
            <p>
              You can manage cookies through your browser settings. Most browsers allow you to block, delete or restrict
              cookies. You may also be able to manage certain cookie preferences through consent banners, preference
              centres or settings made available on the Platform.
            </p>
            <p className="mt-3">
              If you block or delete cookies, some features may not work correctly. This may affect login sessions,
              Creator storefronts, affiliate attribution, discount-code tracking, analytics, fraud prevention and
              Platform performance.
            </p>
          </Section>

          <Section heading="7. Changes to This Cookie Notice">
            <p>
              We may update this Cookie Notice from time to time. The latest version will be published on our website or
              made available through the Platform.
            </p>
          </Section>

          <Section heading="8. Contact">
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

function SubSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-medium text-foreground text-sm mb-2">{heading}</h3>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
