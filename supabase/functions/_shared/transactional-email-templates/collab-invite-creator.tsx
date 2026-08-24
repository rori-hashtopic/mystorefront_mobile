/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from "npm:@react-email/components@0.0.22";
import type { TemplateEntry } from "./registry.ts";

const SITE_NAME = "MyStorefront";
const LOGO_URL =
  "https://lhzqnkrjqaebcfxcmlgd.supabase.co/storage/v1/object/public/avatars/email%2FMyStorefront_Full_logo_black.png";
const PLATFORM_URL = "https://mystorefrontmvp.lovable.app/messages";

const ZAR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

// Maps compensation_type → human-friendly label and accent colour
const TYPE_META: Record<string, { label: string; badge: string; emoji: string }> = {
  Gifting: { label: "Gift", badge: "#e0552b", emoji: "" },
  "Gifting + Deliverables": { label: "Gifting + Deliverables", badge: "#e0552b", emoji: "" },
  "Paid Campaign + Gifting": { label: "Paid Campaign + Gift", badge: "#e0552b", emoji: "" },
  "Paid Campaign": { label: "Paid Campaign", badge: "#7c3aed", emoji: "" },
  "Mention Request": { label: "Mention Request", badge: "#0891b2", emoji: "" },
  "Discount Code": { label: "Discount Code", badge: "#059669", emoji: "" },
};

function getMeta(type?: string) {
  return TYPE_META[type || ""] ?? { label: type || "Collab Offer", badge: "#1a1d24", emoji: "" };
}

interface Props {
  brandName?: string;
  collabTitle?: string;
  compensationType?: string;
  description?: string;
  // Gifting
  productName?: string;
  productValue?: number;
  productImageUrl?: string;
  // Fee / Paid
  feeAmount?: number;
  paymentTerms?: string;
  // Deliverables
  platforms?: string[];
  deliverables?: string;
  goLiveDate?: string;
  submissionDeadline?: string;
  requiredHashtags?: string;
  requiredMentions?: string;
  dosAndDonts?: string;
  usageRights?: string;
  exclusivityRequired?: boolean;
  // Mention
  deliverableType?: string;
  // Discount Code
  discountCode?: string;
  discountType?: string;
  discountValue?: number;
  expiryDate?: string;
  discountNotes?: string;
}

const CollabInviteCreatorEmail = ({
  brandName,
  collabTitle,
  compensationType,
  description,
  productName,
  productValue,
  productImageUrl,
  feeAmount,
  paymentTerms,
  platforms,
  deliverables,
  goLiveDate,
  submissionDeadline,
  requiredHashtags,
  requiredMentions,
  dosAndDonts,
  usageRights,
  exclusivityRequired,
  deliverableType,
  discountCode,
  discountType,
  discountValue,
  expiryDate,
  discountNotes,
}: Props) => {
  const meta = getMeta(compensationType);
  const isDiscount = compensationType === "Discount Code";
  const includesGifting =
    compensationType === "Gifting" ||
    compensationType === "Gifting + Deliverables" ||
    compensationType === "Paid Campaign + Gifting";
  const includesFee = compensationType === "Paid Campaign + Gifting" || compensationType === "Paid Campaign";
  const isMention = compensationType === "Mention Request";

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {brandName || "A brand"} has sent you a {meta.label} on {SITE_NAME}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={{ margin: "0 0 32px" }}>
            <Img src={LOGO_URL} alt={SITE_NAME} style={{ height: "auto", maxWidth: "160px" }} />
          </Section>

          {/* Type badge */}
          <Text style={{ ...label, color: meta.badge }}>{meta.label.toUpperCase()}</Text>

          {/* Headline */}
          <Heading style={h1}>
            {brandName || "A brand"} sent you a {meta.label}!
          </Heading>

          {/* Campaign title */}
          {collabTitle && (
            <Text style={{ ...text, fontWeight: "500" as const, color: "#1a1d24" }}>"{collabTitle}"</Text>
          )}

          {/* Description */}
          {description && <Text style={text}>{description}</Text>}

          {/* Product image */}
          {productImageUrl && (
            <Section style={{ margin: "0 0 24px" }}>
              <Img
                src={productImageUrl}
                alt={productName || "Product"}
                style={{ width: "100%", maxWidth: "400px", height: "auto", borderRadius: "6px" }}
              />
            </Section>
          )}

          <Hr style={divider} />

          {/* ── Discount Code details ── */}
          {isDiscount && discountCode && (
            <Section style={summaryBox}>
              <Row label="Your code" value={discountCode} mono />
              {discountType && discountValue != null && (
                <Row
                  label="Discount"
                  value={discountType === "percentage" ? `${discountValue}% off` : `${ZAR.format(discountValue)} off`}
                />
              )}
              {expiryDate && <Row label="Expires" value={new Date(expiryDate).toLocaleDateString("en-ZA")} />}
              {discountNotes && <Row label="Notes" value={discountNotes} />}
            </Section>
          )}

          {/* ── Gifting details ── */}
          {includesGifting && productName && (
            <Section style={summaryBox}>
              <Row label="Product" value={productName} />
              {productValue != null && <Row label="Estimated value" value={ZAR.format(productValue)} />}
            </Section>
          )}

          {/* ── Fee / Paid details ── */}
          {includesFee && feeAmount != null && (
            <Section style={summaryBox}>
              <Row label="Fee" value={ZAR.format(feeAmount)} />
              {paymentTerms && <Row label="Payment terms" value={paymentTerms.replace(/_/g, " ")} />}
            </Section>
          )}

          {/* ── Mention details ── */}
          {isMention && (
            <Section style={summaryBox}>
              {deliverableType && <Row label="Deliverable" value={deliverableType.replace(/_/g, " ")} />}
              {feeAmount != null && <Row label="Fee" value={ZAR.format(feeAmount)} />}
              {goLiveDate && <Row label="Deadline" value={new Date(goLiveDate).toLocaleDateString("en-ZA")} />}
            </Section>
          )}

          {/* ── Content deliverable details (non-mention) ── */}
          {!isMention && !isDiscount && (platforms?.length || deliverables || goLiveDate || submissionDeadline) && (
            <Section style={summaryBox}>
              {platforms && platforms.length > 0 && <Row label="Platforms" value={platforms.join(", ")} />}
              {deliverables && <Row label="Deliverables" value={deliverables} />}
              {submissionDeadline && (
                <Row label="Submission deadline" value={new Date(submissionDeadline).toLocaleDateString("en-ZA")} />
              )}
              {goLiveDate && <Row label="Go-live date" value={new Date(goLiveDate).toLocaleDateString("en-ZA")} />}
              {usageRights && <Row label="Usage rights" value={usageRights} />}
              {exclusivityRequired && <Row label="Exclusivity" value="Required" />}
            </Section>
          )}

          {/* ── Brand guidelines ── */}
          {(requiredHashtags || requiredMentions || dosAndDonts) && (
            <>
              <Text style={{ ...text, fontWeight: "500" as const, color: "#1a1d24", margin: "16px 0 8px" }}>
                Brand guidelines
              </Text>
              <Section style={{ ...summaryBox, backgroundColor: "#f8f9fa" }}>
                {requiredHashtags && <Row label="Hashtags" value={requiredHashtags} />}
                {requiredMentions && <Row label="Mentions" value={requiredMentions} />}
                {dosAndDonts && <Row label="Do's & don'ts" value={dosAndDonts} />}
              </Section>
            </>
          )}

          <Hr style={divider} />

          <Text style={text}>
            Log in to your {SITE_NAME} dashboard to review the full brief and{" "}
            {isDiscount ? "start sharing your code." : "accept or decline this offer."}
          </Text>

          <Section style={{ margin: "0 0 40px" }}>
            <Button href={PLATFORM_URL} style={button}>
              {isDiscount ? "VIEW YOUR DISCOUNT CODE" : "REVIEW COLLAB OFFER"}
            </Button>
          </Section>

          <Text style={footer}>You're receiving this because you have a creator account on {SITE_NAME}.</Text>
        </Container>
      </Body>
    </Html>
  );
};

