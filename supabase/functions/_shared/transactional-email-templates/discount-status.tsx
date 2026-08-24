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
  code?: string;
  discountType?: string;
  discountValue?: number;
  expiryDate?: string;
  status?: string;
  brandName?: string;
}

const DiscountStatusEmail = ({ code, discountType, discountValue, expiryDate, status, brandName }: Props) => {
  const discountLabel =
    discountType === "percentage" ? `${discountValue || 0}% off` : `R${Number(discountValue || 0).toFixed(2)} off`;

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {status === "assigned"
          ? `You've received a new discount code: ${code || "CODE"}`
          : `Discount code ${code || "CODE"} has been acknowledged`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ margin: "0 0 32px" }}>
            <Img src={LOGO_URL} alt={SITE_NAME} style={{ height: "auto", maxWidth: "160px" }} />
          </Section>
          <Text style={label}>DISCOUNT CODE</Text>
          <Heading style={h1}>{status === "assigned" ? "New discount code assigned" : "Code acknowledged"}</Heading>
          <Text style={text}>
            {status === "assigned"
              ? `${brandName || "A brand"} has assigned you a new discount code.`
              : `The discount code ${code || ""} has been acknowledged by the creator.`}
          </Text>
          <Section style={codeBox}>
            <Text style={codeText}>{code || "CODE"}</Text>
            <Text style={{ ...text, margin: "4px 0 0", textAlign: "center" as const, fontSize: "14px" }}>
              {discountLabel}
              {expiryDate ? ` · Expires ${expiryDate}` : ""}
            </Text>
          </Section>
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
};

export const template = {
  component: DiscountStatusEmail,
  subject: (data: Record<string, any>) =>
    data.status === "assigned"
      ? `New discount code: ${data.code || "assigned"}`
      : `Discount code ${data.code || ""} acknowledged`,
  displayName: "Discount code status update",
  previewData: {
    code: "CREATOR20",
    discountType: "percentage",
    discountValue: 20,
    expiryDate: "2026-06-30",
    status: "assigned",
    brandName: "Brand & Co",
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
const codeBox = {
  backgroundColor: "#f5f3f0",
  borderRadius: "8px",
  padding: "20px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};
const codeText = {
  fontFamily: "'Courier New', monospace",
  fontSize: "28px",
  fontWeight: "700" as const,
  color: "#1a1d24",
  letterSpacing: "0.1em",
  margin: "0",
};
const footer = { fontSize: "12px", color: "#b0b3ba", margin: "0", lineHeight: "1.6", fontWeight: "300" as const };
