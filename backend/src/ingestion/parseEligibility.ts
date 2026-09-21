/**
 * parseEligibility.ts
 * Pure, testable parsing functions to extract structured eligibility criteria
 * (ageMin, ageMax, incomeMinAnnual, incomeMaxAnnual) from Scheme.eligibilityRawText.
 *
 * Locked Design Rules:
 * 1. Only extract age and income. Non-numeric or unrelated numeric criteria (years of service,
 *    Ph.D. counts, turnover, project outlay, etc.) stay in raw text only.
 * 2. Income normalized to ANNUAL. If monthly, multiply by 12 UNLESS an explicit annual figure
 *    is also present in the sentence (prefer explicit annual and log comparison).
 * 3. Handle decimal Lakh (1 Lakh = 100,000) and Crore (1 Crore = 10,000,000).
 * 4. Multiple income ceilings for one scheme -> select the LOWER figure.
 * 5. Sanity bound: If annual figure > 50,00,00,000 (50 lakh), skip and log as data error.
 * 6. EligibilityCriteria row created ONLY if at least one field is non-null.
 */

export interface AgeExtractionResult {
  min: number | null;
  max: number | null;
  matchedSentences: string[];
  ruleMatched: string | null;
  logs: string[];
}

export interface IncomeCandidate {
  valueAnnual: number;
  type: 'max' | 'min';
  sourceSentence: string;
  sourceAmountRaw: string;
  isMonthlyConverted: boolean;
  explicitAnnualPresent: boolean;
}

export interface IncomeExtractionResult {
  minAnnual: number | null;
  maxAnnual: number | null;
  matchedSentences: string[];
  ruleMatched: string | null;
  skippedForSanity: Array<{
    amount: number;
    sentence: string;
    reason: string;
  }>;
  multipleIncomesFound: boolean;
  candidatesConsidered: IncomeCandidate[];
  logs: string[];
}

