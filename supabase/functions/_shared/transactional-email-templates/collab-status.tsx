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
const PLATFORM_URL = "https://mystorefront.io/messages";

const ZAR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

interface Props {
  recipientRole?: "brand" | "creator";
  brandName?: string;
  creatorName?: string;
  collabTitle?: string;
  compensationType?: string;
  // Semantic status label for the email — NOT necessarily the raw DB status.
  // e.g. a creator posting live sends "posted_live"; a brand verifying it sends "verified_live".
  status?: string;
  feeAmount?: number;
  productName?: string;
  counterNote?: string;
  deliverableCount?: number;
  deliverableType?: string;
  goLiveDate?: string;
}

const STATUS_META: Record<
  string,
  {
    emoji: string;
    badge: string;
    headlineFor: (who: string, title: string) => string;
    bodyFor: (who: string) => string;
  }
> = {
  // ── Offer negotiation (message cards) ──
  accepted: {
    emoji: "",
    badge: "#059669",
    headlineFor: (who, title) => `${who} accepted "${title}"`,
    bodyFor: (who) =>
      `${who} has accepted the collab offer. You can find the conversation and full brief in your messages.`,
  },
  declined: {
    emoji: "",
    badge: "#dc2626",
    headlineFor: (who, title) => `${who} declined "${title}"`,
    bodyFor: (who) => `${who} has declined the collab offer.`,
  },
  negotiating: {
    emoji: "",
    badge: "#2563eb",
    headlineFor: (who, title) => `${who} proposed changes to "${title}"`,
    bodyFor: (who) => `${who} would like to adjust some of the terms before accepting. See their note below.`,
  },
  pending: {
    emoji: "",
    badge: "#e0552b",
    headlineFor: (who, title) => `${who} updated the offer for "${title}"`,
    bodyFor: (who) => `${who} has sent an updated version of this collab offer for you to review.`,
  },
  // ── Fulfilment lifecycle (creator → brand) ──
  draft_submitted: {
    emoji: "",
    badge: "#2563eb",
    headlineFor: (who, title) => `${who} submitted a draft for "${title}"`,
    bodyFor: (who) => `${who} uploaded content for you to review. Open the collab to approve it or request changes.`,
  },
  posted_live: {
    emoji: "",
    badge: "#059669",
    headlineFor: (who, title) => `${who} went live with "${title}"`,
    bodyFor: (who) => `${who} has published their content. Head to the collab to review and verify the live post.`,
  },
  // ── Fulfilment lifecycle (brand → creator) ──
  packed: {
    emoji: "",
    badge: "#e0552b",
    headlineFor: (who, title) => `${who} is preparing your order for "${title}"`,
    bodyFor: (who) => `${who} has packed your gift. It will be on its way soon.`,
  },
  shipped: {
    emoji: "",
    badge: "#2563eb",
    headlineFor: (who, title) => `${who} shipped your product for "${title}"`,
    bodyFor: (who) => `${who} has shipped your gift. Tracking details are available in the collab.`,
  },
  delivered: {
    emoji: "",
    badge: "#059669",
    headlineFor: (_who, title) => `Your product for "${title}" was delivered`,
    bodyFor: (who) => `Your gift from ${who} has been marked as delivered. Time to create!`,
  },
  approved: {
    emoji: "",
    badge: "#059669",
    headlineFor: (who, title) => `${who} approved your content for "${title}"`,
    bodyFor: (who) => `${who} approved your submission. Nice work. Check the collab for any next steps.`,
  },
  revisions_requested: {
    emoji: "",
    badge: "#d97706",
    headlineFor: (who, title) => `${who} requested changes for "${title}"`,
    bodyFor: (who) =>
      `${who} has asked for some revisions before approving. See their note in the collab and resubmit when ready.`,
  },
  verified_live: {
    emoji: "",
    badge: "#059669",
    headlineFor: (who, title) => `${who} verified your live post for "${title}"`,
    bodyFor: (who) => `${who} confirmed your content is live. Thanks for delivering!`,
  },
  paid: {
    emoji: "",
    badge: "#059669",
    headlineFor: (who, title) => `${who} released your payment for "${title}"`,
    bodyFor: (who) =>
      `${who} has marked your payment as sent for this collab. It should reflect based on your payout details.`,
  },
};

