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
  brandName?: string;
  campaignTitle?: string;
  productName?: string;
  productValue?: string;
  productImageUrl?: string;
}

const GiftRequestCreatorEmail = ({ brandName, campaignTitle, productName, productValue, productImageUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      You've received a gift from {brandName || "a brand"} on {SITE_NAME}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ margin: "0 0 32px" }}>
          <Img src={LOGO_URL} alt={SITE_NAME} style={{ height: "auto", maxWidth: "160px" }} />
        </Section>
        <Text style={label}>NEW GIFT</Text>
        <Heading style={h1}>{brandName || "A brand"} wants to send you a gift!</Heading>
        <Text style={text}>
          You've been selected to receive <strong>{productName || "a product"}</strong> as part of the{" "}
          <strong>{campaignTitle || "gifting campaign"}</strong>.
        </Text>
        {productImageUrl && (
          <Section style={{ margin: "0 0 24px" }}>
            <Img
              src={productImageUrl}
              alt={productName || "Product"}
              style={{ width: "100%", maxWidth: "400px", height: "auto", borderRadius: "4px" }}
            />
          </Section>
        )}
        {productValue && (
          <Text style={text}>
            Estimated product value: <strong>R{productValue}</strong>
          </Text>
        )}
        <Text style={text}>Log in to your {SITE_NAME} dashboard to review the details and accept or decline.</Text>
        <Section style={{ margin: "0 0 40px" }}>
          <Button href="https://mystorefrontmvp.lovable.app/gifting" style={button}>
            VIEW GIFT REQUEST
          </Button>
        </Section>
        <Text style={footer}>You're receiving this because you have a creator account on {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: GiftRequestCreatorEmail,
  subject: (data: Record<string, any>) => `${data.brandName || "A brand"} wants to send you a gift!`,
  displayName: "Gift request to creator",
  previewData: {
    brandName: "Acme Beauty",
    campaignTitle: "Summer Glow Collection",
    productName: "Vitamin C Serum",
    productValue: "450.00",
    productImageUrl: "https://placehold.co/400x300/f5f5f5/999?text=Product+Image",
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
const footer = { fontSize: "12px", color: "#b0b3ba", margin: "0", lineHeight: "1.6", fontWeight: "300" as const };