// Small helper renders a summary table row
function Row({ label: rowLabel, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <Section style={{ margin: "0 0 8px" }}>
      <Text style={rowLabelStyle}>{rowLabel}</Text>
      <Text style={mono ? { ...rowValueStyle, fontFamily: "monospace", letterSpacing: "0.05em" } : rowValueStyle}>
        {value}
      </Text>
    </Section>
  );
}

export const template = {
  component: CollabInviteCreatorEmail,
  subject: (data: Record<string, any>) => {
    const meta = getMeta(data.compensationType);
    return `${data.brandName || "A brand"} sent you a ${meta.label}${data.collabTitle ? `: ${data.collabTitle}` : ""}`;
  },
  displayName: "Collab invite to creator",
  previewData: {
    brandName: "Dex Clothing",
    collabTitle: "Winter Collection Launch",
    compensationType: "Paid Campaign + Gifting",
    description: "We'd love for you to style our new winter range and share an honest review with your audience.",
    productName: "Dex Winter Bundle",
    productValue: 850,
    feeAmount: 2000,
    paymentTerms: "on_approval",
    platforms: ["Instagram", "TikTok"],
    deliverables: "1× Reel + 3× Stories",
    goLiveDate: "2026-07-15",
    submissionDeadline: "2026-07-10",
    requiredHashtags: "#DexWinter #WearDex",
    requiredMentions: "@dex.co.za",
    usageRights: "Brand may repost with credit",
    exclusivityRequired: false,
  },
} satisfies TemplateEntry;

// ── Styles ──────────────────────────────────────────────────────────────────
const main = { backgroundColor: "#ffffff", fontFamily: "'Inter', Arial, sans-serif" };
const container = { padding: "40px 25px", maxWidth: "560px", margin: "0 auto" };
const label = {
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: "11px",
  fontWeight: "500" as const,
  color: "#e0552b",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  margin: "0 0 12px",
};
const h1 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: "28px",
  fontWeight: "600" as const,
  color: "#1a1d24",
  margin: "0 0 20px",
  letterSpacing: "-0.03em",
  lineHeight: "1.2",
};
const text = { fontSize: "15px", color: "#656b78", lineHeight: "1.7", margin: "0 0 16px", fontWeight: "300" as const };
const button = {
  backgroundColor: "#1a1d24",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "400" as const,
  fontFamily: "'Inter', Arial, sans-serif",
  borderRadius: "0",
  padding: "16px 32px",
  textDecoration: "none",
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
};
const footer = { fontSize: "12px", color: "#b0b3ba", margin: "0", lineHeight: "1.6", fontWeight: "300" as const };
const divider = { borderColor: "#f0f0f0", margin: "24px 0" };
const summaryBox = {
  backgroundColor: "#fafafa",
  border: "1px solid #f0f0f0",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "0 0 16px",
};
const rowLabelStyle = {
  fontSize: "11px",
  color: "#9ca3af",
  fontWeight: "500" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 2px",
};
const rowValueStyle = { fontSize: "14px", color: "#1a1d24", fontWeight: "400" as const, margin: "0 0 12px" };
