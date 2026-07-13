---
name: SchemeSetu Institutional System
colors:
  surface: '#faf9fd'
  surface-dim: '#dad9dd'
  surface-bright: '#faf9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f7'
  surface-container: '#efedf1'
  surface-container-high: '#e9e7eb'
  surface-container-highest: '#e3e2e6'
  on-surface: '#1a1c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f4'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#1960a3'
  on-secondary: '#ffffff'
  secondary-container: '#7db6ff'
  on-secondary-container: '#00477f'
  tertiary: '#00213e'
  on-tertiary: '#ffffff'
  tertiary-container: '#003762'
  on-tertiary-container: '#58a2f0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#d3e4ff'
  secondary-fixed-dim: '#a2c9ff'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#004881'
  tertiary-fixed: '#d2e4ff'
  tertiary-fixed-dim: '#9fcaff'
  on-tertiary-fixed: '#001d37'
  on-tertiary-fixed-variant: '#00497e'
  background: '#faf9fd'
  on-background: '#1a1c1e'
  surface-variant: '#e3e2e6'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  heading:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  small:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  max-width: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for public trust and administrative efficiency. The brand personality is authoritative yet helpful, acting as a reliable bridge between government resources and citizens. 

The aesthetic follows a **Modern Corporate** movement with a heavy emphasis on **High-Contrast Minimalism**. By prioritizing extreme legibility and structured white space, the UI eliminates cognitive load for users who may be navigating complex bureaucratic processes. The emotional response is one of stability, clarity, and inclusivity, ensuring that the platform feels like an official, secure utility rather than a commercial product.

## Colors
The palette is rooted in a deep Navy Blue (`#1A365D`) to establish an immediate sense of institutional authority and permanence. 

- **Primary:** Navy Blue is used for headers, navigation, and structural identity.
- **Action:** A vibrant Action Blue (`#2B6CB0`) is reserved exclusively for interactive elements and CTAs to guide the user's eye toward progress.
- **Surface:** The background utilizes a very light cool gray (`#F7FAFC`) to reduce screen glare while maintaining a clean, paper-like feel.
- **Text:** Dark Charcoal (`#2D3748`) provides optimal contrast against light surfaces, exceeding WCAG 2.1 AA accessibility standards for all users.

## Typography
This design system utilizes **Inter** for its exceptional legibility and neutral, systematic tone. To maintain extreme clarity for multilingual content (English and Hindi), the system is restricted to four primary levels.

- **Display:** Used for hero sections and main page titles.
- **Heading:** Used for section headers and card titles.
- **Body:** The workhorse for all descriptive content and form labels.
- **Small:** Reserved for metadata, captions, and micro-copy.

For Hindi typesetting, line heights should be increased by 15% across all levels to accommodate the matras (diacritics) without clipping.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to ensure information remains scannable and contained.

- **Desktop:** 12-column grid with a maximum content width of 1280px. This prevents line lengths from becoming too long, which aids reading comprehension.
- **Mobile:** 4-column fluid grid with 16px side margins.
- **Spacing Rhythm:** A base-8 scale is used for all padding and margins. Vertical rhythm is strictly enforced with `stack-lg` (32px) between major sections and `stack-md` (16px) between related elements like form fields or card content.

## Elevation & Depth
The system uses **Tonal Layers** combined with **Ambient Shadows** to create a subtle hierarchy.

- **Surface (Level 0):** The main background (`#F7FAFC`).
- **Cards (Level 1):** Pure white backgrounds (`#FFFFFF`) with a 1px border in a light gray and a soft, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)).
- **Interactive (Level 2):** On hover, cards and buttons slightly increase shadow depth to provide tactile feedback.
- **Modals (Level 3):** High elevation with a 20% opacity black backdrop blur to focus user attention on critical decision points.

## Shapes
The shape language is "Professional-Soft." By using **Rounded** (8px to 24px) corners, the system feels approachable and modern while retaining the structure required for an official platform.

- **Standard Elements:** 8px radius for buttons, input fields, and small tags.
- **Container Elements:** 16px radius for cards and informational banners.
- **Large Sections:** 24px radius for hero background shapes or main content containers.

## Components
Consistent component behavior is vital for accessibility in government services.

- **Buttons:** Primary buttons use the Action Blue background with white text. They feature a minimum height of 48px to ensure a large hit-target for mobile users and those with motor impairments.
- **Cards:** Used for scheme results. They must include a clear heading, a brief summary in Body text, and a distinct "View Details" action.
- **Multi-step Form Elements:** Each step must be clearly numbered. Completed steps use a checkmark icon in Navy Blue, while the active step is highlighted with a 4px Action Blue bottom border.
- **Data Tables:** High-contrast rows with alternating subtle gray backgrounds (zebra striping). Headers are Navy Blue with white text for maximum structural clarity.
- **Status Trackers:** A horizontal or vertical line connecting nodes. Use Success Green for "Approved," Warning Orange for "Pending," and Primary Navy for "In Progress."
- **Language Switcher:** A prominent toggle in the top-right header, using the `Small` typography level with a Globe icon.