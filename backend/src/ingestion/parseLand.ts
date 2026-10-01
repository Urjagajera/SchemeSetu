/**
 * parseLand.ts
 * Pure, testable extraction of a LAND OWNERSHIP requirement from Scheme.eligibilityRawText.
 * Sibling of parseState.ts / parseDemographics.ts. The result goes into EligibilityCriteria.landOwnership,
 * which the engine compares with the profile's land answer ("yes" / "no").
 *
 * Locked design rules (the same ones as the other parsers):
 * 1. PRECISION OVER RECALL. A mismatch drops the scheme, so only an explicit gate on the applicant counts.
 * 2. "yes" means the applicant OWNS agricultural land: "must own cultivable land", "must be a landholding
 *    farmer", "should have ownership of the land". It does NOT mean "has some land": a sentence that also allows
 *    leased, rented, tenant or allotted land ("own or lease") is not a gate, and neither is a plot or premises for a
 *    business, a house site, an office or a project, or land held by a group or organisation.
 * 3. "no" means the applicant must be landless: "The applicant should be landless", "part of a rural landless
 *    household", "does not own any land". "Landless" as one group in a list ("small farmers, landless people,
 *    pastoralists") or as an occupation ("landless agricultural labourer") is not a gate.
 * 4. A land size or area limit on its own does not say whether the land is owned or leased, so it does not count.
 * 5. Separate sentences are separate requirements; "yes" in one and "no" in another is a conflict -> null.
 * 6. Land-record paperwork ("name must be registered in the land records") is evidence, not the rule: ignored.
 */
import { splitIntoSentences } from './sentences.js';

export type LandRequirement = 'yes' | 'no';

export interface RejectedMention {
  sentence: string;
  reason: string;
}

export interface LandExtractionResult {
  /** "yes" | "no", or null when there is no (safe) requirement. */
  value: LandRequirement | null;
  matchedSentences: string[];
  rejected: RejectedMention[];
  nullReason: string | null;
}

const GATE_CONTEXT = /\b(must|should|shall|has to|have to|needs? to|required to|is eligible|are eligible|eligible|only|mandatory|compulsory|essential)\b/i;
const NOT_A_GATE = /(relax|priorit|prefer|reserv|quota|concession|special focus|extra |additional|per cent|\d\s*%|assistance (?:of|will|up)|subsid|incentive|grant of|bonus|weightage)/i;
const SEGMENT_HEADING = /:\s*$/;

/** Another way to be eligible: land that is not owned. */
const NOT_OWNED =
  /\b(?:leas(?:e|ed|es|ing|or)|lessee|rent(?:ed|s|al|ing)?|tenan\w*|sharecropp\w*|permission|allot\w*|encroach\w*|government land|common land|panchayat land)\b/i;
/** Land for something other than farming by the applicant: a business plot, a house site, an office. */
const PREMISES =
  /\b(office|premises|plot|site|building|factory|unit|shop|godown|warehouse|industrial|estate|park|house site|housing|house|construction|colony|project|hotel|resort|school|college|hospital|plant|depot|logistics|business|enterprise|shed|museum|situated|proposed to be (?:set up|constructed|established|built))\b|\bsq\.? ?(?:ft|feet|yards?|m)\b|\bsquare (?:feet|foot|yards?|met(?:re|er)s?)\b/i;
/** Land held by a group or organisation, not the applicant themselves. */
const GROUP = /\b(group|groups|collectively|organi[sz]ations?|societ(?:y|ies)|cooperatives?|compan(?:y|ies)|FPOs?|SHGs?|institutions?|panchayats?|trusts?|NGOs?|consortium|associations?|farmer producer)\b/i;

const OWN_LAND =
  /\b(?:own(?:s|ed|ing)?|owners? of|legal owner of|ownership of|title (?:of|to))\s+(?:(?:the|their|his\/her|his|her|its|a|an|any|some|such|agricultural|agriculture|cultivable|farm|arable|private|own)\s+){0,4}land\b/i;
