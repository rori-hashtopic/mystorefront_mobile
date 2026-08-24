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

interface CreatorApplicationAdminNotificationProps {
  firstName?: string
  lastName?: string
  email?: string
  whatsappNumber?: string
  instagramHandle?: string
  tiktokHandle?: string
  youtubeHandle?: string
  otherLink?: string
  primaryPlatform?: string
  followerRange?: string
}

const display = (value?: string) => value?.trim() || 'Not provided'

const Field = ({ label, value }: { label: string; value?: string }) => (
  <Section style={fieldRow}>
    <Text style={fieldLabel}>{label}</Text>
    <Text style={fieldValue}>{display(value)}</Text>
  </Section>
)

const CreatorApplicationAdminNotificationEmail = (props: CreatorApplicationAdminNotificationProps) => {
  const fullName = [props.firstName, props.lastName].filter(Boolean).join(' ').trim() || 'A creator'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New creator application from {fullName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={LOGO_URL} alt="MyStorefront" style={logo} />
          </Section>
          <Section style={rule} />
          <Text style={label}>CREATOR APPLICATION</Text>
          <Heading style={h1}>New creator application</Heading>
          <Text style={text}>{fullName} has submitted an application to become a MyStorefront creator.</Text>
          <Section style={detailsBox}>
            <Field label="Name" value={fullName} />
            <Field label="Email" value={props.email} />
            <Field label="WhatsApp number" value={props.whatsappNumber} />
            <Field label="Instagram" value={props.instagramHandle} />
            <Field label="TikTok" value={props.tiktokHandle} />
            <Field label="YouTube" value={props.youtubeHandle} />
            <Field label="Other link" value={props.otherLink} />
            <Field label="Primary platform" value={props.primaryPlatform} />
            <Field label="Follower range" value={props.followerRange} />
          </Section>
          <Section style={rule} />
          <Text style={footer}>The MyStorefront team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CreatorApplicationAdminNotificationEmail,
  subject: 'New MyStorefront creator application',
  displayName: 'Creator application admin notification',
  previewData: {
    firstName: 'Roxi',
    lastName: 'Meyer',
    email: 'creator@example.com',
    whatsappNumber: '+27 82 000 0000',
    instagramHandle: '@creator',
    tiktokHandle: '@creator',
    youtubeHandle: 'youtube.com/@creator',
    otherLink: 'https://creator.example.com',
    primaryPlatform: 'Instagram',
    followerRange: '10,000 – 50,000',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", padding: '40px 0' }
const container = { padding: '48px 40px', maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff' }
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
const text = { fontSize: '15px', color: '#656b78', lineHeight: '1.7', margin: '0 0 24px', fontWeight: '300' as const }
const detailsBox = { borderTop: '1px solid #e8e5e0', margin: '4px 0 32px' }
const fieldRow = { borderBottom: '1px solid #e8e5e0', padding: '14px 0' }
const fieldLabel = { fontSize: '11px', color: '#9ca0a8', letterSpacing: '0.14em', textTransform: 'uppercase' as const, margin: '0 0 4px' }
const fieldValue = { fontSize: '15px', color: '#1a1d24', lineHeight: '1.6', margin: '0', fontWeight: '400' as const }
const footer = { fontSize: '12px', color: '#9ca0a8', margin: '0', lineHeight: '1.6', fontWeight: '300' as const }