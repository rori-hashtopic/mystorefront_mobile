/// <reference types="npm:@types/react@18.3.1" />
import * as React from "npm:react@18.3.1";
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from "npm:@react-email/components@0.0.22";
import type { TemplateEntry } from "./registry.ts";

const LOGO_URL =
  "https://lhzqnkrjqaebcfxcmlgd.supabase.co/storage/v1/object/public/avatars/email%2FMyStorefront_Full_logo_black.png";

interface CreatorWaitlistRegretProps {
  firstName?: string;
}

const CreatorWaitlistRegretEmail = ({ firstName }: CreatorWaitlistRegretProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>An update on your MyStorefront creator application</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="MyStorefront" style={logo} />
        </Section>
        <Section style={rule} />
        <Text style={label}>CREATOR APPLICATION</Text>
        <Heading style={h1}>Thanks for applying</Heading>
        <Text style={text}>Hi {firstName || "there"},</Text>
        <Text style={text}>
          Thanks for applying to become a MyStorefront creator. Unfortunately, your application doesn't quite meet our
          creator criteria at this stage. Here are a few tips to make it stronger for next time.
        </Text>
        <Text style={text}>Our creator criteria:</Text>
        <Text style={listItem}>1. A clear niche and consistent content on Instagram or TikTok</Text>
        <Text style={listItem}>2. A strong and established following</Text>
        <Text style={listItem}>3. An engaged community with comments and real conversations</Text>
        <Text style={text}>
          Please also make sure your Instagram profile is set to public — our reviewers need to be able to view your
          content to assess your application.
        </Text>
        <Text style={text}>
          Once your profile lines up with these, we'd love to see your application again. You're welcome to reapply in 3
          months.
        </Text>
        <Text style={text}>
          In the meantime, follow along on Instagram{" "}
          <a href="https://instagram.com/mystorefront.io" style={linkStyle}>
            @mystorefront.io
          </a>{" "}
          for more tips.
        </Text>
        <Section style={rule} />
        <Text style={footer}>The MyStorefront team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: CreatorWaitlistRegretEmail,
  subject: "An update on your MyStorefront application",
  displayName: "Creator waitlist regret",
  previewData: { firstName: "Roxi" },
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
const listItem = {
  fontSize: "15px",
  color: "#656b78",
  lineHeight: "1.7",
  margin: "0 0 8px",
  fontWeight: "300" as const,
  paddingLeft: "8px",
};
const linkStyle = { color: "#1a1d24", textDecoration: "underline" };
const footer = { fontSize: "12px", color: "#9ca0a8", margin: "0", lineHeight: "1.6", fontWeight: "300" as const };
