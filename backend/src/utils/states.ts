/**
 * The 28 states and 8 union territories of India, spelled exactly as the scheme data spells them
 * (the authority name of a state-level scheme IS its state, e.g. authorityName "Gujarat").
 *
 * This is the single list the app uses for the Search state filter, the profile form's state dropdown and
 * the guest eligibility wizard (GET /api/schemes/states), and the single definition of what counts as a
 * "State" scheme (utils/schemeLevel.ts). Any other authority (ministries, departments, NITI Aayog, the
 * Lokpal, the CAG...) is a central body.
 */
export const INDIAN_STATES_AND_UTS: readonly string[] = [
  // States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

/** Lower-case, trimmed, single-spaced, "&" read as "and": "  dadra &  nagar haveli and daman and diu " matches. */
const key = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\s*&\s*/g, ' and ');

const BY_KEY = new Map(INDIAN_STATES_AND_UTS.map((name) => [key(name), name]));

/** The canonical spelling of a state/UT name, or null if it is not one (or is blank). */
export function canonicalState(input: unknown): string | null {
  if (typeof input !== 'string' || input.trim() === '') return null;
  return BY_KEY.get(key(input)) ?? null;
}

export const isStateName = (input: unknown): boolean => canonicalState(input) !== null;
