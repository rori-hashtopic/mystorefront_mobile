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
  creatorName?: string;
  campaignTitle?: string;
  productName?: string;
  postUrl?: string;
}

const GiftPostedBrandEmail = ({ creatorName, campaignTitle, productName, postUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{creatorName || "A creator"} posted about your gifted product!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ margin: "0 0 32px" }}>
          <Img src={LOGO_URL} alt={SITE_NAME} style={{ height: "auto", maxWidth: "160px" }} />
        </Section>
        <Text style={label}>CONTENT POSTED</Text>
        <Heading style={h1}>{creatorName || "A creator"} posted about your product!</Heading>
        <Text style={text}>
          Great news! <strong>{creatorName || "The creator"}</strong> has shared content featuring{" "}
          <strong>{productName || "your product"}</strong> from the{" "}
          <strong>{campaignTitle || "gifting campaign"}</strong>.
        </Text>
        {postUrl && (
          <Section style={{ margin: "0 0 16px" }}>
            <Button href={postUrl} style={{ ...button, backgroundColor: "#e0552b" }}>
              VIEW POST
            </Button>
          </Section>
        )}
        <Section style={{ margin: "0 0 40px" }}>
          <Button href="https://mystorefrontmvp.lovable.app/brand/gifting" style={button}>
            VIEW CAMPAIGN
          </Button>
        </Section>
        <Text style={footer}>You're receiving this because you manage a brand on {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: GiftPostedBrandEmail,
  subject: (data: Record<string, any>) => `${data.creatorName || "A creator"} posted about your product!`,
  displayName: "Gift posted notification to brand",
  previewData: {
    creatorName: "Roxi Francke",
    campaignTitle: "Summer Glow Collection",
    productName: "Vitamin C Serum",
    postUrl: "https://instagram.com/p/example",
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
