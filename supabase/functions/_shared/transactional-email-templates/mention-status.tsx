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
} from "npm:@react-email/components@0.0.22";
import type { TemplateEntry } from "./registry.ts";

const SITE_NAME = "MyStorefront";
const LOGO_URL =
  "https://lhzqnkrjqaebcfxcmlgd.supabase.co/storage/v1/object/public/avatars/email%2FMyStorefront_Full_logo_black.png";

interface Props {
  recipientRole?: string;
  campaignTitle?: string;
  deliverableType?: string;
  feeAmount?: number;
  status?: string;
  brandNote?: string;
}

const statusMessages: Record<string, string> = {
  accepted: "The mention request has been accepted. Content creation is underway.",
  declined: "The mention request has been declined.",
  content_submitted: "Content has been submitted for review.",
  revision_requested: "A revision has been requested. Please review the feedback and resubmit.",
  approved: "The content has been approved! Payment will be processed shortly.",
  paid: "Payment has been processed for this mention.",
  cancelled: "The mention request has been cancelled.",
};

const ZAR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

const MentionStatusEmail = ({ recipientRole, campaignTitle, deliverableType, feeAmount, status, brandNote }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Mention request update: {status?.replace(/_/g, " ") || "status change"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ margin: "0 0 32px" }}>
          <Img src={LOGO_URL} alt={SITE_NAME} style={{ height: "auto", maxWidth: "160px" }} />
        </Section>
        <Text style={label}>MENTION UPDATE</Text>
        <Heading style={h1}>
          {campaignTitle || "Mention Request"} — {status?.replace(/_/g, " ") || "updated"}
        </Heading>
        <Text style={text}>
          {statusMessages[status || ""] ||
            `The mention request status has been updated to: ${status?.replace(/_/g, " ")}.`}
        </Text>
        {deliverableType && (
          <Text style={text}>
            <strong>Deliverable:</strong> {deliverableType.replace(/_/g, " ")}
          </Text>
        )}
        {feeAmount != null && (
          <Text style={text}>
            <strong>Fee:</strong> {ZAR.format(feeAmount)}
          </Text>
        )}
        {brandNote && status === "revision_requested" && (
          <Section style={noteBox}>
            <Text style={{ ...text, color: "#92400e", margin: "0" }}>
              <strong>Revision feedback:</strong> {brandNote}
            </Text>
          </Section>
        )}
        <Section style={{ margin: "0 0 40px" }}>
          <Button href="https://mystorefrontmvp.lovable.app/messages" style={button}>
            VIEW IN MESSAGES
          </Button>
        </Section>
        <Text style={footer}>You're receiving this because you have an account on {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: MentionStatusEmail,
  subject: (data: Record<string, any>) =>
    `Mention "${data.campaignTitle || "Request"}" — ${(data.status || "updated").replace(/_/g, " ")}`,
  displayName: "Mention request status update",
  previewData: {
    recipientRole: "creator",
    campaignTitle: "Summer Drops",
    deliverableType: "instagram_reel",
    feeAmount: 1500,
    status: "approved",
  },
} satisfies TemplateEntry;

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
const noteBox = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "0 0 16px",
};
const footer = { fontSize: "12px", color: "#b0b3ba", margin: "0", lineHeight: "1.6", fontWeight: "300" as const };
