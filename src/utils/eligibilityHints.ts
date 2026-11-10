/**
 * Words the "What would change my eligibility" hints from POST /api/eligibility/report in the reader's language.
 * The backend sends them structured (backend/src/utils/criteriaMatch.ts, eligibilityHints) so no English sentence
 * has to be translated on the fly. Fixed facts (gender, category, state, area, land) are stated plainly, never
 * suggested as something to change.
 */
import type { TRANSLATIONS } from '../constants/translations';

type Key = keyof typeof TRANSLATIONS['en'];
type T = (key: Key) => string;

export type HintField = 'age' | 'income' | 'gender' | 'category' | 'state' | 'land' | 'residence';

export type EligibilityHint =
  | { kind: 'add'; field: HintField }
  | { kind: 'ageMin' | 'ageMax' | 'incomeMin' | 'incomeMax'; limit: number; yours: number }
  | { kind: 'only'; field: Exclude<HintField, 'age' | 'income'>; values: string[] }
  | { kind: 'occupation'; values: string[] };

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const fill = (text: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), text);

/** A stored value in the reader's language; unknown values (and state names) are shown as they are. */
function valueWord(t: T, prefix: 'ehV_' | 'ehO_', value: string): string {
  const key = `${prefix}${value}` as Key;
  const word = t(key);
  return word === key ? value : word;
}

const list = (t: T, words: string[]) => words.join(t('ehOr'));

/** One hint as a sentence, or null for a kind this version of the app doesn't know (a newer backend). */
export function hintText(hint: EligibilityHint, t: T): string | null {
  switch (hint.kind) {
    case 'add':
      return fill(t('ehAdd'), { field: t(`ehF_${hint.field}` as Key) });
    case 'ageMin':
      return fill(t('ehAgeMin'), { limit: hint.limit, yours: hint.yours });
    case 'ageMax':
      return fill(t('ehAgeMax'), { limit: hint.limit, yours: hint.yours });
    case 'incomeMin':
      return fill(t('ehIncomeMin'), { limit: rupees(hint.limit), yours: rupees(hint.yours) });
    case 'incomeMax':
      return fill(t('ehIncomeMax'), { limit: rupees(hint.limit), yours: rupees(hint.yours) });
    case 'occupation':
      return fill(t('ehOccupation'), { values: list(t, hint.values.map((v) => valueWord(t, 'ehO_', v))) });
    case 'only':
      switch (hint.field) {
        case 'land':
          return t(hint.values[0] === 'yes' ? 'ehLandYes' : 'ehLandNo');
        case 'state':
          return fill(t('ehOnlyState'), { values: list(t, hint.values) });
        case 'gender':
          return fill(t('ehOnlyGender'), { values: list(t, hint.values.map((v) => valueWord(t, 'ehV_', v))) });
        case 'category':
          return fill(t('ehOnlyCategory'), { values: list(t, hint.values.map((v) => valueWord(t, 'ehV_', v))) });
        case 'residence':
          return fill(t('ehOnlyResidence'), { values: list(t, hint.values.map((v) => valueWord(t, 'ehV_', v))) });
      }
  }
  return null;
}