export interface ParsedEligibility {
  ageMin: number | null;
  ageMax: number | null;
  incomeMinAnnual: number | null;
  incomeMaxAnnual: number | null;
  hasAnyCriteria: boolean;
  ageResult: AgeExtractionResult;
  incomeResult: IncomeExtractionResult;
  logs: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes numbers and units (e.g. "3.50 lakh" -> 350000, "₹ 2,00,000" -> 200000)
 */
export function parseCurrencyAmount(rawStr: string): number | null {
  const cleaned = rawStr.trim();

  // Match "X lakh" or "X crore"
  const lakhMatch = cleaned.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:lakhs?|lacs?)\b/i);
  if (lakhMatch) {
    const num = parseFloat(lakhMatch[1]);
    if (!isNaN(num)) return Math.round(num * 100000);
  }

  const croreMatch = cleaned.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:crores?)\b/i);
  if (croreMatch) {
    const num = parseFloat(croreMatch[1]);
    if (!isNaN(num)) return Math.round(num * 10000000);
  }

  // Match comma-separated numbers: e.g. "2,00,000" or "48,000" or "10,000" — also
  // tolerates a stray space after the comma ("2, 00,000", "6, 500"), a real
  // formatting artifact confirmed in the source CSV (e.g. "Financial Assistance
  // To Destitute Children Scheme", "Bina Mulya Samajik Suraksha Yojana") that
  // otherwise silently fails to match and returns null instead of the real number.
  const commaMatch = cleaned.match(/[0-9]{1,3}(?:,\s{0,2}[0-9]{2,3})+(?:\.[0-9]+)?/);
  if (commaMatch) {
    const sanitized = commaMatch[0].replace(/[,\s]/g, '');
    const num = parseFloat(sanitized);
    if (!isNaN(num)) return Math.round(num);
  }

  // Match plain numbers without commas (at least 3 digits to avoid stray single digits)
  const plainMatch = cleaned.match(/[0-9]{3,}(?:\.[0-9]+)?/);
  if (plainMatch) {
    const num = parseFloat(plainMatch[0]);
    if (!isNaN(num)) return Math.round(num);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Age Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts ageMin and ageMax from eligibilityRawText sentences.
 * Strictly avoids non-age numeric criteria (years of service, Ph.D. dissertations, etc.)
 *
 * Boundary convention (explicit product decision, applied uniformly): every
 * "ceiling" phrasing — "below X", "under X", "less than X", "should not exceed X",
 * "maximum age X", "should not have completed the age of X" — sets ageMax = X
 * (inclusive), not X-1. This trades strict grammatical precision for one
 * consistent rule across every pattern, rather than a different cutoff
 * convention per phrasing.
 *
 * Audit note: an earlier version of this function `return`ed as soon as any
 * range pattern matched a sentence, which silently abandoned the rest of that
 * scheme's sentences — confirmed live: "The applicant should not exceed 55
 * years of age." parses correctly to max=55 in isolation, but was dropped
 * entirely at the scheme level because an earlier sentence matched a range
 * first. This version never returns early; it keeps scanning every sentence
 * and only ever fills a field (min/max) once, via null-guards, so a later
 * sentence can still supply whatever the first match didn't.
 */
export function extractAge(sentences: string[]): AgeExtractionResult {
  const result: AgeExtractionResult = {
    min: null,
    max: null,
    matchedSentences: [],
    ruleMatched: null,
    logs: [],
  };

  const recordMatch = (sentence: string, rule: string) => {
    if (!result.matchedSentences.includes(sentence)) result.matchedSentences.push(sentence);
    result.ruleMatched = result.ruleMatched ? `${result.ruleMatched}+${rule}` : rule;
  };

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // Reject sentences that are purely about service years, degrees, or experience without age context
    if (
      /\b(?:years?\s+of\s+service|service\s+left|experience|dissertations?|projects?|papers?|candidates?)\b/i.test(trimmed) &&
      !/\b(?:age|aged|years?\s+of\s+age|age\s+limit|age\s+group)\b/i.test(trimmed)
    ) {
      continue;
    }

    // The looser patterns below (bare "X to Y years", hyphenated "X-Y years", a
    // bare "less than X years") need an explicit age anchor somewhere in the
    // sentence, or they'd false-positive on any unrelated numeric range (loan
    // tenures, grant durations, etc.). The stricter patterns already require
    // "age"/"years of age" as part of the match itself, so this gate is a
    // second, cheap safety net specifically for the loose ones.
    const hasAgeAnchor = /\b(?:age|aged)\b/i.test(trimmed);
    if (!hasAgeAnchor) continue;

    // ── RANGE PATTERNS (set both min and max from one sentence) ──────────────
    if (result.min === null && result.max === null) {
      // "aged between 18 and 70 years" / "age limit ... between 18 and 55" / "in the age group of 18 to 35"
      const rangeBetween = trimmed.match(
        /(?:(?:aged?|applicant\s+should\s+be|age\s+limit\s+.*?should\s+be|age\s+.*?should\s+be)\s+between|in\s+the\s+age\s+group\s+of|age\s+group\s+of)\s+(\d{1,2})\s*(?:years?)?(?:\s*\([^)]+\))?\s*(?:and|to|-)\s*(\d{1,2})\s*years?(?:\s*of\s*age|\s*old)?/i
      );
      // "above 20 years and below 35 years of age"
      const rangeAboveBelow = trimmed.match(
        /(?:above|at\s+least)\s+(\d{1,2})\s*years?(?:\s*of\s*age)?\s*and\s*(?:below|under)\s+(\d{1,2})\s*years?(?:\s*of\s*age)?/i
      );
      // "minimum age ... is 18 years and maximum is 40 years"
      const rangeMinMax = trimmed.match(
        /minimum\s+age(?:\s+of\s+joining(?:\s+[A-Z]+)?|\s+limit)?\s+is\s+(\d{1,2})\s*years?\s+and\s+maximum\s+(?:is)?\s+(\d{1,2})\s*years?/i
      );
      // Bare "16 to 45 years [old]" / "18-60 years" / "18-35 years age group" — the
      // hasAgeAnchor gate above is what makes this safe to keep loose.
      const rangeBare = trimmed.match(
        /\b(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s*years?(?:\s*of\s*age|\s*old|\s*age\s*group)?\b/i
      );

      for (const m of [rangeBetween, rangeAboveBelow, rangeMinMax, rangeBare]) {
        if (!m) continue;
        const min = parseInt(m[1], 10);
        const max = parseInt(m[2], 10);
        if (min >= 1 && min <= 100 && max >= min && max <= 100) {
          result.min = min;
          result.max = max;
          recordMatch(trimmed, 'range');
          result.logs.push(`Matched age range: ${min}-${max} from: "${trimmed}"`);
          break;
        }
      }
    }

    // ── STANDALONE MIN ────────────────────────────────────────────────────────
    // "not completed the age of X" is a MAX (checked in the max block below) —
    // must not also fall through to the bare "completed the age of X" MIN
    // pattern here, hence the explicit negative guard on that one pattern.
    if (result.min === null) {
      const minPatterns: RegExp[] = [
        /(?:age\s+.*?must\s+be\s+at\s+least|minimum\s+age\s+(?:of|is)?|should\s+not\s+be\s+less\s+than|not\s+be\s+less\s+than)\s+(\d{1,2})(?:\s*\([a-z]+\))?\s*years?(?:\s*of\s*age)?/i,
        /(?:applicant\s+should\s+be|should\s+be|must\s+be)\s+(\d{1,2})\s*years?(?:\s*of\s*age)?\s*(?:or\s+above|and\s+above|or\s+more|or\s+older|\+)/i,
        /(?:applicant\s+should\s+be|should\s+be|must\s+be)\s+above\s+(\d{1,2})\s*years?\s+of\s+age/i,
        /\battained\s+the\s+age\s+of\s+(\d{1,2})\s*years?/i,
        // Bare "above X years of age" as a MIN — but NOT when the sentence
        // itself flips it into a ceiling, e.g. "Faculty above 50 years of age
        // is not eligible to apply" (confirmed real case: rgisfm) actually
        // means max=50, and is already caught by the dedicated MAX pattern
        // above. Without this exclusion both patterns fire on the same
        // substring and produce a contradictory min=max=50.
        /\babove\s+(\d{1,2})\s*years?\s+of\s+age\b(?!\s*[).]*\s*(?:(?:is|are|shall|will|would)?\s*not\s+(?:be\s+)?eligible|ineligible)\b)/i,
      ];

      for (const pat of minPatterns) {
        const m = trimmed.match(pat);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val >= 1 && val <= 100) {
            result.min = val;
            recordMatch(trimmed, 'min');
            result.logs.push(`Matched age min: ${val} from: "${trimmed}"`);
            break;
          }
        }
      }

      // "completed the age of X years" (has reached X) — only a MIN when NOT
      // preceded by "not"/"should not have", which flips it to a MAX instead.
      if (result.min === null && !/\bnot\s+(?:have\s+)?completed\b/i.test(trimmed)) {
        const completedMin = trimmed.match(/\bcompleted\s+the\s+age\s+of\s+(\d{1,2})\s*years?/i);
        if (completedMin) {
          const val = parseInt(completedMin[1], 10);
          if (val >= 1 && val <= 100) {
            result.min = val;
            recordMatch(trimmed, 'min_completed');
            result.logs.push(`Matched age min (completed the age of X): ${val} from: "${trimmed}"`);
          }
        }
      }
    }

    // ── STANDALONE MAX (every boundary phrasing treated inclusive: ageMax = X) ─
    if (result.max === null) {
      const maxPatterns: RegExp[] = [
        /(?:age\s+.*?should\s+not\s+be\s+greater\s+than|maximum\s+age\s+(?:of|is)?|upper\s+age\s+limit\s+(?:of|is)?|should\s+not\s+exceed|should\s+not\s+exceed\s+age|not\s+be\s+greater\s+than)\s+(\d{1,2})\s*years?(?:\s*of\s*age)?/i,
        /(?:faculty|applicant|person)\s+above\s+(\d{1,2})\s*years?\s+of\s+age\s+is\s+not\s+eligible/i,
        /(?:should\s+be|must\s+be|is|are|age\s+should\s+be|age\s+is|applicant.{0,20}should\s+be)\s+(?:less\s+than|below|under)\s+(\d{1,2})\s*years?(?:\s*of\s*age)?/i,
        /\b(?:less\s+than|below|under)\s+(\d{1,2})\s*years?\s+of\s+age\b/i,
        /\bup\s*to\s+(\d{1,2})\s*years?\s+of\s+age\b/i,
      ];

      for (const pat of maxPatterns) {
        const m = trimmed.match(pat);
        if (m) {
          const val = parseInt(m[1], 10);
          if (val >= 1 && val <= 100) {
            result.max = val;
            recordMatch(trimmed, 'max');
            result.logs.push(`Matched age max: ${val} from: "${trimmed}"`);
            break;
          }
        }
      }

      // "should not have completed the age of X years" (hasn't turned X yet) —
      // inclusive convention applied: ageMax = X, same as every other ceiling.
      if (result.max === null && /\bnot\s+(?:have\s+)?completed\s+the\s+age\s+of\s+(\d{1,2})\s*years?/i.test(trimmed)) {
        const notCompleted = trimmed.match(/\bnot\s+(?:have\s+)?completed\s+the\s+age\s+of\s+(\d{1,2})\s*years?/i);
        if (notCompleted) {
          const val = parseInt(notCompleted[1], 10);
          if (val >= 1 && val <= 100) {
            result.max = val;
            recordMatch(trimmed, 'max_not_completed');
            result.logs.push(`Matched age max (not completed the age of X): ${val} from: "${trimmed}"`);
          }
        }
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Income Extraction
// ─────────────────────────────────────────────────────────────────────────────

export const SANITY_BOUND_ANNUAL_INCOME = 5000000; // ₹50,00,000 (50 Lakh)

/**
 * Extracts incomeMinAnnual and incomeMaxAnnual from eligibility sentences.
 * Adheres to:
 * - Annual normalization (explicit annual preferred over monthly * 12 when both exist)
 * - Multiple ceilings resolved to LOWER figure
 * - Sanity bound: > 50 lakh skipped and logged
 * - Non-income terms (turnover, project outlay, loan, capital) strictly ignored
 */
export function extractIncome(sentences: string[], schemeLink?: string): IncomeExtractionResult {
  const result: IncomeExtractionResult = {
    minAnnual: null,
    maxAnnual: null,
    matchedSentences: [],
    ruleMatched: null,
    skippedForSanity: [],
    multipleIncomesFound: false,
    candidatesConsidered: [],
    logs: [],
  };

  const candidates: IncomeCandidate[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // Must be an income context
    const hasIncomeKeyword = /\b(?:income|salary|earning|earnings|remuneration)\b/i.test(trimmed);
    if (!hasIncomeKeyword) {
      continue;
    }

    // Guard against company metrics being confused as personal income
    if (/\b(?:turnover|sales\s+turnover|project\s+outlay|project\s+cost|capital\s+expenditure|gross\s+block|net\s+worth)\b/i.test(trimmed)) {
      result.logs.push(`Ignored non-personal financial clause (turnover/outlay): "${trimmed}"`);
      continue;
    }

    // Ignore percentage clauses (e.g. "6 percent increase" in administrative notes)
    if (/\b(?:percent|percentage|%)\b/i.test(trimmed) && !/(?:₹|Rs\.?)/i.test(trimmed)) {
      continue;
    }

    // Special Case: Both monthly and explicit annual in the same sentence
    // e.g. SFAVA: "personal income ... must not exceed ₹4,000/- per month or an annual income of ₹48,000/-"
    const dualMonthlyAnnualMatch = trimmed.match(
      /(?:₹|Rs\.?)\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:\/-\s*)?(?:per\s+month|p\.m\.|monthly)[\s\S]*?(?:annual\s+income|per\s+annum|p\.a\.)[\s\S]*?(?:₹|Rs\.?)\s*([0-9,]+(?:\.[0-9]+)?)/i
    );

    if (dualMonthlyAnnualMatch) {
      const monthlyAmount = parseCurrencyAmount(dualMonthlyAnnualMatch[1]);
      const explicitAnnualAmount = parseCurrencyAmount(dualMonthlyAnnualMatch[2]);

      if (explicitAnnualAmount !== null) {
        const calculatedFromMonthly = monthlyAmount ? monthlyAmount * 12 : null;
        result.logs.push(
          `Detected both monthly (${monthlyAmount ? '₹' + monthlyAmount : 'unknown'}) and explicit annual (₹${explicitAnnualAmount}) in same sentence: "${trimmed}". Using explicit annual figure directly.`
        );
        if (calculatedFromMonthly !== null) {
          result.logs.push(
            `Comparison check: calculated monthly×12 = ₹${calculatedFromMonthly} vs explicit annual = ₹${explicitAnnualAmount} (Match: ${calculatedFromMonthly === explicitAnnualAmount})`
          );
        }

        candidates.push({
          valueAnnual: explicitAnnualAmount,
          type: 'max',
          sourceSentence: trimmed,
          sourceAmountRaw: dualMonthlyAnnualMatch[2],
          isMonthlyConverted: false,
          explicitAnnualPresent: true,
        });
        continue;
      }
    }

    // Standard Currency Extraction within Income sentences
    // Prioritized pattern:
    // 1. Currency symbol followed by comma-separated number: ₹ 2,00,000 or ₹10,000
    // 2. Currency symbol followed by decimal/int + lakh/crore: Rs. 3.50 lakh or ₹2 Lakh
    // 3. Currency symbol followed by plain int: ₹4000
    // 4. Number + lakh/crore without currency symbol: 2 lakh or 3.50 lakh
    // NOTE: this comma-group sub-pattern is a duplicate of the one in
    // parseCurrencyAmount() — the two must stay in sync. The `\s{0,2}` here
    // fixes the same real "₹2, 00,000" / "₹ 6, 500" spacing artifact fixed
    // there; fixing only parseCurrencyAmount's copy left this one (which runs
    // first, to even find a candidate substring in the sentence) still
    // failing to match those sentences at all, so parseCurrencyAmount's fix
    // never got a chance to run on them.
    const currencyPattern = /(?:(?:₹|Rs\.?|INR)\s*(?:[0-9]{1,3}(?:,\s{0,2}[0-9]{2,3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?\s*(?:lakhs?|lacs?|crores?)|[0-9]{3,}(?:\.[0-9]+)?)|[0-9]+(?:\.[0-9]+)?\s*(?:lakhs?|lacs?|crores?))\s*(?:\/-)?/gi;
    const matches = trimmed.match(currencyPattern);

    if (matches && matches.length > 0) {
      for (const rawMatch of matches) {
        // Exclude percentages
        if (rawMatch.includes('%')) continue;

        const parsedValue = parseCurrencyAmount(rawMatch);
        if (parsedValue === null || parsedValue === 0) continue;

        // Determine if monthly or annual
        const isMonthly = /\b(?:per\s+month|p\.m\.|monthly|\/month)\b/i.test(trimmed);
        const isAnnual = /\b(?:per\s+annum|p\.a\.|annual|annually|yearly|per\s+year|\/year|\/annum)\b/i.test(trimmed);

        let finalAnnual = parsedValue;
        let isMonthlyConverted = false;

        if (isMonthly) {
          finalAnnual = parsedValue * 12;
          isMonthlyConverted = true;
        } else if (!isAnnual) {
          if (/\b(?:annual|annually|year)\b/i.test(trimmed)) {
            finalAnnual = parsedValue;
          }
        }

        // Determine min vs max
        const isMin = /\b(?:above|more\s+than|exceeding|greater\s+than|at\s+least|minimum)\b/i.test(trimmed) &&
          !/\b(?:not\s+exceeding|should\s+not\s+be\s+greater\s+than|not\s+exceed)\b/i.test(trimmed);

        candidates.push({
          valueAnnual: finalAnnual,
          type: isMin ? 'min' : 'max',
          sourceSentence: trimmed,
          sourceAmountRaw: rawMatch.trim(),
          isMonthlyConverted,
          explicitAnnualPresent: !isMonthlyConverted && isAnnual,
        });
      }
    }
  }

  result.candidatesConsidered = candidates;

  // Process Max Income Candidates
  const maxCandidates = candidates.filter((c) => c.type === 'max');
  if (maxCandidates.length > 0) {
    const saneCandidates: IncomeCandidate[] = [];
    for (const cand of maxCandidates) {
      if (cand.valueAnnual > SANITY_BOUND_ANNUAL_INCOME) {
        result.skippedForSanity.push({
          amount: cand.valueAnnual,
          sentence: cand.sourceSentence,
          reason: `Parsed annual income ₹${cand.valueAnnual} exceeds sanity bound of ₹${SANITY_BOUND_ANNUAL_INCOME} (50 Lakh)`,
        });
        result.logs.push(
          `SKIPPED FOR SANITY: Annual income ₹${cand.valueAnnual} from "${cand.sourceSentence}" exceeded ₹50,00,000 limit.`
        );
      } else {
        saneCandidates.push(cand);
      }
    }

    if (saneCandidates.length === 1) {
      result.maxAnnual = saneCandidates[0].valueAnnual;
      result.matchedSentences.push(saneCandidates[0].sourceSentence);
      result.logs.push(`Extracted incomeMaxAnnual: ₹${result.maxAnnual} from: "${saneCandidates[0].sourceSentence}"`);
    } else if (saneCandidates.length > 1) {
      result.multipleIncomesFound = true;
      const uniqueValues = Array.from(new Set(saneCandidates.map((c) => c.valueAnnual))).sort((a, b) => a - b);
      if (uniqueValues.length > 1) {
        // Locked rule: Choose LOWER figure
        result.maxAnnual = uniqueValues[0];
        const chosen = saneCandidates.find((c) => c.valueAnnual === result.maxAnnual)!;
        result.matchedSentences.push(chosen.sourceSentence);
        result.logs.push(
          `Multiple distinct incomeMaxAnnual figures found: [${uniqueValues.map((v) => '₹' + v).join(', ')}]. Selected LOWER ceiling: ₹${result.maxAnnual} from "${chosen.sourceSentence}".`
        );
      } else {
        result.maxAnnual = uniqueValues[0];
        result.matchedSentences.push(saneCandidates[0].sourceSentence);
        result.logs.push(`Multiple duplicate income statements matched: ₹${result.maxAnnual}.`);
      }
    }
  }

  // Process Min Income Candidates
  const minCandidates = candidates.filter((c) => c.type === 'min');
  if (minCandidates.length > 0) {
    for (const cand of minCandidates) {
      if (cand.valueAnnual > SANITY_BOUND_ANNUAL_INCOME) {
        result.skippedForSanity.push({
          amount: cand.valueAnnual,
          sentence: cand.sourceSentence,
          reason: `Parsed min annual income ₹${cand.valueAnnual} exceeds sanity bound of ₹${SANITY_BOUND_ANNUAL_INCOME} (50 Lakh)`,
        });
      } else {
        result.minAnnual = cand.valueAnnual;
        if (!result.matchedSentences.includes(cand.sourceSentence)) {
          result.matchedSentences.push(cand.sourceSentence);
        }
        result.logs.push(`Extracted incomeMinAnnual: ₹${cand.valueAnnual} from: "${cand.sourceSentence}"`);
        break;
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheme-level Aggregator
// ─────────────────────────────────────────────────────────────────────────────

export function parseEligibilityForScheme(
  link: string,
  title: string,
  eligibilityRawText: string[]
): ParsedEligibility {
  const ageResult = extractAge(eligibilityRawText);
  const incomeResult = extractIncome(eligibilityRawText, link);

  const hasAnyCriteria =
    ageResult.min !== null ||
    ageResult.max !== null ||
    incomeResult.minAnnual !== null ||
    incomeResult.maxAnnual !== null;

  const logs = [...ageResult.logs, ...incomeResult.logs];

  return {
    ageMin: ageResult.min,
    ageMax: ageResult.max,
    incomeMinAnnual: incomeResult.minAnnual,
    incomeMaxAnnual: incomeResult.maxAnnual,
    hasAnyCriteria,
    ageResult,
    incomeResult,
    logs,
  };
}
