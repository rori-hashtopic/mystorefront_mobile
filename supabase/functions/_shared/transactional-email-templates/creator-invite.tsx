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

interface CreatorInviteProps {
  firstName?: string;
  magicLinkUrl?: string;
}

const CreatorInviteEmail = ({ firstName, magicLinkUrl }: CreatorInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been approved as a MyStorefront creator</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="MyStorefront" style={logo} />
        </Section>
        <Section style={rule} />
        <Text style={label}>YOU'RE IN</Text>
        <Heading style={h1}>Welcome to MyStorefront</Heading>
        <Text style={text}>Hi {firstName || "there"},</Text>
        <Text style={text}>
          Great news — your creator application has been approved. You can now activate your MyStorefront account
          and start building your storefront.
        </Text>
        <Text style={text}>
          MyStorefront is where South African creators partner with brands on affiliate collabs, gifting, and paid
          campaigns. Once you're in, you'll get your own shoppable storefront, a commission dashboard, and access
          to the brand messaging tools.
        </Text>
        <Text style={text}>Click below to set your password and activate your account:</Text>
        <Section style={buttonSection}>
          <Button href={magicLinkUrl || "#"} style={button}>
            Activate my account
          </Button>
        </Section>
        <Text style={smallText}>
          This link is valid for 7 days. If it expires, just reply to this email and we'll send a fresh one.
        </Text>
        <Section style={rule} />
        <Text style={footer}>Roxi</Text>
        <Text style={footerMuted}>Founder, MyStorefront</Text>
        <Text style={footerMuted}>roxi@mystorefront.io</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: CreatorInviteEmail,
  subject: "You're in — activate your MyStorefront creator account",
  displayName: "Creator invite",
  previewData: { firstName: "Sam", magicLinkUrl: "https://mystorefront.io/creator-invite?token=preview" },
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
const smallText = { fontSize: "13px", color: "#9ca0a8", lineHeight: "1.6", margin: "0 0 12px", fontWeight: "300" as const };
const buttonSection = { padding: "8px 0 20px" };
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
