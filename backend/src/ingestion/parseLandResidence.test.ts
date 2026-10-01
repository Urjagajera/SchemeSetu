import { describe, it, expect } from 'vitest';
import { extractLand } from './parseLand.js';
import { extractResidence } from './parseResidence.js';

// Every sentence below is real text from Scheme.eligibilityRawText.

describe('extractLand: "yes" (the applicant owns farming land)', () => {
  const yes = (s: string) => extractLand([s]).value;

  it('explicit ownership', () => {
    expect(yes('The applicant must own cultivable land (up to 2 acres).')).toBe('yes');
    expect(extractLand(['The applicant should be a farmer.', 'The applicant should have ownership of the land at least for 2 years and a clear ownership title deed in his/her name.']).value).toBe('yes');
    expect(extractLand(['The applicant must be a farmer.', 'The applicant must have their own land.']).value).toBe('yes');
  });

  it('a landholder / landowner', () => {
    expect(yes('The applicant should have cultivable landholding up to 2 hectares as per State or Union Territory land records.')).toBe('yes');
    expect(yes('The applicant must be a landholding farmer.')).toBe('yes');
    expect(yes('The farmer must own agricultural land in the state and be actively engaged in farming activities.')).toBe('yes');
  });
});

describe('extractLand: sentences that are NOT a land-ownership gate', () => {
  const nothing = (s: string) => {
    const r = extractLand([s]);
    expect(r.value, s).toBeNull();
    return r;
  };

  it('own OR lease: ownership is not required', () => {
    nothing('The farmer must either own agricultural land or have land on lease.');
    nothing('The farmer must either legally own agricultural land or have leased land for a minimum period of 10 years.');
    nothing('The beneficiaries should have their own land in their premises or rented land on long term lease.');
    nothing('The applicant should be a bonafide farmer engaged in Agriculture, possessing own or leased land of at least 0.2 (hectares) or more.');
    nothing('The applicant should be a private landowner or lessee in Chaur-dominated districts.');
  });

  it('land for a business, a house site, an office or a project', () => {
    nothing('The applicant should have own/ leased land, adequate to set up an ornamental unit.');
    nothing('The applicant must own a business unit in Goa and provide Logistics And Warehousing services in Goa.');
    nothing('The applicant must have their own office of at least 250 sq.ft. equipped with a telephone or mobile connection.');
    nothing('The applicant should have a house site of an area of 450 sq.ft to build the house.');
    nothing('For establishing a private industrial estate/area/park, it is mandatory to have at least 30 acres of land in plain areas.');
  });

  it('land held by a group', () => {
    nothing('For community applications, a group comprising 10 or more farmers must collectively own a minimum of 5 hectares of land.');
    nothing('The applicant must be a landholding farmer or a farmer group');
  });

  it('a landholder as one of several groups', () => {
    nothing('The applicant must be a landholding farmer, marginal farmer, small farmer, fish farmer, livestock owner, BPL beneficiary, unorganized worker card holder, or registered worker.');
  });

  it('land-record paperwork and plain land sizes', () => {
    nothing('The farmer’s name must be duly registered in the relevant land records.');
    nothing('The applicant must ensure that the land is free from legal disputes and must provide a valid land title.');
    nothing('The beneficiary farmer should have minimum 1 acre Agricultural land.');
  });

  it('benefit tiers and preferences', () => {
    nothing('Preference will be given to farmers who own land.');
  });
});

describe('extractLand: "no" (the applicant is landless)', () => {
  const no = (s: string) => extractLand([s]).value;

  it('landless as a requirement', () => {
    expect(no('The applicant should be landless.')).toBe('no');
    expect(no('The applicant must be landless and houseless.')).toBe('no');
    expect(no('The family of the applicant should be landless.')).toBe('no');
    expect(no('The applicant should be part of a rural landless household.')).toBe('no');
    expect(no('The applicant does not own any agricultural land.')).toBe('no');
  });

  it('landless as one group among several is not a requirement', () => {
    expect(no('The applicant must be a livestock farmer, which includes agricultural laborers, small and marginal farmers, landless people, Maldhari (pastoralists), and educated unemployed individuals.')).toBeNull();
    expect(no('The applicant should be farmer or a landless agricultural labour.')).toBeNull();
    expect(no('The applicant should be a landless agricultural laborer.')).toBeNull();
  });
});

describe('extractLand: several sentences', () => {
  it('a yes and a no conflict', () => {
    const r = extractLand(['The applicant must own cultivable land.', 'The applicant should be landless.']);
    expect(r.value).toBeNull();
    expect(r.nullReason).toMatch(/requires owning land and another/);
  });

  it('two yes sentences agree', () => {
    expect(extractLand(['The applicant must own cultivable land.', 'The applicant should be a landholding farmer.']).value).toBe('yes');
  });
});

