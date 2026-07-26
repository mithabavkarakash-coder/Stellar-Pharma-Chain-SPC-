---
name: Clinical Integrity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#191c1e'
  on-tertiary-container: '#818486'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin-mobile: 16px
  container-margin-desktop: 40px
  gutter: 16px
---

## Brand & Style
The design system is built on the foundations of **Modern Corporate** efficiency and **Minimalist** clarity. It targets pharmaceutical professionals and logistics managers who require absolute certainty in data integrity. The visual language evokes a "Proof of Authenticity" through a clinical, high-trust aesthetic that prioritizes information density and legibility over decorative elements.

The UI should feel secure, immutable, and precise. By utilizing a restrained color palette and a structured grid, the design system ensures that critical status updates—such as verification successes or supply chain warnings—are the most prominent visual anchors. The emotional response is one of reliability, systematic order, and professional authority.

## Colors
The palette is rooted in "Deep Medical Blues" to establish a sense of institutional security. 
- **Primary:** A deep, near-black navy used for text and high-level structural headers to anchor the UI.
- **Secondary:** A bright, clinical blue used for primary actions and active states.
- **Background:** A pure, sterile white (`#FFFFFF`) is the base, with **Tertiary** light grays used to define card surfaces and section containers.
- **Functional Status:** High-saturation Green (Verified), Amber (Pending), and Red (Warning/Counterfeit) are used exclusively for semantic signaling, ensuring that status changes are immediately identifiable during rapid scanning.

## Typography
This design system utilizes **Inter** for its systematic, utilitarian nature and exceptional legibility in professional contexts. For highly technical data—such as Batch IDs, Serial Numbers, and Blockchain hashes—**JetBrains Mono** is introduced to provide a distinct visual "texture" for machine-readable strings, preventing human error during manual audits.

Typography scales are tight and purposeful. Large headlines are reserved for page titles, while most information is conveyed through a robust set of body and label styles. "Label-caps" are used for metadata categories to create a clear hierarchy between the category name and the data value.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy optimized for mobile-first utility. On mobile devices, the system uses a single-column stack with 16px side margins. On tablet and desktop, a 12-column grid is employed to allow for side-by-side comparisons of shipment data and verification logs.

Spacing is strictly mathematical, based on a 4px baseline grid. Internal card padding is typically 16px to maintain a dense but breathable information flow. For complex data tables, vertical spacing is reduced to 12px to maximize the number of visible rows on a single screen.

## Elevation & Depth
In alignment with the "Clinical" aesthetic, this design system avoids heavy shadows. Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines**.
- **Surface Level 0:** The main application background (Tertiary gray).
- **Surface Level 1:** Primary cards and containers (White) with a subtle 1px border (`#E2E8F0`).
- **Interactive Level:** Elements that are tappable use a subtle, highly-diffused ambient shadow (4px blur, 5% opacity) only to indicate "lift" when active.

The goal is to keep the UI flat and "stamped" onto the screen, reinforcing the feeling of a digital ledger.

## Shapes
The shape language is **Soft (0.25rem)**. This provides enough rounding to feel modern and accessible without losing the professional "edge" required for a high-trust pharmaceutical tool. 
- Standard buttons and input fields use the base 4px radius.
- Large data cards use 8px (`rounded-lg`) to clearly group complex information sets.
- Status indicators (chips) may use a pill-shape for quick visual differentiation from buttons.

## Components
- **Verification Cards:** The centerpiece of the app. These feature a heavy left-accent border colored by status (Green/Amber/Red) and contain the product name, ID, and timestamp.
- **Action Buttons:** Primary buttons are solid Secondary Blue with white text. Secondary buttons are outlined in the Primary color.
- **Scanning Interface:** A dedicated "Scan" button is fixed to the bottom center of the mobile view, using a high-contrast treatment to differentiate it from navigation.
- **Status Chips:** Small, semi-transparent background versions of the status colors with bold text (e.g., Green text on a 10% opacity Green background) for high-speed scanning of lists.
- **Data Inputs:** Field labels are always visible (never floating) to ensure the user always knows what data they are entering/reading, reinforcing the clinical precision.
- **ID Elements:** Use the `data-mono` typography style and are often presented in a subtle gray well/container to separate machine data from human-readable text.