function getStatusMeta(status?: string) {
  return STATUS_META[status || ""] ?? STATUS_META.pending;
}

const CollabStatusEmail = ({
  recipientRole,
  brandName,
  creatorName,
  collabTitle,
  compensationType,
  status,
  feeAmount,
  productName,
  counterNote,
  deliverableCount,
  deliverableType,
  goLiveDate,
}: Props) => {
  const meta = getStatusMeta(status);
  const who = recipientRole === "brand" ? creatorName || "The creator" : brandName || "The brand";
  const title = collabTitle || "your collab";

  return (
    <Html>
      <Head />
      <Preview>{meta.headlineFor(who, title)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ textAlign: "center", margin: "0 0 32px" }}>
            <Img
              src={LOGO_URL}
              alt={SITE_NAME}
              width="160"
              style={{ margin: "0 auto", maxWidth: "80px", height: "auto" }}
            />
          </Section>

          <Text style={label}>COLLAB UPDATE</Text>

          <Heading style={h1}>{meta.headlineFor(who, title)}</Heading>

          <Text style={text}>{meta.bodyFor(who)}</Text>

          {(compensationType || feeAmount != null || productName) && (
            <Section style={summaryBox}>
              {compensationType && <Row label="Type" value={compensationType} />}
              {feeAmount != null && <Row label="Fee" value={ZAR.format(feeAmount)} />}
              {productName && <Row label="Product" value={productName} />}
              {deliverableCount && deliverableType && (
                <Row label="Deliverables" value={`${deliverableCount} ${deliverableType}`} />
              )}
              {goLiveDate && <Row label="Go-live date" value={goLiveDate} />}
            </Section>
          )}

          {status === "negotiating" && counterNote && (
            <Section style={noteBox}>
              <Text style={{ ...text, margin: 0, color: "#1e3a8a", fontStyle: "italic" }}>"{counterNote}"</Text>
            </Section>
          )}

          <Hr style={divider} />

          <Text style={text}>
            {status === "negotiating"
              ? "Open the conversation to review their request and send an updated offer if you're able to."
              : status === "accepted"
                ? "Head to your messages to coordinate next steps."
                : "Open the conversation in your messages for full details."}
          </Text>

          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button href={PLATFORM_URL} style={button}>
              VIEW IN MESSAGES
            </Button>
          </Section>

          <Hr style={divider} />

          <Text style={footer}>You're receiving this because you have an account on {SITE_NAME}.</Text>
        </Container>
      </Body>
    </Html>
  );
};

function Row({ label: rowLabel, value }: { label: string; value: string }) {
  return (
    <Section>
      <Text style={rowLabelStyle}>{rowLabel}</Text>
      <Text style={rowValueStyle}>{value}</Text>
    </Section>
  );
}

export const template = {
  component: CollabStatusEmail,
  subject: (data: Record<string, any>) => {
    const meta = getStatusMeta(data.status);
    const who = data.recipientRole === "brand" ? data.creatorName || "The creator" : data.brandName || "The brand";
    return `${meta.headlineFor(who, data.collabTitle || "your collab")}`;
  },
  displayName: "Collab status update",
  previewData: {
    recipientRole: "brand",
    brandName: "Dex Clothing",
    creatorName: "Roxi Francke",
    collabTitle: "Winter Collection Launch",
    compensationType: "Gifting + Deliverables",
    status: "negotiating",
    productName: "Dex Winter Hoodie",
    counterNote: "Could we do size S instead of M, and add a story in addition to the post?",
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
const noteBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "12px 16px",
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
