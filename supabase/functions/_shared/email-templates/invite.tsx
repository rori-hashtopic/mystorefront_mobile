/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

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
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

const LOGO_URL = 'https://lhzqnkrjqaebcfxcmlgd.supabase.co/storage/v1/object/public/avatars/email%2FMyStorefront_Full_logo_black.png'

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
    </Head>
    <Preview>You've been invited to join MyStorefront</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="160" alt="MyStorefront" style={logo} />
        </Section>
        <Section style={rule} />
        <Text style={label}>INVITATION</Text>
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join MyStorefront. Accept below to create your account.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation &nbsp;→
          </Button>
        </Section>
        <Section style={rule} />
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#faf9f7', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", padding: '40px 0' }
const container = { padding: '48px 40px', maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff' }
const logoSection = { padding: '0 0 32px' }
const logo = { display: 'block' as const, height: 'auto', maxWidth: '160px' }
const rule = { borderTop: '1px solid #e8e5e0', margin: '0 0 32px' }
const label = {
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: '10px',
  fontWeight: '500' as const,
  color: '#9ca0a8',
  letterSpacing: '0.3em',
  textTransform: 'uppercase' as const,
  margin: '0 0 12px',
}
const h1 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '32px',
  fontWeight: '600' as const,
  color: '#1a1d24',
  margin: '0 0 20px',
  letterSpacing: '-0.03em',
  lineHeight: '1.15',
}
const text = {
  fontSize: '15px',
  color: '#656b78',
  lineHeight: '1.7',
  margin: '0 0 28px',
  fontWeight: '300' as const,
}
const buttonSection = { margin: '0 0 40px' }
const button = {
  backgroundColor: '#1a1d24',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '400' as const,
  fontFamily: "'Inter', Arial, sans-serif",
  borderRadius: '0',
  padding: '16px 32px',
  textDecoration: 'none',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
}
const footer = { fontSize: '12px', color: '#b0b3ba', margin: '0', lineHeight: '1.6', fontWeight: '300' as const }
