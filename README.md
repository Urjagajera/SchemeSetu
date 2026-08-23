# SchemeSetu - Empowering Citizens through Welfare Scheme Discovery

SchemeSetu is a modern government scheme discovery engine that helps citizens discover welfare programs they are eligible for.

---

## Scheme Dataset

SchemeSetu operates with a comprehensive dataset containing 4,794 real government schemes maintained in `src/constants/schemesData.ts`. Schemes are enriched with eligibility rules, deadlines, and multilingual translations.

---

## 🌍 Multilingual Integration

Static UI chrome translations are managed in JSON locale files under `locales/en.json`, `locales/gu.json`, and `locales/hi.json`. If you add new UI keys:
1. Append the English translation in `locales/en.json`.
2. Generate Gujarati and Hindi localizations automatically:
   ```bash
   node --experimental-strip-types scripts/generate-ui-translations.js
   ```