/** "must own at least 2 bighas of cultivable agricultural land": farming-land wording within a few words of "own". */
const OWN_FARM_LAND = /\bown(?:s|ed|ing)?\b[^.;]{0,50}\b(?:agricultural|agriculture|cultivable|farm|arable)\s+land\b/i;
/** "The agricultural land should be owned by the applicant". */
const LAND_OWNED_BY_APPLICANT = /\bland\b[^.;]{0,30}\b(?:should|must|shall) be owned by (?:the |a )?(?:applicant|beneficiary|farmer)\b/i;
const HOLDER = /\b(?:land ?holding farmers?|land ?holders?|land ?owners?)\b/i;
const HAS_LANDHOLDING = /\b(?:have|having|possess\w*|hold\w*)\s+(?:a\s+|an\s+|the\s+)?(?:cultivable\s+|agricultural\s+|operational\s+)?land ?holding\b/i;
/** "The applicant must be a landholding farmer, marginal farmer, small farmer, ...": a landholder is one of several groups. */
const LIST_OF_GROUPS =
  /\b(?:land ?holding farmers?|land ?holders?|land ?owners?)\b[^.]*,[^.]*\b(?:marginal|small|fish|livestock|BPL|labou?rers?|workers?|artisans?|tenant|sharecropper)\b|\b(?:marginal|small|fish|livestock|BPL|labou?rers?|workers?|artisans?)\b[^.]*,[^.]*\b(?:land ?holding farmers?|land ?holders?)\b/i;

