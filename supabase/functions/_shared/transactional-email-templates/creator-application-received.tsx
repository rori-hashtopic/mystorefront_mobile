/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
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
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://lhzqnkrjqaebcfxcmlgd.supabase.co/storage/v1/object/public/avatars/email%2FMyStorefront_Full_logo_black.png'

interface CreatorApplicationReceivedProps {
  firstName?: string
}

const CreatorApplicationReceivedEmail = ({ firstName }: CreatorApplicationReceivedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We've got your MyStorefront application</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="MyStorefront" style={logo} />
        </Section>
        <Section style={rule} />
        <Text style={label}>CREATOR APPLICATION</Text>
        <Heading style={h1}>Application received</Heading>
        <Text style={text}>Hi {firstName || 'there'},</Text>
        <Text style={text}>
          Just confirming that we have received your application to become a MyStorefront creator. Our team will review it and get back to you within 5 working days.
        </Text>
        <Text style={text}>
          If approved, you'll get an email with a link to access your creator account.
        </Text>
        <Section style={rule} />
        <Text style={footer}>The MyStorefront team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CreatorApplicationReceivedEmail,
  subject: "We've got your MyStorefront application",
  displayName: 'Creator application received',
  previewData: { firstName: 'Roxi' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", padding: '40px 0' }
const container = { padding: '48px 40px', maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff' }
const logoSection = { padding: '0 0 32px' }
const logo = { display: 'block' as const, height: 'auto', maxWidth: '160px' }
const rule = { borderTop: '1px solid #e8e5e0', margin: '0 0 32px' }
const label = {
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
  lineHeight: '1.15',
}
const text = { fontSize: '15px', color: '#656b78', lineHeight: '1.7', margin: '0 0 18px', fontWeight: '300' as const }
const footer = { fontSize: '12px', color: '#9ca0a8', margin: '0', lineHeight: '1.6', fontWeight: '300' as const }
