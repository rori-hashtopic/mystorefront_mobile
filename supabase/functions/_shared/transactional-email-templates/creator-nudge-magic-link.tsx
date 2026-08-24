/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import type { TemplateEntry } from "./registry.ts";

const LOGO_URL =
  "https://lhzqnkrjqaebcfxcmlgd.supabase.co/storage/v1/object/public/avatars/email%2FMyStorefront_Full_logo_black.png";

interface CreatorNudgeProps {
  firstName?: string;
  magicLinkUrl?: string;
}

const CreatorNudgeEmail = ({ firstName, magicLinkUrl }: CreatorNudgeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A friendly reminder from Roxi at MyStorefront</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="MyStorefront" style={logo} />
        </Section>
        <Section style={rule} />
        <Text style={label}>A FRIENDLY REMINDER</Text>
        <Heading style={h1}>Your invite is still waiting</Heading>
        <Text style={text}>Hi {firstName || "there"},</Text>
        <Text style={text}>
          Roxi from MyStorefront here. We sent you an invite a little while ago and I just wanted to remind you to set
          up your account.
        </Text>
        <Text style={text}>
          We're onboarding our first brands this week, which means now is the perfect time to get in and be one of the
          first creators they discover on the platform.
        </Text>
        <Text style={text}>Here's your login link:</Text>
        <Section style={buttonSection}>
          <Button href={magicLinkUrl || "#"} style={button}>
            Set up your account
          </Button>
        </Section>
        <Section style={rule} />
        <Text style={footer}>Roxi</Text>
        <Text style={footerMuted}>roxi@mystorefront.io</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: CreatorNudgeEmail,
  subject: "A friendly reminder from Roxi at MyStorefront",
  displayName: "Creator nudge — magic link",
  previewData: { firstName: "Roxi", magicLinkUrl: "https://mystorefront.io/auth" },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  padding: "40px 0",
};
const container = { padding: "48px 40px", maxWidth: "520px", margin: "0 auto", backgroundColor: "#ffffff" };
const logoSection = { padding: "0 0 32px" };
const logo = { display: "block" as const, height: "auto", maxWidth: "160px" };
const rule = { borderTop: "1px solid #e8e5e0", margin: "0 0 32px" };
const label = {
  fontSize: "10px",
  fontWeight: "500" as const,
  color: "#9ca0a8",
  letterSpacing: "0.3em",
  textTransform: "uppercase" as const,
  margin: "0 0 12px",
};
const h1 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: "32px",
  fontWeight: "600" as const,
  color: "#1a1d24",
  margin: "0 0 20px",
  lineHeight: "1.15",
};
const text = { fontSize: "15px", color: "#656b78", lineHeight: "1.7", margin: "0 0 18px", fontWeight: "300" as const };
const buttonSection = { padding: "8px 0 28px" };
const button = {
  backgroundColor: "#1a1d24",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "500" as const,
  letterSpacing: "0.05em",
  padding: "14px 28px",
  textDecoration: "none",
  display: "inline-block" as const,
};
const footer = { fontSize: "14px", color: "#1a1d24", margin: "0 0 4px", lineHeight: "1.6" };
const footerMuted = { fontSize: "12px", color: "#9ca0a8", margin: "0", lineHeight: "1.6", fontWeight: "300" as const };