const NOT_OWN =
  /\b(?:(?:do(?:es)?|should|must|shall|will|may|can)\s+not|don't|never)\s+(?:currently\s+)?(?:own|possess|have)\s+(?:any\s+)?(?:agricultural\s+|cultivable\s+)?land\b|\bneither\b[^.]{0,80}\bnor\b[^.]{0,80}\bown\b[^.]{0,30}\bland\b/i;

/** "If the applicant constructs on his own land...", "where infrastructure is required": a condition, not a requirement. */
const CONDITIONAL = /^\s*if\b|\bif (?:the |a |an )?(?:applicant|beneficiary|farmer|land ?owner)\b|\bunless\b|\bin case\b|\bwhere\b[^.]{0,60}\b(?:required|needed|necessary)\b/i;
/** "The applicant should be a farmer or landowner": owning is one way in, not the rule. */
const ALT_OWNER = /\b(?:farmers?|cultivators?|tenants?|growers?|workers?)\s+or\s+(?:a\s+)?land ?owners?\b|\bland ?owners?\s+or\s+(?:a\s+)?(?:farmers?|cultivators?|tenants?|lessee)\b/i;
/** A land-holder certificate, a declaration, an attested copy: paperwork about land, not the rule. */
const LAND_PAPERWORK = /\bland ?holder certificate\b|\b(?:attach\w*|declaration|photocopy|attested|submit\w*|furnish\w*)\b/i;
/** The profile asks "Own Cultivable Land?": a "yes" gate has to be about farming land. */
const FARMING = /\b(?:farm\w*|agricultur\w*|cultivat\w*|cultivabl\w*|crop\w*|horticultur\w*|orchard\w*|plantation\w*|kisan|ryot|arable)\b/i;
const LANDLESS_GATE =
  /\b(?:applicant|beneficiar\w+|famil\w+|household|person|individual)s?\b[^.;]{0,40}\b(?:should|must|shall|has to|have to|needs? to|will)\s+be\s+(?:a\s+|an\s+|the\s+)?(?:rural\s+|poor\s+)?landless\b(?!\s+(?:agricultur|labou?r|worker|farmer|people|person|artisan|peasant))/i;
const LANDLESS_HOUSEHOLD = /\bpart of an?\s+(?:rural\s+)?landless\s+household\b/i;
/** "landless" sitting in a comma list or next to "or": one group among several. */
const LANDLESS_IN_LIST = /landless[^.]*(?:,|\bor\b)|(?:,|\bor\b)[^.]*landless/i;

interface Decision {
  value: LandRequirement | null;
  reject: string | null;
}

function decide(sentence: string, schemeIsAboutFarming: boolean): Decision {
  const mentionsLand = /\bland|landless|landhold|landown/i.test(sentence);
  if (!mentionsLand) return { value: null, reject: null };

  const yesForm =
    OWN_LAND.test(sentence) || OWN_FARM_LAND.test(sentence) || LAND_OWNED_BY_APPLICANT.test(sentence) || HOLDER.test(sentence) || HAS_LANDHOLDING.test(sentence);
  const noForm = LANDLESS_GATE.test(sentence) || LANDLESS_HOUSEHOLD.test(sentence) || NOT_OWN.test(sentence);
  if (!yesForm && !noForm) return { value: null, reject: null }; // land is mentioned but not as ownership: paperwork, size, premises...

  if (SEGMENT_HEADING.test(sentence)) return { value: null, reject: 'heading that introduces a list or segment, not a rule' };
  if (NOT_A_GATE.test(sentence)) return { value: null, reject: 'relaxation / preference / benefit tier, not a gate' };
  if (CONDITIONAL.test(sentence)) return { value: null, reject: 'a condition ("if ...", "where ... is required"), not a requirement on every applicant' };

  // "does not own land" also looks like an ownership phrase: the negation decides which one it is.
  if (noForm) {
    if (LANDLESS_IN_LIST.test(sentence) && !LANDLESS_HOUSEHOLD.test(sentence)) return { value: null, reject: '"landless" is one group in a list, not a requirement' };
    // "The applicant does not own any land" is a condition on the applicant even without a modal verb.
    const plainCondition = NOT_OWN.test(sentence) && /^(?:the\s+)?(?:applicant|beneficiary|family|household)\b/i.test(sentence);
    if (!GATE_CONTEXT.test(sentence) && !LANDLESS_HOUSEHOLD.test(sentence) && !plainCondition) {
      return { value: null, reject: 'mentions landlessness but is not phrased as an eligibility rule' };
    }
    return { value: 'no', reject: null };
  }

  if (NOT_OWNED.test(sentence)) return { value: null, reject: 'leased / rented / allotted land also allowed: ownership is not required' };
  if (ALT_OWNER.test(sentence)) return { value: null, reject: 'owning land is one of the ways to qualify ("farmer or landowner"), not the rule' };
  if (LAND_PAPERWORK.test(sentence)) return { value: null, reject: 'land paperwork (certificate / declaration / copy), not the rule itself' };
  if (GROUP.test(sentence)) return { value: null, reject: 'land held by a group or organisation, not the applicant' };
  if (PREMISES.test(sentence)) return { value: null, reject: 'land for a business, house site or premises, not farming land' };
  if (LIST_OF_GROUPS.test(sentence)) return { value: null, reject: 'landholder is one of several groups that may apply' };
  if (/\blandless\b/i.test(sentence)) return { value: null, reject: 'landless people are also mentioned: ownership is not required' };
  if (!GATE_CONTEXT.test(sentence)) return { value: null, reject: 'mentions ownership but is not phrased as an eligibility rule' };
  // The profile asks "Own Cultivable Land?". A rule about owning "land" for a house, a shop or a museum must not
  // exclude someone who simply has no farming land, so a "yes" needs farming wording in the sentence or the scheme.
  if (!FARMING.test(sentence) && !schemeIsAboutFarming) return { value: null, reject: 'ownership of land that is not clearly farming land (the profile asks about cultivable land)' };
  return { value: 'yes', reject: null };
}

export function extractLand(sentences: string[]): LandExtractionResult {
  const result: LandExtractionResult = { value: null, matchedSentences: [], rejected: [], nullReason: null };
  const yes: string[] = [];
  const no: string[] = [];

  const all = splitIntoSentences(sentences);
  const schemeIsAboutFarming = all.some((s) => FARMING.test(s));
  for (const sentence of all) {
    const d = decide(sentence, schemeIsAboutFarming);
    if (d.reject) {
      result.rejected.push({ sentence, reason: d.reject });
      continue;
    }
    if (d.value === 'yes') yes.push(sentence);
    if (d.value === 'no') no.push(sentence);
  }

  if (yes.length > 0 && no.length > 0) {
    result.nullReason = 'one sentence requires owning land and another requires being landless';
    return result;
  }
  if (yes.length > 0) {
    result.value = 'yes';
    result.matchedSentences = yes;
  } else if (no.length > 0) {
    result.value = 'no';
    result.matchedSentences = no;
  }
  return result;
}