describe('extractResidence: rural / urban', () => {
  const area = (s: string) => extractResidence([s]).value;

  it('residing in or from an area', () => {
    expect(area('The applicant should be residing in a rural area.')).toBe('rural');
    expect(area('The applicant must be a resident of an urban area in Uttarakhand.')).toBe('urban');
    expect(area('The applicant should be a resident of rural areas within the specified districts.')).toBe('rural');
    expect(area('The applicant should be from a rural area.')).toBe('rural');
    expect(area('The applicant should be from an urban area.')).toBe('urban');
    expect(area('The applicant should be part of a rural landless household.')).toBe('rural');
    expect(area('The applicant should be from a rural household that lacked a toilet before the scheme.')).toBe('rural');
  });

  it('an income ceiling that differs by area is not a gate', () => {
    for (const s of [
      'The applicant must have an annual income not exceeding ₹1,50,000/- (One Lakh Fifty Thousand Rupees), if residing in urban areas.',
      'If the applicant resides in an urban area, his/her total household income should be less than ₹50,000.',
      "The applicant's annual family income should not exceed ₹98,000/- (Rural Area) and ₹1,20,000/- (Urban Area).",
      'Those differently-abled persons whose annual income does not exceed (₹20,000/- in Rural areas and ₹22,375/- in Urban areas) shall be eligible for financial assistance.',
    ]) {
      expect(area(s), s).toBeNull();
    }
  });

  it('open to both', () => {
    expect(area("The applicant's annual family income should not exceed ₹3,00,000/- in both rural and urban areas.")).toBeNull();
    expect(area('All horticulture growers of rural & urban areas are eligible.')).toBeNull();
    expect(area('The applicant must be a native resident of the rural or urban local body of the concerned district of Madhya Pradesh.')).toBeNull();
  });

  it('a place of work or study, or paperwork', () => {
    expect(area('The students claiming the benefit of rural area must submit the rural area school certificate of passing 11th and 12th class from the rural area school duly signed by the Principal of the school.')).toBeNull();
    expect(area('The unit should be located in a rural area.')).toBeNull();
  });

  it('wording that is not about the applicant', () => {
    expect(area('Rural Beneficiaries')).toBeNull();
    expect(area('This benefit is applicable only to villages located within a 2-kilometer radius of the trekking traction center.')).toBeNull();
  });

  it('a rural and an urban requirement conflict', () => {
    const r = extractResidence(['The applicant should be residing in a rural area.', 'The applicant must be a resident of an urban area.']);
    expect(r.value).toBeNull();
    expect(r.nullReason).toMatch(/rural residence and another an urban/);
  });
});

describe('extractLand: fixes from the dry-run review', () => {
  const land = (...sentences: string[]) => extractLand(sentences).value;

  it('the profile asks about CULTIVABLE land, so owning "land" for something else is not a gate', () => {
    expect(land('All landowners in the Haridwar district of Uttarakhand are eligible.')).toBeNull();
    expect(land('The applicant should own the land where the museum is situated or proposed to be constructed.')).toBeNull();
    expect(land('The applicant must have their own land of 1000 to 1200 square feet area.')).toBeNull();
    expect(land('The applicant should have his/her own land')).toBeNull();
  });

  it('plain "own land" counts when the scheme is about farming', () => {
    expect(land('The applicant should be a farmer.', 'The applicant should own a land.')).toBe('yes');
  });

  it('"should not own" and "neither ... nor" are landless requirements, not ownership', () => {
    expect(land('The applicant’s family should not own any agricultural land.')).toBe('no');
    expect(land('Neither the applicant nor any member of his family should own agricultural land.')).toBe('no');
  });

  it('conditions are not requirements', () => {
    expect(land('If the applicant does not have agricultural land, they should have at least 20 cattle.')).toBeNull();
    expect(land('If the applicant constructs on his own land, he will have to submit proof that the title of his land is cleared.')).toBeNull();
    expect(land('The applicant should ensure ownership of land free from litigation (where infrastructure is required).')).toBeNull();
    expect(land('If land is required for implementing the scheme, the applicant must either be the owner of the land or, if the land is in the name of a close relative, the mortgage of the land will be acceptable.')).toBeNull();
  });

  it('a landholder certificate, a declaration and "farmer or landowner" are not the rule', () => {
    expect(land('The applicant should be eligible to obtain a landholder certificate in the village population.')).toBeNull();
    expect(land('The applicant (Landowner) must attach a declaration regarding land title/possession, including an attested photocopy of the latest land records (Khasra).')).toBeNull();
    expect(land('The applicant should be a farmer or landowner.')).toBeNull();
  });
});

describe('second round of review fixes', () => {
  it('residence: "residing in rural Odisha", a bare rule line, and a paperwork clause after the rule', () => {
    expect(extractResidence(['The applicant household must be residing in rural Odisha and must be houseless or living in a kutcha house.']).value).toBe('rural');
    expect(extractResidence(['Reside in a rural area']).value).toBe('rural');
    expect(extractResidence(['The girl must reside in a rural area and possess a "Gaon Ki Beti" (Daughter of the Village) certificate.']).value).toBe('rural');
  });

  it('residence: a certificate BEFORE the rule is still paperwork, and an income ceiling is still not a gate', () => {
    expect(extractResidence(['The students claiming the benefit of rural area must submit the rural area school certificate of passing 11th and 12th class.']).value).toBeNull();
    expect(extractResidence(['If the applicant resides in a rural area, his/her total household income should be less than ₹40,000.']).value).toBeNull();
  });

  it('land: farming land owned, in two more phrasings', () => {
    expect(extractLand(['Applicants must own at least 2 bighas of cultivable agricultural land.']).value).toBe('yes');
    expect(extractLand(['The agricultural land should be owned by the applicant.']).value).toBe('yes');
  });

  it('land: still not a gate when leased land is allowed or the land is a plot', () => {
    expect(extractLand(['The applicant must own land or have land on lease.']).value).toBeNull();
    expect(extractLand(['The applicant must have a legally owned plot of land or an existing kutcha residential structure.']).value).toBeNull();
  });
});
