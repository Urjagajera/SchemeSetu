# Hindi card summaries: finished

All 4,722 schemes have a stored Hindi summary (field `summary`, language `hi`), none failed.

## How they were made
A metered run script (kept outside the repo) called the normal translation service with a token budget per model, so the free daily
quota (200,000 gpt-oss tokens a day) was never overrun. It ran in batches over several days. Every stored text passed the validators.
Rows that failed because of a dropped connection were deleted and retried; rows rejected by a validator were not hand-written.

## The last row
"Investment Promotion Scheme (IPS) 2022 - for Thrust Sectors" is one sentence built from two scheme names in quotes. Both models kept the
names in English, so the Hindi-script share stayed near 38% and the validator rejected it every time.

The validator now leaves out of that count a name the source puts in quotation marks, when the output keeps it exactly
(`quotedNames` in `backend/src/translation/validate.ts`). It applies to Hindi and Gujarati alike. A name in quotes that the model changed,
or text in English that is not in quotes, still counts in full, and English copied back unchanged is still rejected.

## Still unverified
The Hindi wording has not been reviewed by a native speaker. Gujarati stays off.
