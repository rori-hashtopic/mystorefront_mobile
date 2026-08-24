# Consistent brand logos on the creator wizard carousel

## Goal

Logos in the welcome-step carousel should all read at a similar visual size (matching how Dex's logo currently appears), and Crafty Goodies and shade&Co should use the new transparent-background versions you uploaded.

## What to change

1. Replace the two logos
   - Convert the uploaded `.avif` files for Crafty Goodies and shade&Co to PNG (preserving transparency).
   - Upload each into the existing brand-logos storage bucket under that brand's folder.
   - Update `logo_url` and `logo_upload_url` on those two brand records so the carousel (and every other logo surface) picks them up.
   - shade&Co's file is a white mark, so it needs the same grayscale/darken treatment check as the others — if it disappears against the light track, invert it for the carousel treatment.

2. Make sizing consistent
   - Current tiles are 72x28px, which lets wide wordmarks shrink to a hairline while compact marks look big.
   - Move to a taller, wider fixed tile (roughly 110x40px) with the image constrained by height first (`h-full w-auto max-w-full object-contain`), so every logo occupies the same optical height regardless of aspect ratio.
   - Increase the gap between tiles slightly so wider marks don't crowd.

## Technical notes

- File touched: `src/components/onboarding/steps/WelcomeStep.tsx` (tile dimensions, image classes, gap only — no data/query changes).
- Storage + DB updates for the two brands only; no schema changes, no changes to `get_public_brand_logos()`.
