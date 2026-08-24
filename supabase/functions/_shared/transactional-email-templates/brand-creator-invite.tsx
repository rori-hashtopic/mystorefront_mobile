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

interface BrandCreatorInviteProps {
  firstName?: string;
  brandName?: string;
  welcomeMessage?: string;
  inviteUrl?: string;
  replyToEmail?: string;
}

const BrandCreatorInviteEmail = ({
  firstName,
  brandName,
  welcomeMessage,
  inviteUrl,
  replyToEmail,
}: BrandCreatorInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{brandName || "A brand"} has invited you to join them on MyStorefront</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="MyStorefront" style={logo} />
        </Section>
        <Section style={rule} />
        <Text style={label}>YOU'VE BEEN INVITED</Text>
        <Heading style={h1}>{brandName || "A brand"} wants to work with you</Heading>
        <Text style={text}>Hi {firstName || "there"},</Text>
        <Text style={text}>
          {brandName || "A brand"} has invited you to join MyStorefront, a platform where South African creators partner
          with brands on affiliate collabs, gifting, and paid campaigns.
        </Text>

        {welcomeMessage ? (
          <Section style={quoteSection}>
            <Text style={quoteLabel}>A message from {brandName || "the brand"}</Text>
            <Text style={quoteText}>{welcomeMessage}</Text>
          </Section>
        ) : null}

        <Text style={text}>
          Accept the invite to create your account, build your shoppable storefront, and start working with{" "}
          {brandName || "the brand"}.
        </Text>
        <Section style={buttonSection}>
          <Button href={inviteUrl || "#"} style={button}>
            Accept invite
          </Button>
        </Section>
        <Text style={smallText}>
          This invite link is personal to you and valid for 30 days. Got a question, or has it expired? Just reply to
          this email{replyToEmail ? `. It goes straight to ${brandName || "the brand"}` : ""}.
        </Text>
        <Text style={smallText}>
          Didn't expect this? You can safely ignore this email. No account is created until you accept.
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
  component: BrandCreatorInviteEmail,
  subject: (data: Record<string, any>) =>
    `${data?.brandName || "A brand"} has invited you to join them on MyStorefront`,
  displayName: "Brand → creator invite",
  previewData: {
    firstName: "Sam",
    brandName: "HashTopic",
    replyToEmail: "brand@example.com",
    welcomeMessage: "Hi Sam! We'd love to send you a gift and talk about a collab. Welcome aboard.",
    inviteUrl: "https://mystorefront.io/brand-invite?token=preview",
  },
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
const smallText = {
  fontSize: "13px",
  color: "#9ca0a8",
  lineHeight: "1.6",
  margin: "0 0 12px",
  fontWeight: "300" as const,
};
const quoteSection = {
  borderLeft: "2px solid #1a1d24",
  padding: "4px 0 4px 18px",
  margin: "0 0 24px",
};
const quoteLabel = {
  fontSize: "10px",
  fontWeight: "500" as const,
  color: "#9ca0a8",
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  margin: "0 0 8px",
};
const quoteText = {
  fontSize: "15px",
  color: "#1a1d24",
  lineHeight: "1.7",
  margin: "0",
  fontWeight: "300" as const,
  fontStyle: "italic" as const,
};
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
