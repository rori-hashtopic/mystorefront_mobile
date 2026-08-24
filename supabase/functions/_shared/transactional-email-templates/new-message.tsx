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
const PLATFORM_URL = "https://mystorefrontmvp.lovable.app/messages";

interface Props {
  senderName?: string;
  messagePreview?: string;
  recipientRole?: "brand" | "creator";
}

const NewMessageEmail = ({ senderName, messagePreview, recipientRole }: Props) => {
  const isBrand = recipientRole === "brand";
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {senderName || "Someone"} sent you a message on {SITE_NAME}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ margin: "0 0 32px" }}>
            <Img src={LOGO_URL} alt={SITE_NAME} style={{ height: "auto", maxWidth: "160px" }} />
          </Section>
          <Text style={label}>NEW MESSAGE</Text>
          <Heading style={h1}>{senderName || "Someone"} sent you a message</Heading>
          {messagePreview && (
            <Section style={previewBox}>
              <Text style={previewText}>"{messagePreview}"</Text>
            </Section>
          )}
          <Text style={text}>Log in to your {SITE_NAME} dashboard to read and reply.</Text>
          <Section style={{ margin: "0 0 40px" }}>
            <Button href={PLATFORM_URL} style={button}>
              VIEW MESSAGES
            </Button>
          </Section>
          <Text style={footer}>
            You're receiving this because you have {isBrand ? "a brand" : "a creator"} account on {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: NewMessageEmail,
  subject: (data: Record<string, any>) => `${data.senderName || "Someone"} sent you a message on ${SITE_NAME}`,
  displayName: "New message notification",
  previewData: {
    senderName: "HashTopic",
    messagePreview: "Hey! Just wanted to check in about the campaign — are you still on track for Friday?",
    recipientRole: "creator",
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
const previewBox = {
  backgroundColor: "#fafafa",
  border: "1px solid #f0f0f0",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "0 0 16px",
};
const previewText = {
  fontSize: "14px",
  color: "#1a1d24",
  fontStyle: "italic" as const,
  lineHeight: "1.6",
  margin: "0",
};
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
