import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";

export default function Terms() {
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
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Effective date: 25 June 2026 &nbsp;·&nbsp; Contact:{" "}
          <a href="mailto:roxi@mystorefront.io" className="underline underline-offset-4 hover:text-foreground">
            roxi@mystorefront.io
          </a>
        </p>

        <div className="mt-10 space-y-1 text-sm text-muted-foreground border border-border rounded p-4 bg-muted/30">
          <p>
            These Terms of Service govern access to and use of the MyStorefront website, platform, software, services,
            creator tools, brand tools, storefronts, affiliate links, tracking functionality, campaign features, social
            media integrations, analytics, messaging tools, payment administration functionality, plugin functionality,
            postback tools, discount-code synchronisation tools and any related services provided by or through
            MyStorefront.
          </p>
          <p className="mt-3">
            The terms "MyStorefront", "we", "us" and "our" refer to{" "}
            <strong className="text-foreground">MYSTOREFRONT (PTY) LTD</strong>, a private company registered in the
            Republic of South Africa with registration number{" "}
            <strong className="text-foreground">2026/282770/07</strong>, trading as MyStorefront.
          </p>
        </div>

        <div className="mt-10 space-y-10 text-sm leading-7 text-foreground/90">
          <Section heading="1. Definitions">
            <p>In these Terms, unless the context indicates otherwise:</p>
            <dl className="mt-4 space-y-3">
              {[
                [
                  "Affiliate Commission",
                  "a commission, referral fee, revenue share or similar amount that may become payable in respect of a qualifying sale or transaction attributed to a Creator through the Platform, subject to validation, brand approval, refund windows, chargeback checks, fraud checks, tracking confirmation and payment by the relevant Brand.",
                ],
                [
                  "Brand or Merchant",
                  "a business, retailer, advertiser, e-commerce store, product supplier or other commercial entity that uses the Platform to connect with Creators, manage campaigns, provide product links, issue discount codes, track sales, process commissions, review Creator activity or access related services.",
                ],
                [
                  "Brand Website",
                  "a website, e-commerce store, Shopify store, WooCommerce store or other third-party site owned, operated or controlled by a Brand or third-party merchant, through which Shoppers may purchase products or services.",
                ],
                [
                  "Campaign",
                  "any promotional, affiliate, gifted, sponsored, flat-fee, paid mention, product-seeding, content collaboration or other marketing arrangement made available through the Platform.",
                ],
                [
                  "Creator",
                  "an influencer, content creator, publisher, social media user, affiliate, ambassador or other person or entity approved or permitted by MyStorefront to use the Platform for storefront creation, content promotion, product recommendations, campaigns, affiliate tracking or related activities.",
                ],
                [
                  "Creator Earnings",
                  "any Affiliate Commission, sponsored campaign fee, flat-fee payment, paid mention fee or other amount that may become payable to a Creator through the Platform, subject to these Terms.",
                ],
                ["Non-Circumvention Period", "the twenty-four (24) month period described in clause 15."],
                [
                  "Platform",
                  "the MyStorefront technology platform and all related websites, tools, dashboards, storefronts, integrations, messaging systems, affiliate tracking systems, campaign systems, analytics systems, payment administration tools, plugin functionality, postback tools, discount-code synchronisation tools and other services made available by MyStorefront.",
                ],
                [
                  "Platform Fee",
                  "MyStorefront's standard fee equal to twenty percent (20%) of approved Creator Earnings, unless otherwise agreed in writing or stated in a campaign brief.",
                ],
                [
                  "Plugin",
                  "any MyStorefront app, plugin, script, webhook, API connection, postback tool, discount-code synchronisation tool or other technical integration installed on, connected to or authorised for use with a Brand Website or e-commerce store.",
                ],
                ["Services", "all services provided by or through the Platform."],
                [
                  "Shopper",
                  "a visitor, consumer or other person who browses a Creator storefront, follows a Creator, clicks a product link, uses a discount code, interacts with product recommendations or proceeds to purchase products or services from a Brand Website.",
                ],
                [
                  "Validation Period",
                  "the applicable return, refund, exchange, chargeback, fraud review or order verification period applied by a Brand before an Affiliate Commission or other Creator Earning is treated as approved. Unless otherwise specified, the Validation Period may be between thirty (30) and sixty (60) days.",
                ],
              ].map(([term, def]) => (
                <div key={term as string}>
                  <dt className="font-semibold text-foreground">{term as string}</dt>
                  <dd className="text-muted-foreground">{def as string}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section heading="2. Nature of the Platform">
            <Paragraphs
              texts={[
                "MyStorefront is a technology platform that facilitates relationships between Brands, Creators and Shoppers.",
                "MyStorefront is not the seller, supplier, manufacturer, distributor, reseller, importer, exporter or merchant of record for any product or service promoted, linked, displayed or purchased through a Brand Website.",
                "All purchases by Shoppers are made directly from the relevant Brand or third-party merchant. The contract of sale is between the Shopper and the relevant Brand or third-party merchant, and not between the Shopper and MyStorefront.",
                "MyStorefront does not control and is not responsible for product availability, product quality, product descriptions, pricing, delivery, fulfilment, returns, refunds, warranties, product defects, product safety, chargebacks, customer service or any consumer complaint relating to products or services purchased from a Brand.",
              ]}
            />
          </Section>

          <Section heading="3. Eligibility">
            <Paragraphs
              texts={[
                "You may only create an account or use the account-based features of the Services if you are at least eighteen (18) years old and have full legal capacity to enter into binding contracts.",
                "If you access or use the Services on behalf of a company, organisation, Brand, agency, partnership or other entity, you represent and warrant that you have authority to bind that entity to these Terms.",
                "MyStorefront may approve, reject, suspend or terminate any Creator, Brand or account application at its sole discretion, subject to applicable law.",
              ]}
            />
          </Section>

          <Section heading="4. Account Registration and Security">
            <Paragraphs
              texts={[
                "You must provide accurate, complete and current information when registering, applying, onboarding or updating your account.",
                "You are responsible for maintaining the confidentiality of your login details, passwords, connected accounts, API keys and any other access credentials.",
                "You are responsible for all activity that occurs under your account, whether authorised by you or not, unless caused solely by MyStorefront's proven gross negligence or wilful misconduct.",
                "You must notify MyStorefront immediately if you suspect unauthorised access to your account, misuse of your credentials or any security incident affecting your use of the Platform.",
              ]}
            />
          </Section>

          <Section heading="5. Changes to the Services">
            <p>
              MyStorefront may modify, update, suspend, discontinue, replace or restrict any part of the Services at any
              time. MyStorefront does not guarantee that any feature will always remain available, uninterrupted,
              error-free or compatible with any third-party platform.
            </p>
          </Section>

          <Section heading="6. Incorporated Policies">
            <p>
              These Terms incorporate any additional policies, rules, campaign briefs, community guidelines, privacy
              notices, cookie policies, acceptable use rules, Creator guidelines, Brand guidelines, payment rules,
              plugin documentation, integration requirements or other terms made available by MyStorefront from time to
              time.
            </p>
          </Section>

          <Section heading="7. Privacy and Data Protection">
            <p>
              Your use of the Services is subject to MyStorefront's{" "}
              <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">
                Privacy Policy
              </Link>
              . Users must not upload, transmit or disclose personal information through the Platform unless they have a
              lawful basis to do so and have obtained all required consents or authorisations.
            </p>
          </Section>

          <Section heading="8. Electronic Communications and Contracting">
            <p>
              You consent to transact electronically with MyStorefront. You agree that electronic records, electronic
              acceptance, click-wrap acceptance, checkbox acceptance, account creation, continued use of the Services
              and electronic communications may satisfy any legal requirement for writing or signature, to the extent
              permitted by applicable law.
            </p>
          </Section>

          <Section heading="9. Brand Terms">
            <SubSection heading="9.1 Brand Account and Authority">
              <p>
                A Brand representative who creates, administers or uses a Brand account represents and warrants that
                they have authority to act on behalf of the Brand and bind the Brand to these Terms.
              </p>
            </SubSection>
            <SubSection heading="9.2 Brand Information">
              <p>
                Brands must provide accurate, complete and current business information and must promptly update any
                information that becomes inaccurate or incomplete.
              </p>
            </SubSection>
            <SubSection heading="9.3 Product and Consumer Responsibility">
              <p>
                Brands are solely responsible for the products and services they sell, including product descriptions,
                pricing, availability, delivery, fulfilment, returns, refunds, chargebacks, warranties, product safety
                and customer support. Brands must comply with all applicable laws.
              </p>
            </SubSection>
            <SubSection heading="9.4 Brand Campaigns">
              <p>
                Brands may use the Platform to create, manage or participate in Campaigns, subject to MyStorefront's
                approval and any applicable campaign rules. MyStorefront may reject, suspend, remove or modify any
                campaign that it reasonably considers unlawful, misleading or harmful.
              </p>
            </SubSection>
            <SubSection heading="9.5 Plugin, Postback and Store Integrations">
              <p>
                By installing, enabling, authorising or using any MyStorefront Plugin or integration, the Brand
                represents and warrants that it owns or is duly authorised to administer the relevant store, has
                obtained all required internal approvals, and that its use of the Plugin complies with applicable laws
                and privacy obligations.
              </p>
            </SubSection>
            <SubSection heading="9.6 Brand Billing">
              <p>
                Brands will receive a consolidated monthly invoice from MyStorefront unless otherwise agreed in writing.
                Unless otherwise agreed, Brand invoices are payable within thirty (30) days from the invoice date.
              </p>
            </SubSection>
            <SubSection heading="9.7 Payment Obligation">
              <p>
                Brands must pay all valid invoices in full and without set-off, deduction or withholding, except where
                required by law or expressly agreed in writing. If a Brand disputes an invoice, it must notify
                MyStorefront in writing within seven (7) days of the invoice date.
              </p>
            </SubSection>
            <SubSection heading="9.8 Non-Payment by Brands">
              <p>
                If a Brand fails to pay an invoice by the due date, MyStorefront may suspend the Brand's account,
                disable campaigns, pause tracking, restrict access to Creator features and take any other reasonable
                action. Creator payouts relating to a Brand may remain pending until MyStorefront receives cleared funds
                from that Brand.
              </p>
            </SubSection>
            <SubSection heading="9.9 Brand Reversals and Clawbacks">
              <p>
                Brands retain the right to reverse, reject or deduct commissions for orders affected by returns,
                refunds, cancellations, chargebacks, payment failures, suspected fraud or other valid reasons. Brands
                must not misuse reversal rights or manipulate tracking or commission data in bad faith.
              </p>
            </SubSection>
          </Section>

          <Section heading="10. Creator Terms">
            <SubSection heading="10.1 Creator Participation">
              <p>
                Access to Creator features is not automatic. MyStorefront may approve, decline, pause, restrict or
                remove Creator access at its discretion. Approval does not create any entitlement to be selected by
                Brands, receive gifts, participate in campaigns or earn commissions.
              </p>
            </SubSection>
            <SubSection heading="10.2 Creator Information and Storefronts">
              <p>
                Creators are responsible for ensuring that all information provided to MyStorefront is accurate, lawful,
                current and complete. Creators must not publish content that is false, misleading, unlawful, harmful,
                offensive, discriminatory, infringing or deceptive.
              </p>
            </SubSection>
            <SubSection heading="10.3 Product Claims and Promotional Statements">
              <p>
                Creators must ensure that all product recommendations, promotional statements, reviews, endorsements and
                campaign content reflect their honest views and actual experience.
              </p>
            </SubSection>
            <SubSection heading="10.4 Disclosure of Affiliate, Sponsored and Gifted Relationships">
              <p>
                Creators must disclose any commercial or material relationship with a Brand clearly and prominently in
                all relevant content. Creators are responsible for complying with applicable advertising, consumer
                protection, influencer marketing and disclosure rules.
              </p>
            </SubSection>
            <SubSection heading="10.5 Creator Earnings Are Conditional">
              <p>
                Creator Earnings displayed on the Platform may be pending, estimated, provisional or subject to
                adjustment. A tracked sale, campaign submission or dashboard entry does not automatically create a final
                right to payment.
              </p>
            </SubSection>
            <SubSection heading="10.6 Pay-When-Paid Model">
              <p>
                MyStorefront operates on a pay-when-paid basis. MyStorefront is not required to pay any Creator Earning
                unless and until it has received the corresponding cleared payment from the relevant Brand.
              </p>
            </SubSection>
            <SubSection heading="10.7 Platform Fee">
              <p>
                Unless otherwise agreed in writing, MyStorefront will retain a Platform Fee equal to twenty percent
                (20%) of approved Creator Earnings.
              </p>
            </SubSection>
            <SubSection heading="10.8 Payout Conditions and Timing">
              <p>
                Creators will be paid during the next applicable payout cycle after MyStorefront has received cleared
                funds from the relevant Brand, provided all payout requirements are satisfied. Payout may be delayed,
                withheld or declined where validation periods have not ended, the Brand has not paid, or fraud or
                compliance checks are ongoing.
              </p>
            </SubSection>
            <SubSection heading="10.9 Returns, Refunds, Cancellations, Chargebacks and Clawbacks">
              <p>
                Affiliate Commissions are subject to the return, refund, exchange, cancellation and chargeback policies
                of the relevant Brand. Clawbacks may be deducted from future payouts or current balances.
              </p>
            </SubSection>
            <SubSection heading="10.10 Creator Tax Responsibility">
              <p>
                Creators are responsible for their own tax affairs, including income tax, VAT, withholding tax, levies
                and duties arising from Creator Earnings.
              </p>
            </SubSection>
            <SubSection heading="10.11 Independent Status">
              <p>
                Creators use the Platform as independent parties. Nothing in these Terms makes a Creator an employee,
                agent, partner, representative, franchisee or joint venturer of MyStorefront.
              </p>
            </SubSection>
          </Section>

          <Section heading="11. Shopper Terms">
            <Paragraphs
              texts={[
                "Shoppers may browse Creator storefronts, follow Creators, view product recommendations, click links, use discount codes or proceed to Brand Websites.",
                "MyStorefront does not sell products to Shoppers. If a Shopper clicks a product link or discount code, the Shopper may be redirected to a Brand Website. Any purchase is made directly from that Brand and is subject to that Brand's own terms, privacy policy, return policy and customer service processes.",
                "MyStorefront is not responsible for product information, pricing, availability, checkout functionality, payment processing, delivery, returns, refunds, warranties, defects, customer support or disputes between a Shopper and a Brand.",
              ]}
            />
          </Section>

          <Section heading="12. Campaigns, Gifts and Sponsored Content">
            <p>
              Brands may use the Platform to provide Creators with products, gifts, samples, sponsored opportunities,
              paid mentions, campaign briefs, discount codes or affiliate links. Unless expressly stated in writing,
              receipt of a gift or sample does not guarantee that a Creator will post content. MyStorefront may require
              content revision, removal or correction where content is inaccurate, misleading, unlawful or in breach of
              these Terms.
            </p>
          </Section>

          <Section heading="13. Social Media and Third-Party Accounts">
            <p>
              By connecting a third-party account, you represent and warrant that you own or are authorised to use that
              account. You are responsible for complying with the terms of all third-party platforms. MyStorefront is
              not responsible for any third-party platform and does not guarantee that third-party integrations will
              remain available, accurate or compatible.
            </p>
          </Section>

          <Section heading="14. Messaging, Monitoring and Platform Review">
            <p>
              Users must use Platform messaging lawfully and professionally. MyStorefront may use automated filters,
              keyword monitoring, fraud detection and human review to detect prohibited conduct. Communications sent
              through the Platform may be reviewed, flagged, audited or retained for compliance, safety, dispute
              resolution and operational purposes.
            </p>
          </Section>

          <Section heading="15. Non-Circumvention">
            <SubSection heading="15.1 Purpose">
              <p>
                This clause prevents Brands and Creators from using MyStorefront to find each other and then moving the
                resulting commercial relationship outside the Platform to avoid MyStorefront's fees, tracking, billing
                or payout systems.
              </p>
            </SubSection>
            <SubSection heading="15.2 Platform-Sourced Relationships">
              <p>
                A Brand-Creator relationship will be treated as platform-sourced if the parties first identified,
                discovered, matched, messaged, negotiated, collaborated or otherwise engaged with each other through or
                because of the Platform. All commercial activity arising from such a relationship must be conducted
                through the Platform during the Non-Circumvention Period, unless MyStorefront gives prior written
                approval.
              </p>
            </SubSection>
            <SubSection heading="15.3 Restricted Off-Platform Conduct">
              <p>
                During the Non-Circumvention Period, Users must not directly or indirectly avoid the Platform in
                relation to a platform-sourced relationship. Restricted conduct includes moving campaigns off-platform,
                requesting off-platform payment, sharing private contact details for the purpose of arranging
                off-platform transactions, or using Platform data to create an off-platform commercial arrangement.
              </p>
            </SubSection>
            <SubSection heading="15.4 Non-Circumvention Period">
              <p>
                The Non-Circumvention Period is twenty-four (24) months from the first date on which the relevant Brand
                and Creator identified, discovered, matched, messaged, engaged, negotiated or interacted with each other
                through or because of the Platform.
              </p>
            </SubSection>
            <SubSection heading="15.5 Monitoring and Review">
              <p>
                MyStorefront may use automated filters, system alerts, keyword detection, audit logs and human review to
                identify conduct that may indicate circumvention, direct dealing, fraud or breach of these Terms.
              </p>
            </SubSection>
            <SubSection heading="15.6 Remedies for Circumvention">
              <p>
                If a User breaches this clause, MyStorefront may suspend or terminate the User's account, cancel
                campaigns, withhold or reverse unpaid Creator Earnings, recover unpaid Platform Fees, seek urgent court
                relief or claim damages. As a reasonable pre-estimate of loss, the breaching User agrees that
                MyStorefront may claim the greater of R25,000 or twenty-five percent (25%) of the gross value of the
                off-platform transaction, subject to applicable law.
              </p>
            </SubSection>
          </Section>

          <Section heading="16. Prohibited Conduct">
            <p className="mb-3">
              Users must use the Services lawfully, honestly and in a manner that protects the integrity of the
              Platform. Users must not, among other things:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Use the Services for fraud, deception, harassment, abuse or unlawful conduct.</li>
              <li>
                Provide false, incomplete or inaccurate account, Brand, Creator, tax, banking or identity information.
              </li>
              <li>Impersonate another person, Brand, Creator, business or organisation.</li>
              <li>Generate artificial clicks, artificial traffic, fake engagement, fake purchases or bot traffic.</li>
              <li>Misuse discount codes, referral links, affiliate links, tracking links or campaign links.</li>
              <li>
                Upload, post or display unlawful, defamatory, discriminatory, hateful, sexually explicit, violent,
                threatening, infringing, deceptive, harmful or offensive material.
              </li>
              <li>Scrape, crawl, harvest, copy, extract or compile Platform data without written permission.</li>
              <li>
                Reverse engineer, decompile, disassemble, bypass or interfere with the Platform's software, systems,
                security or technical controls.
              </li>
              <li>
                List commissionable discount codes on external coupon, voucher or discount aggregation sites without
                approval.
              </li>
              <li>Attempt to avoid Platform Fees, tracking, billing, payout controls or validation processes.</li>
            </ul>
          </Section>

          <Section heading="17. Content Standards and Removal">
            <p>
              MyStorefront may remove, restrict, hide, edit, disable or refuse to publish any content at any time if
              MyStorefront reasonably considers it inappropriate, unlawful, misleading, harmful, infringing,
              non-compliant or inconsistent with these Terms. Users remain solely responsible for their own content.
            </p>
          </Section>

          <Section heading="18. Intellectual Property">
            <p>
              MyStorefront and its licensors own all rights in the Platform, Services, website, software, source code,
              designs, databases, dashboards, workflows, interfaces, trademarks, logos, brand elements, analytics
              systems, tracking systems, documentation and related technology. Except as expressly permitted, Users may
              not copy, modify, distribute, sell, lease, sublicense, reverse engineer, scrape, reproduce, frame, mirror,
              exploit or create derivative works from the Platform or Services.
            </p>
          </Section>

          <Section heading="19. User Content Licence">
            <p>
              By submitting, uploading, displaying, linking, sending or making content available through the Services,
              you grant MyStorefront a non-exclusive, worldwide, royalty-free, transferable and sublicensable licence to
              use that content for Platform-related purposes, including hosting, storing, displaying, reproducing,
              publishing, formatting, adapting, distributing, analysing, promoting and otherwise using the content for
              purposes connected with operating, securing, improving, marketing and providing the Services.
            </p>
          </Section>

          <Section heading="20–21. Brand and Creator Content">
            <p>
              Brands grant MyStorefront and relevant Creators a limited licence to use Brand-approved logos, product
              images, product descriptions, campaign briefs, discount codes, links, claims, hashtags and other Brand
              materials for the purpose of operating campaigns, displaying products, creating storefronts, tracking
              affiliate activity and promoting Brand products through the Platform. Brands further grant MyStorefront a
              non-exclusive licence to use their name, logo, brand assets, and publicly available social media content
              (including images and videos) without requiring further approval from the Brand, for the purpose of
              promoting the Brand's presence on the Platform, including announcing the Brand as a new partner on
              MyStorefront's own social media channels and marketing materials. Where a Brand's publicly available
              social media content has been produced in collaboration with or by a third-party media company or creative
              agency, the Brand warrants that it holds sufficient rights to authorise MyStorefront's use of that content
              under these Terms, and MyStorefront is entitled to use such content without seeking further permission
              from the Brand or any third party. MyStorefront accepts no liability where a Brand publishes content it
              does not have the right to sub-licence.
            </p>
            <p className="mt-3">
              Creators grant MyStorefront the right to display Creator profiles, storefronts, recommendations, images,
              videos, campaign content and performance data on the Platform, and to use Creator names, handles, profile
              images, public campaign content and performance results for Platform operation, reporting and promotional
              purposes.
            </p>
          </Section>

          <Section heading="22. Confidentiality">
            <p>
              Users must not disclose, publish, misuse or exploit confidential information received through the Platform
              except as necessary to participate in the relevant campaign or use the Services as permitted.
              Confidentiality obligations survive termination of these Terms and closure of an account.
            </p>
          </Section>

          <Section heading="23. Third-Party Websites and Links">
            <p>
              The Platform may contain links to Brand Websites, social media platforms, payment providers, analytics
              tools and other third-party websites or services. MyStorefront does not control and is not responsible for
              third-party websites or services. Your use of third-party websites or services is at your own risk.
            </p>
          </Section>

          <Section heading="24. No Guarantee of Results">
            <p>
              MyStorefront does not guarantee Creator approval, Brand approval, Campaign availability, sales volume,
              traffic, clicks, conversion rates, engagement, follower growth, Creator Earnings, Brand revenue, campaign
              performance, uninterrupted tracking, error-free attribution, payment by Brands, successful Plugin
              installation, uninterrupted postback reporting or error-free discount-code synchronisation.
            </p>
          </Section>

          <Section heading="25. Suspension and Termination">
            <p>
              MyStorefront may suspend, restrict or terminate any account or access to the Services if MyStorefront
              reasonably believes that you have breached these Terms, provided false information, engaged in fraud or
              prohibited conduct, failed to pay amounts due, or if your conduct creates legal, financial, security,
              reputational or operational risk. Termination does not affect rights and obligations that accrued before
              termination.
            </p>
          </Section>

          <Section heading="26. Effect of Termination">
            <p>
              On termination or account closure, your right to access and use the Services ends immediately.
              MyStorefront may disable your account, storefront, links, campaigns, Plugins and integrations. Pending
              Creator Earnings remain subject to validation, Brand payment, clawbacks and these Terms. Unpaid Brand
              invoices remain payable.
            </p>
          </Section>

          <Section heading="27. Disclaimer of Warranties">
            <p>
              The Services are provided on an "as is" and "as available" basis. To the maximum extent permitted by law,
              MyStorefront does not give any express, implied or statutory warranty that the Services will be
              uninterrupted, error-free, secure, accurate, complete, compatible with every system, available at all
              times, free from defects or suitable for any particular purpose.
            </p>
          </Section>

          <Section heading="28. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, MyStorefront will not be liable for indirect, consequential,
              special, incidental or punitive loss arising from third-party platforms, Brand Websites, payment
              providers, social media platforms, e-commerce systems, integrations, Plugin failures, postback errors,
              discount-code sync errors, outages, tracking errors or user conduct.
            </p>
            <p className="mt-3">
              MyStorefront's total aggregate liability will be limited to the total Platform Fees actually received by
              MyStorefront from the relevant User during the twelve (12) months before the event giving rise to the
              claim. For Shoppers who have not paid fees directly to MyStorefront, total aggregate liability is limited
              to R1,000, to the maximum extent permitted by law.
            </p>
          </Section>

          <Section heading="29. Indemnity">
            <p>
              To the maximum extent permitted by law, you indemnify MyStorefront, its directors, officers, employees,
              contractors, agents and partners against all claims, demands, losses, liabilities, damages, costs and
              expenses, including reasonable legal costs, arising from your access to or use of the Services, breach of
              these Terms, content, products, Brand Website, campaign activity, product claims, failure to make required
              disclosures, infringement of third-party rights, fraud, negligence or wilful misconduct, except to the
              extent caused by MyStorefront's proven unlawful conduct.
            </p>
          </Section>

          <Section heading="30. Consumer Protection">
            <p>
              Nothing in these Terms is intended to unlawfully limit, exclude or restrict any rights that a consumer may
              have under applicable consumer protection law. Where a Shopper purchases products or services from a
              Brand, the relevant Brand is responsible for complying with applicable consumer protection obligations.
            </p>
          </Section>

          <Section heading="31. Complaints and Takedown Requests">
            <p>
              If you believe that content on the Platform is unlawful, infringing, misleading, abusive or otherwise
              violates these Terms, you may contact MyStorefront at{" "}
              <a href="mailto:roxi@mystorefront.io" className="underline underline-offset-4 hover:text-foreground">
                roxi@mystorefront.io
              </a>
              .
            </p>
          </Section>

          <Section heading="32. Force Majeure">
            <p>
              MyStorefront will not be liable for any delay, failure or interruption caused by events beyond its
              reasonable control, including internet outages, power failures, hosting failures, third-party platform
              outages, API failures, payment system failures, cyberattacks, pandemics, natural disasters, war,
              terrorism, civil unrest, government action or regulatory changes.
            </p>
          </Section>

          <Section heading="33. Changes to These Terms">
            <p>
              MyStorefront may update these Terms from time to time. The latest version will be made available on the
              website or through the Platform. Your continued use of the Services after updated Terms take effect
              constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section heading="34. Governing Law">
            <p>These Terms are governed by the laws of the Republic of South Africa.</p>
          </Section>

          <Section heading="35. Dispute Resolution">
            <p>
              Before starting formal legal proceedings, a User must submit a written complaint or dispute notice to
              MyStorefront at{" "}
              <a href="mailto:roxi@mystorefront.io" className="underline underline-offset-4 hover:text-foreground">
                roxi@mystorefront.io
              </a>
              , setting out the nature of the dispute, relevant facts and the relief sought. The parties must attempt in
              good faith to resolve the dispute within thirty (30) days. If unresolved, either party may refer the
              dispute to a court with competent jurisdiction in South Africa.
            </p>
          </Section>

          <Section heading="36–41. General Provisions">
            <p>
              These Terms also cover: notices (sent electronically by MyStorefront); assignment (you may not assign your
              rights without consent); severability (invalid provisions will be severed); no waiver (waivers must be in
              writing); entire agreement (these Terms and all incorporated policies constitute the entire agreement);
              and survival (payment obligations, clawbacks, non-circumvention, confidentiality, intellectual property,
              content licences, tax, disclaimers, limitation of liability, indemnity, dispute resolution, governing law
              and Plugin responsibilities survive termination).
            </p>
          </Section>

          <Section heading="42. Contact">
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
            <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
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

function SubSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-medium text-foreground text-sm mb-2">{heading}</h3>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

function Paragraphs({ texts }: { texts: string[] }) {
  return (
    <>
      {texts.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
    </>
  );
}
