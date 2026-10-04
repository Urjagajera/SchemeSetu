# Gujarati hardening

Gujarati stays **off** (`LANGUAGES.gu.enabled = false`, guarded by a test). Nothing here has been checked by a native
speaker; every Gujarati rendering in the glossary is marked `unverified`.

## What changed (2026-10-04)

- **Wrong-script letters are rejected.** A Gujarati (or Hindi) translation containing letters from another script
  (Devanagari, Telugu, Arabic, Bengali, Tamil, CJK and others) fails validation and moves on to the fallback model.
  Tested on the six real stray-script lines from the first audit.
  The same rule run over the 5,482 stored Hindi rows found 11 titles with stray Japanese, Korean, Bengali or Cyrillic
  letters; those are not fixed yet.
- **Gujarati ordinals written as words** (1st to 10th, e.g. "10th Standard" = "દસમા ધોરણ") no longer fail the number
  check, mirroring Hindi. Scheme 48's earlier rejection was *not* an ordinal: it was the list numbers "1." "2." "3."
  being dropped, which stays a rejection.
- **Glossary:** 17 audit terms (free of charge / free of cost, Scheduled Caste, Scheduled Tribe, Backward Class,
  Denotified, Nomadic, trimester, interest subvention, buffalo, pig, piglet, pulses, sewing machine, partnership firm,
  partnership concern, age relaxation). Whole-word matching for pig/piglet/pulses so "pigeon" and "piggery" do not fire.
- **Pipeline:** Gujarati now tries gpt-oss-120b first and Qwen only as the fallback, like Hindi.

## Re-audit on a fresh sample (seed 20261004, 50 schemes, 363 lines)

Same method as the first audit: forward translation by the production translator, literal back-translation by Qwen,
every line judged against the English. One field (scheme 29 eligibility) was rejected by the validator on both models
and stayed English.

| | lines | wrong meaning (MAJOR) | MINOR |
|---|---|---|---|
| gpt-oss-120b | 226 | 7 (3.1%) | 41 (18%) |
| Qwen (fallback) | 137 | 12 (8.8%) | 18 (13%) |
| all | 363 | 19 (5.2%) | 59 (16%) |

Qwen's 137 lines are there only because gpt-oss-120b hit Groq's per-minute token limit (54 requests); the validator
rejected only 2 outputs. The first audit's gpt-oss figure was 0.9% MAJOR / 6% MINOR; this one is higher on both, and
the MINOR grading here was stricter (Hindi-style words, transliterated "ward"), so the MINOR numbers are not
comparable. The new validator rules and glossary did not fire on this sample: no output had a stray-script letter.

## Still open

- Word-level slips the validator cannot see: "pulse" (singular) became "ડાળિયા"; "marginal" became "કિનારીવાળા"; "ninety"
  became a non-word; Latin letters inside a Gujarati word ("કોconut") pass the script check.
- Roughly one in twenty lines still changes meaning. A native review is the gate for switching Gujarati on.
