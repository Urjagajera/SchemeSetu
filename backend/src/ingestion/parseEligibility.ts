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

  // Match comma-separated numbers first: e.g. "2,00,000" or "48,000" or "10,000"
  const commaMatch = cleaned.match(/[0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]+)?/);
  if (commaMatch) {
    const sanitized = commaMatch[0].replace(/,/g, '');
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
 */
export function extractAge(sentences: string[]): AgeExtractionResult {
  const result: AgeExtractionResult = {
    min: null,
    max: null,
    matchedSentences: [],
    ruleMatched: null,
    logs: [],
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

    // Pattern 1: Age range between X and Y
    // e.g. "aged between 18 years (completed) and 70 years (age nearer birthday)"
    // e.g. "between 18 and 58 years of age"
    // e.g. "The age limit of the applicant should be between 18 and 55 years."
    const rangeBetweenMatch = trimmed.match(
      /(?:(?:aged?|applicant\s+should\s+be|age\s+limit\s+.*?should\s+be)\s+between|in\s+the\s+age\s+group\s+of)\s+(\d{1,2})\s*(?:years?)?(?:\s*\([^\)]+\))?\s*(?:and|to|-)\s*(\d{1,2})\s*years?(?:\s*of\s*age)?/i
    );
    if (rangeBetweenMatch) {
      const min = parseInt(rangeBetweenMatch[1], 10);
      const max = parseInt(rangeBetweenMatch[2], 10);
      if (min >= 1 && min <= 100 && max >= min && max <= 100) {
        result.min = min;
        result.max = max;
        result.matchedSentences.push(trimmed);
        result.ruleMatched = 'range_between';
        result.logs.push(`Matched age range: ${min}-${max} from: "${trimmed}"`);
        return result;
      }
    }

    // Pattern 2: "above X years and below Y years of age"
    // e.g. "She/he should be above 20 years and below 35 years of age"
    const rangeAboveBelowMatch = trimmed.match(
      /(?:above|at\s+least)\s+(\d{1,2})\s*years?(?:\s*of\s*age)?\s*and\s*(?:below|under)\s+(\d{1,2})\s*years?(?:\s*of\s*age)?/i
    );
    if (rangeAboveBelowMatch) {
      const min = parseInt(rangeAboveBelowMatch[1], 10);
      const max = parseInt(rangeAboveBelowMatch[2], 10);
      if (min >= 1 && min <= 100 && max >= min && max <= 100) {
        result.min = min;
        result.max = max;
        result.matchedSentences.push(trimmed);
        result.ruleMatched = 'range_above_below';
        result.logs.push(`Matched age range (above-below): ${min}-${max} from: "${trimmed}"`);
        return result;
      }
    }

    // Pattern 3: "minimum age ... is X years and maximum is Y years"
    // e.g. "The minimum age of joining APY is 18 years and maximum is 40 years."
    const minMaxMatch = trimmed.match(
      /minimum\s+age(?:\s+of\s+joining(?:\s+[A-Z]+)?|\s+limit)?\s+is\s+(\d{1,2})\s*years?\s+and\s+maximum\s+(?:is)?\s+(\d{1,2})\s*years?/i
    );
    if (minMaxMatch) {
      const min = parseInt(minMaxMatch[1], 10);
      const max = parseInt(minMaxMatch[2], 10);
      if (min >= 1 && min <= 100 && max >= min && max <= 100) {
        result.min = min;
        result.max = max;
        result.matchedSentences.push(trimmed);
        result.ruleMatched = 'min_max_phrase';
        result.logs.push(`Matched age min-max phrase: ${min}-${max} from: "${trimmed}"`);
        return result;
      }
    }

    // Pattern 4: Standalone Minimum Age
    // e.g. "The age of the applicant must be at least 18 years."
    // e.g. "The applicant should not be less than 60 (sixty) years of age"
    // e.g. "The applicant should be 21 years of age or above."
    // e.g. "The applicant should be above 18 years of age"
    if (result.min === null) {
      const minMatch1 = trimmed.match(
        /(?:age\s+.*?must\s+be\s+at\s+least|minimum\s+age\s+(?:of|is)?|should\s+not\s+be\s+less\s+than)\s+(\d{1,2})(?:\s*\([a-z]+\))?\s*years?(?:\s*of\s*age)?/i
      );
      if (minMatch1) {
        const val = parseInt(minMatch1[1], 10);
        if (val >= 1 && val <= 100) {
          result.min = val;
          result.matchedSentences.push(trimmed);
          result.ruleMatched = (result.ruleMatched ? result.ruleMatched + '+min' : 'min_only');
          result.logs.push(`Matched age min: ${val} from: "${trimmed}"`);
        }
      } else {
        const minMatch2 = trimmed.match(
          /(?:applicant\s+should\s+be|should\s+be|must\s+be)\s+(\d{1,2})\s*years?(?:\s*of\s*age)?\s*(?:or\s+above|and\s+above|\+)/i
        );
        if (minMatch2) {
          const val = parseInt(minMatch2[1], 10);
          if (val >= 1 && val <= 100) {
            result.min = val;
            result.matchedSentences.push(trimmed);
            result.ruleMatched = (result.ruleMatched ? result.ruleMatched + '+min' : 'min_only');
            result.logs.push(`Matched age min (or above): ${val} from: "${trimmed}"`);
          }
        } else {
          const minMatch3 = trimmed.match(
            /(?:applicant\s+should\s+be|should\s+be|must\s+be)\s+above\s+(\d{1,2})\s*years?\s+of\s+age/i
          );
          if (minMatch3) {
            const val = parseInt(minMatch3[1], 10);
            if (val >= 1 && val <= 100) {
              result.min = val;
              result.matchedSentences.push(trimmed);
              result.ruleMatched = (result.ruleMatched ? result.ruleMatched + '+min' : 'min_only');
              result.logs.push(`Matched age min (above X): ${val} from: "${trimmed}"`);
            }
          }
        }
      }
    }

    // Pattern 5: Standalone Maximum Age
    // e.g. "The age of the applicant should not be greater than 50 years."
    // e.g. "Faculty above 50 years of age is not eligible" -> max = 50
    // e.g. "upper age limit is 45 years"
    if (result.max === null) {
      const maxMatch1 = trimmed.match(
        /(?:age\s+.*?should\s+not\s+be\s+greater\s+than|maximum\s+age\s+(?:of|is)?|upper\s+age\s+limit\s+(?:of|is)?|should\s+not\s+exceed)\s+(\d{1,2})\s*years?(?:\s*of\s*age)?/i
      );
      if (maxMatch1) {
        const val = parseInt(maxMatch1[1], 10);
        if (val >= 1 && val <= 100) {
          result.max = val;
          if (!result.matchedSentences.includes(trimmed)) result.matchedSentences.push(trimmed);
          result.ruleMatched = (result.ruleMatched ? result.ruleMatched + '+max' : 'max_only');
          result.logs.push(`Matched age max: ${val} from: "${trimmed}"`);
        }
      } else {
        const maxMatch2 = trimmed.match(
          /(?:faculty|applicant|person)\s+above\s+(\d{1,2})\s*years?\s+of\s+age\s+is\s+not\s+eligible/i
        );
        if (maxMatch2) {
          const val = parseInt(maxMatch2[1], 10);
          if (val >= 1 && val <= 100) {
            result.max = val;
            if (!result.matchedSentences.includes(trimmed)) result.matchedSentences.push(trimmed);
            result.ruleMatched = (result.ruleMatched ? result.ruleMatched + '+max' : 'max_only');
            result.logs.push(`Matched age max (exclusion clause): ${val} from: "${trimmed}"`);
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
    const currencyPattern = /(?:(?:₹|Rs\.?|INR)\s*(?:[0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?\s*(?:lakhs?|lacs?|crores?)|[0-9]{3,}(?:\.[0-9]+)?)|[0-9]+(?:\.[0-9]+)?\s*(?:lakhs?|lacs?|crores?))\s*(?:\/-)?/gi;
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
