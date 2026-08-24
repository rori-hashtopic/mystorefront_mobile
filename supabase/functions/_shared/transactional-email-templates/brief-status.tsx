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
  recipientRole?: "brand" | "creator" | string;
  briefTitle?: string;
  status?: string;
  progressNote?: string;
  brandName?: string;
  creatorName?: string;
  budget?: string;
  deadline?: string;
}

const statusMessages: Record<string, string> = {
  accepted: "The brief has been accepted. Work is underway.",
  declined: "The brief has been declined.",
  in_progress: "Work on the brief has started.",
  content_ready: "Content is ready for review.",
  revision_needed: "A revision has been requested. Please review the feedback and resubmit.",
  completed: "The brief has been marked as completed.",
};

const BriefStatusEmail = ({
  recipientRole,
  briefTitle,
  status,
  progressNote,
  brandName,
  creatorName,
  budget,
  deadline,
}: Props) => {
  const actor = recipientRole === "creator" ? brandName || "The brand" : creatorName || "The creator";
  const prettyStatus = (status || "updated").replace(/_/g, " ");
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Brief update: {prettyStatus}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ margin: "0 0 32px" }}>
            <Img src={LOGO_URL} alt={SITE_NAME} style={{ height: "auto", maxWidth: "160px" }} />
          </Section>
          <Text style={label}>BRIEF UPDATE</Text>
          <Heading style={h1}>
            {briefTitle || "Brief"} — {prettyStatus}
          </Heading>
          <Text style={text}>
            {actor}{" "}
            {statusMessages[status || ""]
              ? statusMessages[status || ""].charAt(0).toLowerCase() + statusMessages[status || ""].slice(1)
              : `updated the brief status to ${prettyStatus}.`}
          </Text>
          {budget && (
            <Text style={text}>
              <strong>Budget:</strong> {budget}
            </Text>
          )}
          {deadline && (
            <Text style={text}>
              <strong>Deadline:</strong> {deadline}
            </Text>
          )}
          {progressNote && (
            <Section style={noteBox}>
              <Text style={{ ...text, color: "#92400e", margin: "0" }}>
                <strong>Note:</strong> {progressNote}
              </Text>
            </Section>
          )}
          <Section style={{ margin: "0 0 40px" }}>
            <Button href="https://mystorefront.io/messages" style={button}>
              VIEW IN MESSAGES
            </Button>
          </Section>
          <Text style={footer}>You're receiving this because you have an account on {SITE_NAME}.</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: BriefStatusEmail,
  subject: (data: Record<string, any>) =>
    `Brief "${data.briefTitle || "Update"}" — ${(data.status || "updated").replace(/_/g, " ")}`,
  displayName: "Brief status update",
  previewData: {
    recipientRole: "brand",
    briefTitle: "Spring Campaign Brief",
    status: "accepted",
    creatorName: "Jane Creator",
    brandName: "Acme Co",
    budget: "R 5,000",
    deadline: "2026-08-01",
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
