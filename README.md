# SchemeSetu - Empowering Citizens through Welfare Scheme Discovery

SchemeSetu is a modern government scheme discovery engine that helps citizens discover welfare programs they are eligible for.

---

## 🛠️ Database & Seeding Pipelines

This repository is backed by a PostgreSQL database managed via Prisma. The dataset contains 4,794 real government schemes along with 3 dummy schemes for frontend testing.

### 1. Seeding Data
Seeding parses `dataset/schemesetu_cleaned_dataset.csv` and `myscheme.csv`, resolving unique slug IDs deterministically by combining `authorityName` and `schemeName`, with index suffixes for collision safety.
To run the seeding pipeline:
```bash
node --experimental-strip-types prisma/seed-schemes.ts
```

### 2. Welfare Data Sync Protocol (Runbook)
> [!IMPORTANT]
> **Post-Seeding Mappings Sync Protocol:**
> Whenever you re-seed the scheme dataset (`seed-schemes.ts`), the slug IDs, tags list, and categories are recreated. To keep the frontend mock mode synchronized and fully translated, you **MUST** execute the translations regeneration scripts immediately:
> 
> ```bash
> # 1. Regenerate scheme translations map
> node --experimental-strip-types scripts/translate-schemes.js
> 
> # 2. Regenerate categories/tags/authorities translations map
> node --experimental-strip-types scripts/translate-values.js
> ```
> This populates the `SchemeTranslation` and `ValueTranslation` database models AND compiles the static files:
> - `src/constants/schemeTranslations.json`
> - `src/constants/valueTranslations.json`
> 
> Failing to run these steps will break the Gujarati and Hindi translations lookup for newly seeded schemes in the frontend mock mode.

---

## 🌍 Multilingual Integration

Static UI chrome translations are managed in JSON locale files under `locales/en.json`, `locales/gu.json`, and `locales/hi.json`. If you add new UI keys:
1. Append the English translation in `locales/en.json`.
2. Generate Gujarati and Hindi localizations automatically:
   ```bash
   node --experimental-strip-types scripts/generate-ui-translations.js
   ```
