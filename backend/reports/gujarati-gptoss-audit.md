# Gujarati audit with gpt-oss-120b alone: review sheet

Generated 2026-10-04. Gujarati is switched OFF; nothing here is live.

## What was done
- The same 50 schemes (same seed) and the same lines as the first Gujarati audit, which used Qwen3.8-27B. The English source lines are identical.
- Titles, and up to the first 4 eligibility and 4 benefits lines per scheme (15-700 characters each). Longer text (descriptions, application steps) was NOT audited.
- Translator: gpt-oss-120b only, no fallback model, through the real translator and validators.
- Back-translation to English: Qwen3.8-27B (a different model family), told to be literal.
- Judging: by Claude, reading the Gujarati against the English. Claude is not a certified Gujarati reader and reads Gujarati less reliably than Hindi, so treat every verdict as a claim to check and expect subtle errors (grammar, register) to have been missed.

## Your job (about 30 minutes)
For each item mark OK, small problem, or wrong meaning (a reader could be misled). Sections 1 and 2: is Claude's note right? Section 3: is a line that looked fine really fine?

## Section 1: 3 items judged WRONG MEANING

**20. Tenzing Norgay National Adventure Award** (Benefits)
- EN: The Awardees will be reimbursed to and fro airfare (economy class) and such other fare of conveyance as relevant in the journey through the shortest route from his/her place of stay to the place of the award ceremony and back subject to production of the original boarding passes/ Tickets etc. along with duly filled in proforma. Awardees would be given reimbursement for AC 1-tier rail journey if opted.
- GU: પુરસ્કાર પ્રાપ્તકર્તાઓને તેમની નિવાસસ્થાનથી પુરસ્કાર સમારંભ સ્થળ સુધી અને પાછાShortest route દ્વારા મુસાફરી માટેની એરફેર (ઇકોનોમી ક્લાસ) અને સંબંધિત અન્ય પરિવહન ખર્ચની રીફંડ આપવામાં આવશે, بشرط اصل બોર્ડિંગ પાસ/ટિકિટો વગેરે પ્રોફોર્મા સાથે પૂરું ભરેલ હોય. જો પસંદ કરે તો પુરસ્કાર પ્રાપ્તકર્તાઓને એસી 1-ટિયર રેલ મુસાફરી માટેની રીફંડ પણ આપવામાં આવશે.
- Back-translation: Award recipients will be refunded airfare (economy class) and related other transport costs for travel from their residence to the award ceremony venue and back via the Shortest route, provided the original boarding pass/tickets etc. are fully filled in with the proforma. If they choose, award recipients will also be refunded for AC 1-tier rail travel.
- Problem (unintelligible): reimbursement condition contains an Arabic-script fragment ("بشرط اصل") and English words glued into Gujarati; the "subject to original boarding passes" condition is not readable

**37. Backward Classes Foreign Study Scholarship Scheme** (Eligibility)
- EN: The applicant should be eligible for special relaxation of up to 10 years in certain cases as decided by the committee.
- GU: અરજદારને કમિટી દ્વારા નક્કી કરાયેલા કેટલીક સ્થિતિઓમાં મહત્તમ 10 વર્ષની વિશેષ મુલતવી રાખવાની યોગ્યતા હોવી જોઈએ.
- Back-translation: The applicant should be eligible for a special extension of up to 10 years in some situations determined by the committee.
- Problem (wrong-meaning): "special relaxation of up to 10 years" (an age relaxation) became "special postponement" (મુલતવી): the concept is lost

**50. Scheme for Marketing Organisations** (Eligibility)
- EN: Individuals / Partnership Concerns / Private Limited / Public Limited Companies experienced in marketing of Village & Small Industries (VSI) products are eligible.
- GU: ગામ અને નાની ઉદ્યોગો (VSI) ઉત્પાદનોના માર્કેટિંગમાં અનુભવ ધરાવતા વ્યક્તિઓ / ભાગીદારી ચિંતાઓ / પ્રાઈવેટ લિમિટેડ / પબ્લિક લિમિટેડ કંપનીઓ પાત્ર છે.
- Back-translation: Individuals / partnership concerns / private limited / public limited companies having experience in marketing of village and small industries (VSI) products are eligible.
- Problem (wrong-meaning): "Partnership Concerns" (partnership firms) became "ભાગીદારી ચિંતાઓ" (partnership worries): one of the eligible entity types is unreadable


## Section 2: 75 items judged SMALL PROBLEM (wording, terminology, untranslated or transliterated words, stray scripts)

**1. Pradhan Mantri Mudra Yojana** (Eligibility)
- EN: Proprietary concern.
- GU: માલિકીનું વ્યવસાય.
- Back-translation: Proprietorship business.
- Problem (term): "Proprietary concern" as "માલિકીનું વ્યવસાય" (not the standard માલિકી પેઢી)

**2. Dr. APJ Abdul Kalam Shramik Pravidhik Shiksha Sahaayata Yojana** (Eligibility)
- EN: The monthly salary (basic salary + dearness allowance) of the worker should not exceed ₹15,000/-.
- GU: કર્મચારીની માસિક પગાર (મૂળ પગાર + ડિયર્નેસ ભથ્થો) ₹15,000/- કરતાં વધુ ન હોવો જોઈએ.
- Back-translation: The employee's monthly salary (basic salary + dearness allowance) should not be more than ₹15,000/-.
- Problem (term): "dearness allowance" transliterated "ડિયર્નેસ ભથ્થો" (standard: મોંઘવારી ભથ્થું)

**2. Dr. APJ Abdul Kalam Shramik Pravidhik Shiksha Sahaayata Yojana** (Benefits)
- EN: Financial Assistance will be provided as:
- GU: વિત્તીય સહાય નીચે મુજબ પ્રદાન કરવામાં આવશે:
- Back-translation: Financial assistance will be provided as follows:
- Problem (term): "Financial" as "વિત્તીય" (Hindi-style; standard નાણાકીય)

**3. Buffalo Entrepreneurship Development Scheme** (Title)
- EN: Buffalo Entrepreneurship Development Scheme
- GU: બફેલો ઉદ્યોગસાહસિક વિકાસ યોજના
- Back-translation: Buffalo Entrepreneurship Development Scheme
- Problem (term): "Buffalo" transliterated "બફેલો" instead of ભેંસ

**3. Buffalo Entrepreneurship Development Scheme** (Eligibility)
- EN: The applicant should purchase two Graded Murrah She Buffaloes, preferably in their 1st or 2nd lactation and yielding a minimum of 8 liters of milk per day.
- GU: અરજદારને બે ગ્રેડેડ મુર્રાહ સ્ત્રી બફેલો ખરીદવી જોઈએ, પ્રાથમિક રીતે તેમની 1લી અથવા 2જી લેક્ટેશનમાં અને પ્રતિ દિવસ ઓછામાં ઓછા 8 લિટર દૂધ આપતા.
- Back-translation: The applicant should purchase two graded Murrah female buffaloes, preferably in their 1st or 2nd lactation and giving at least 8 liters of milk per day.
- Problem (term): "preferably" as "પ્રાથમિક રીતે" (primarily); "buffalo" transliterated

**3. Buffalo Entrepreneurship Development Scheme** (Benefits)
- EN: Phase Time SC/ST/Women/PwD/ Transgender General
- GU: પગલું સમય SC/ST/Women/PwD/ Transgender સામાન્ય
- Back-translation: Step Time SC/ST/Women/PwD/ Transgender General
- Problem (term): "Phase" as "પગલું" (step)

**3. Buffalo Entrepreneurship Development Scheme** (Benefits)
- EN: 1st Phase After completion of the shed and purchase of 1st milch graded Murrah she Buffalo & completion of its insurance 50% of the subsidy amount ₹59,100/- ₹49,250/-
- GU: 1મો પગલું શેડની પૂર્ણતા અને 1મો મિલ્ચ ગ્રેડેડ મુર્રાહ શી બફેલો ખરીદી અને તેની ઇન્શ્યોરન્સ પૂર્ણ થયા પછી સબસિડી રકમનું 50% ₹59,100/- ₹49,250/-
- Back-translation: 1st step 50% of the subsidy amount after completion of the shed and purchase of the 1st milch graded Murrah female buffalo and completion of its insurance ₹59,100/- ₹49,250/-
- Problem (untranslated): "she Buffalo" as "શી બફેલો" ("she" left as a sound-alike), "milch" as "મિલ્ચ"

**3. Buffalo Entrepreneurship Development Scheme** (Benefits)
- EN: 2nd Phase After the purchase of 2nd milch graded Murrah she Buffalo & completion of its insurance-50% of the subsidy amount ₹59,100/- ₹49,250/-
- GU: 2મો પગલું 2મો મિલ્ચ ગ્રેડેડ મુર્રાહ શી બફેલો ખરીદી અને તેની ઇન્શ્યોરન્સ પૂર્ણ થયા પછી-સબસિડી રકમનું 50% ₹59,100/- ₹49,250/-
- Back-translation: 2nd step 50% of the subsidy amount after purchase of the 2nd milch graded Murrah female buffalo and completion of its insurance ₹59,100/- ₹49,250/-
- Problem (untranslated): same: "શી બફેલો", "મિલ્ચ"

**5. Coaching by Private Institutes for All India Services Civil Services Examination** (Eligibility)
- EN: The applicant should be from a Scheduled Tribe.
- GU: અરજદાર શેડ્યુલ્ડ ટ્રાઇબનો હોવો જોઈએ.
- Back-translation: The applicant should be from a Scheduled Tribe.
- Problem (official-term): "Scheduled Tribe" transliterated "શેડ્યુલ્ડ ટ્રાઇબ" (official: અનુસૂચિત જનજાતિ)

**6. Scheme For Subsidy On Interest For Establishment Of 1 To 20 Milch Animal Farm Fo** (Title)
- EN: Scheme For Subsidy On Interest For Establishment Of 1 To 20 Milch Animal Farm For Scheduled Tribe
- GU: યોજનાઃ શેડ્યુલ્ડ ટ્રાઇબ માટે 1 થી 20 મિલ્ક પ્રાણીઓની ફાર્મની સ્થાપન માટે વ્યાજ પર સબસિડી
- Back-translation: Scheme: Interest subsidy for the establishment of a farm of 1 to 20 milk animals for Scheduled Tribes
- Problem (grammar): awkward word order; "Scheduled Tribe" transliterated; "milch" as "મિલ્ક"

**6. Scheme For Subsidy On Interest For Establishment Of 1 To 20 Milch Animal Farm Fo** (Eligibility)
- EN: The applicant should belong to the Scheduled Tribe category only.
- GU: અરજદારને માત્ર શેડ્યુલ્ડ ટ્રાઇબ કેટેગરીમાં આવવું જોઈએ.
- Back-translation: The applicant should belong only to the Scheduled Tribe category.
- Problem (official-term): "Scheduled Tribe" transliterated

**7. Scheme of Extending Family Maintenance Grant to the Families of the Deceased Fam** (Title)
- EN: Scheme of Extending Family Maintenance Grant to the Families of the Deceased Famous Artists
- GU: મૃત્યુ પામેલ પ્રસિદ્ધ કલાકારોના પરિવારને પરિવાર જતન ગ્રાન્ટ વિસ્તરણ યોજના
- Back-translation: Family Care Grant Extension Scheme for the family of deceased famous artists
- Problem (term): "Maintenance Grant" as "જતન ગ્રાન્ટ" (care/preservation)

**8. Disability Aids and Appliances - Telangana** (Title)
- EN: Disability Aids and Appliances - Telangana
- GU: દિવ્યાંગતા સહાય અને ઉપકરણો - తెలంగాణ
- Back-translation: Disability aids and appliances - Telangana
- Problem (script-leak): Telugu script word "తెలంగాణ" inside a Gujarati title

**8. Disability Aids and Appliances - Telangana** (Benefits)
- EN: Free distribution of artificial limbs, wheelchairs/tricycles, and fabricated appliances.
- GU: કૃત્રિમ અંગો, વ્હીલચેર/ત્રિકસાઇકલ અને બનાવેલ ઉપકરણોની મુક્ત વિતરણ.
- Back-translation: Free distribution of artificial limbs, wheelchair/tricycle and manufactured appliances.
- Problem (term): "Free" as "મુક્ત" (liberated) instead of મફત

**9. GEN-NEXT Support for Innovative Startups (GENESIS)** (Eligibility)
- EN: The applicant Implementing Agency must be a legal entity and must fall under one of the following categories:
- GU: અરજી કરનાર કાર્યાન્વયન એજન્સી કાનૂની સત્તા હોવી જોઈએ અને નીચેની કેટેગરીઓમાંથી કોઈ એકમાં આવવી જોઈએ:
- Back-translation: The applying Implementing Agency must have legal status and must fall under one of the following categories:
- Problem (term): "legal entity" as "કાનૂની સત્તા" (legal authority)

**9. GEN-NEXT Support for Innovative Startups (GENESIS)** (Eligibility)
- EN: The applicant should be an entity registered under Section 8 of the Companies Act; OR
- GU: અરજી કરનારને કંપની અધિનિયમની સેક્શન 8 હેઠળ નોંધાયેલ સત્તા હોવી જોઈએ; OR
- Back-translation: The applicant must have status registered under Section 8 of the Companies Act; OR
- Problem (untranslated): "legal entity" as "સત્તા"; "OR" left in English

**9. GEN-NEXT Support for Innovative Startups (GENESIS)** (Eligibility)
- EN: The applicant should be a society registered under the Societies Registration Act, 1860; OR
- GU: અરજી કરનારને સોસાયટી રજિસ્ટ્રેશન અધિનિયમ, 1860 હેઠળ નોંધાયેલ સમાજ હોવું જોઈએ; OR
- Back-translation: The applicant must be a society registered under the Societies Registration Act, 1860; OR
- Problem (untranslated): "OR" left in English

**9. GEN-NEXT Support for Innovative Startups (GENESIS)** (Benefits)
- EN: Investment Support:
- GU: નિવેશ સહાય:
- Back-translation: Investment Assistance:
- Problem (term): "Investment" as Hindi-style "નિવેશ"

**11. Rajiv Gandhi Krishak Sathi Sahayta Yojana** (Eligibility)
- EN: The workers hold licenses from the market committee.
- GU: કાર્યોકારો પાસે બજાર સમિતિમાંથી લાઇસન્સ છે.
- Back-translation: Has a license from the market committee at the office.
- Problem (spelling): "workers" as the non-word "કાર્યોકારો"

**11. Rajiv Gandhi Krishak Sathi Sahayta Yojana** (Benefits)
- EN: Situation Relief fund
- GU: પરિસ્થિતિ મદદ નાણાં
- Back-translation: Situation Assistance Amount
- Problem (term): "Situation Relief fund" awkward ("પરિસ્થિતિ મદદ નાણાં")

**12. Galvanizing Organic Bio-Agro Resources Dhan (GOBARdhan)** (Eligibility)
- EN: For Commercial Model: Entrepreneurs/Cooperatives/Gaushalas/Dairies, etc. are eligible to setup large biogas/Compressed Bio-gas (CBG) plants
- GU: વાણિજ્યિક મોડેલ માટે: ઉદ્યોગપતિઓ/સહકારો/ગૌશાલો/ડેરીઓ વગેરેને મોટા બાયોગેસ/કમ્પ્રેસ્ડ બાયોગેસ (CBG) પ્લાન્ટ સ્થાપિત કરવા માટે પાત્રતા છે.
- Back-translation: For commercial model: Entrepreneurs/cooperatives/cow shelters/dairies, etc., are eligible to set up large biogas/compressed biogas (CBG) plants.
- Problem (term): "Cooperatives" as "સહકારો"

**14. Ex-Gratia Grant for Disability to Defence Forces Personnel** (Eligibility)
- EN: The applicant should be a disabled Defence Forces Personnel (Army, Navy, or Air Force) who became permanently disabled due to war, operational areas, terrorist activities, natural calamities, etc.
- GU: અરજદાર યુદ્ધ, ઓપરેશનલ ક્ષેત્રો, આતંકવાદી પ્રવૃત્તિઓ, પ્રાકૃતિક આપત્તિઓ વગેરે કારણે કાયમી રીતે દિવ્યાંગ બનેલા દિવ્યાંગ રક્ષા દળ કર્મચારી (સેન્ય, નૌકા, અથવા વાયુદળ) હોવો જોઈએ.
- Back-translation: The applicant should be a disabled Defence Force personnel (Army, Navy, or Air Force) who has become permanently disabled due to war, operational areas, terrorist activities, natural disasters, etc.
- Problem (spelling): "Army" misspelt "સેન્ય"; "disabled" repeated

**15. Financial Assistance For Marriage (APB&OCWWB)** (Eligibility)
- EN: 2. The applicant must be employed in the Building and Other Construction works.
- GU: 2. અરજદારને બિલ્ડિંગ અને અન્ય નિર્માણ કાર્યોમાં નોકરી કરેલી હોવી જોઈએ.
- Back-translation: 2. The applicant should have worked in building and other construction work.
- Problem (term): "employed" as "નોકરી કરેલી" (has worked)

**16. To Provide Interest Subvention to Animal Husbandry of the State at the Rate of 4** (Eligibility)
- EN: The applicant must be a cattle breeder.
- GU: અરજદારને પશુ પ્રજનક હોવું આવશ્યક છે.
- Back-translation: It is necessary for the applicant to be an animal breeder.
- Problem (term): "cattle breeder" as "પશુ પ્રજનક" (animal reproducer; usual: પશુપાલક)

**16. To Provide Interest Subvention to Animal Husbandry of the State at the Rate of 4** (Eligibility)
- EN: The applicant must have taken a short-term loan from any of the following during the financial year:
- GU: વિત્તીય વર્ષ દરમિયાન અરજદારને નીચેમાંથી કોઈપણમાંથી ટૂંકા ગાળાનો લોન લેવો આવશ્યક છે:
- Back-translation: It is necessary for the applicant to take a short-term loan from any of the following during the financial year:
- Problem (term): "financial year" as Hindi-style "વિત્તીય વર્ષ"

**16. To Provide Interest Subvention to Animal Husbandry of the State at the Rate of 4** (Eligibility)
- EN: Primary Agricultural Credit Cooperative Society
- GU: પ્રાથમિક કૃષિ ક્રેડિટ સહકારી સમાજ
- Back-translation: Primary Agricultural Credit Cooperative Society
- Problem (term): "Cooperative Society" as "સહકારી સમાજ" (social community, not મંડળી)

**16. To Provide Interest Subvention to Animal Husbandry of the State at the Rate of 4** (Benefits)
- EN: Name of Component Standard of Assistance Minimum Time Limit (in Year) for Reclaiming Benefits)
- GU: Componentનું નામ સહાયનું ધોરણ લાભો પુનઃપ્રાપ્તિ માટેનું ન્યૂનતમ સમય મર્યાદા (વર્ષમાં)
- Back-translation: Component name Subsidy criteria Minimum time limit for benefit recovery (in years)
- Problem (untranslated): "Component" left in English glued to a Gujarati suffix

**16. To Provide Interest Subvention to Animal Husbandry of the State at the Rate of 4** (Benefits)
- EN: To provide interest subvention to animal husbandry of the state at the rate of 4% to the beneficiaries Kishan Credit Card. 4% interest subvention on timely repayment of short-term loan taken by animal husbandry up to ₹2,00,000/-. only once in a financial year
- GU: રાજ્યની પશુપાલન માટે 4% દરે લાભાર્થી Kishan Credit Cardને વ્યાજ સબસિડી પ્રદાન કરવા માટે. પશુપાલન દ્વારા લીધેલ ટૂંકા ગાળાના લોનની સમયસર ચુકવણી પર 4% વ્યાજ સબસિડી, મહત્તમ ₹2,00,000/- સુધી. only once in a financial year
- Back-translation: To provide interest subsidy at 4% rate to beneficiary Kishan Credit Card for the state's animal husbandry. 4% interest subsidy on timely repayment of short-term loan taken through animal husbandry, up to a maximum of ₹2,00,000/-. only once in a financial year
- Problem (untranslated): "only once in a financial year" and "Kishan Credit Card" left in English

**19. PMMSY: Inputs for Saline /Alkaline Water Aquaculture - Haryana** (Eligibility)
- EN: The applicant will receive central assistance for input costs only for the initial crop in newly constructed ponds/tanks.
- GU: અરજદારને નવા નિર્મિત તળાવો/ટાંકોમાં પ્રારંભિક પાક માટે જ ઇનપુટ ખર્ચ માટે કેન્દ્રિય સહાય મળશે.
- Back-translation: The applicant will receive central assistance for input cost only for the initial crop in newly constructed ponds/tanks.
- Problem (spelling): "tanks" as "ટાંકો" (typo)

**19. PMMSY: Inputs for Saline /Alkaline Water Aquaculture - Haryana** (Eligibility)
- EN: The applicant must ensure the ponds/tanks are fully ready for fish or shrimp culture before claiming input cost assistance.
- GU: અરજદારને ઇનપુટ ખર્ચ સહાય માટે દાવો કરતા પહેલા તળાવો/ટાંકો માછલી અથવા શ્રિમ્પ સંસ્કૃતિ માટે સંપૂર્ણ રીતે તૈયાર છે તેની ખાતરી કરવી જોઈએ.
- Back-translation: The applicant should ensure that the ponds/tanks are fully ready for fish or shrimp culture before claiming input cost assistance.
- Problem (term): "shrimp culture" as "શ્રિમ્પ સંસ્કૃતિ" (culture in the sense of civilisation)

**20. Tenzing Norgay National Adventure Award** (Benefits)
- EN: The award consists of a bronze statuette, a certificate, a blazer with a silken tie/a saree, and award money of ₹ 15,00,000. The Awards are presented to the winners along with Arjuna Awards by the Government of India.
- GU: આ પુરસ્કારમાં બ્રોન્ઝની મૂર્તિ, પ્રમાણપત્ર, સિલ્કની ટાઈ/સારી સાથેનું બ્લેઝર, અને રૂ. 15,00,000નું પુરસ્કાર રકમ શામેલ છે. પુરસ્કારો ભારત સરકાર દ્વારા અર્જુન પુરસ્કારો સાથે વિજેતાઓને આપવામાં આવે છે.
- Back-translation: This award includes a bronze statue, a certificate, a blazer with a silk tie/sari, and an award amount of Rs. 15,00,000. The awards are given to the winners by the Government of India along with the Arjuna Awards.
- Problem (spelling): "saree" misspelt "સારી"

**21. Distribution of Rhizobium** (Eligibility)
- EN: The beneficiary should raise seed farms with Pulses crops.
- GU: લાભાર્થીને પલ્સ પાકો સાથે બીજના ખેતરો ચલાવવાના હોવા જોઈએ.
- Back-translation: The beneficiary should be cultivating pulse crops with seed fields.
- Problem (term): "Pulses" as "પલ્સ પાકો" (not કઠોળ); "raise seed farms" awkward

**22. Production of Tiatr in Villages/Urban Areas/Educational Institutions** (Eligibility)
- EN: The applicant must be from the particular village/urban area/parish (in case of Mumbai, Sindhudurg and other parts of the country).
- GU: અરજદારને નિર્દિષ્ટ ગામ/શહેર વિસ્તાર/પેરીશ (મુंबई, સિંધુદુર્ગ અને દેશના અન્ય ભાગો માટે)માંથી હોવો જોઈએ.
- Back-translation: The applicant should be from the specified village/city area/parish (for Mumbai, Sindhudurg and other parts of the country).
- Problem (script-leak): Devanagari "मुंबई" inside Gujarati text

**22. Production of Tiatr in Villages/Urban Areas/Educational Institutions** (Benefits)
- EN: Financial Support: Tiatr Academy of Goa will provide financial support to the extent as fixed by Tiatr Academy of Goa towards various aspects: Direction, Live Band (with at least 2 blowing instruments), Outside Artistes, Stage Setting, Background Music, Costumes, Make-up, Light Effects.
- GU: આર્થિક સહાય: ટિયેટર અકાદમી ઓફ ગોવા વિવિધ પાસાઓ માટે ટિયેટર અકાદમી ઓફ ગોવા દ્વારા નક્કી કરેલ હદ સુધી આર્થિક સહાય પ્રદાન કરશે: નિર્દેશન, લાઇવ બૅન્ડ (કમ સે કમ 2 વાદ્યવાજો સાથે), બાહ્ય કલાકારો, સ્ટેજ સેટિંગ, બેકગ્રાઉન્ડ મ્યુઝિક, કપડાં, મેક-અપ, લાઇટ ઇફેક્ટ્સ.
- Back-translation: Financial assistance: The Theatre Academy of Goa will provide financial assistance up to the limit determined by the Theatre Academy of Goa for various aspects: direction, live band (with at least 2 musicians), external artists, stage setting, background music, costumes, make-up, light effects.
- Problem (term): "at least" as Hindi "કમ સે કમ"

**23. Investment Promotion Scheme (IPS) for Thrust Sectors: Scheme For Marine Products** (Title)
- EN: Investment Promotion Scheme (IPS) for Thrust Sectors: Scheme For Marine Products Processing Units
- GU: ઇન્વેસ્ટમેન્ટ પ્રમોશન સ્કીમ (IPS) માટે થ્રસ્ટ સેક્ટર્સ: મેરિન પ્રોડક્ટ્સ પ્રોસેસિંગ યુનિટ્સ માટેની યોજના
- Back-translation: Thrust sectors for Investment Promotion Scheme (IPS): Scheme for Marine Products Processing Units
- Problem (grammar): title re-ordered so "Thrust Sectors" reads as the object of "for IPS"

**23. Investment Promotion Scheme (IPS) for Thrust Sectors: Scheme For Marine Products** (Eligibility)
- EN: Enterprise shall have to apply at online portal within one year from the date of first disbursement of loan or on or before the date of commencement of commercial production.
- GU: ઉદ્યોગને પ્રથમ લોનની ચુકવણીની તારીખથી એક વર્ષની અંદર અથવા વ્યાપારી ઉત્પાદનની શરૂઆતની તારીખથી પહેલાં, ઓનલાઇન પોર્ટલ પર અરજી કરવી પડશે.
- Back-translation: The industry must apply on the online portal within one year from the date of first loan repayment or before the date of commencement of commercial production, whichever is earlier.
- Problem (term): "disbursement" as "ચુકવણી" (payment), ambiguous with repayment

**24. Mukhya Mantri Mahila Sashaktikaran Yojana** (Eligibility)
- EN: The applicant should be a rape victim woman or girl.
- GU: અરજદાર સ્ત્રી અથવા કન્યા હોવી જોઈએ, જે જાતીય દુર્વ્યવહારનું શિકાર હોય.
- Back-translation: The applicant should be a woman or girl, who is a victim of sexual misconduct.
- Problem (term): "rape victim" softened to "જાતીય દુર્વ્યવહાર" (sexual misconduct)

**24. Mukhya Mantri Mahila Sashaktikaran Yojana** (Eligibility)
- EN: The applicant should be a BPL woman saved from trafficking.
- GU: અરજદાર BPL સ્ત્રી હોવી જોઈએ, જેને તસ્કરીમાંથી બચાવવામાં આવી હોય.
- Back-translation: The applicant should be a BPL woman, who has been rescued from trafficking.
- Problem (term): "trafficking" as "તસ્કરી" (smuggling), without "માનવ"

**25. Mukhyamantri Aarthik Kalyan Yojana** (Title)
- EN: Mukhyamantri Aarthik Kalyan Yojana
- GU: મુખ्यमंत्री આર્થિક કલ્યાણ યોજના
- Back-translation: Chief Minister Economic Welfare Scheme
- Problem (script-leak): Devanagari letters "मुख्यमंत्री" inside a Gujarati title

**25. Mukhyamantri Aarthik Kalyan Yojana** (Eligibility)
- EN: The applicant should be a native of Madhya Pradesh.
- GU: અરજદાર મધ્ય પ્રદેશનો નેટિવ હોવો જોઈએ.
- Back-translation: The applicant should be a native of Madhya Pradesh.
- Problem (term): "native" transliterated "નેટિવ"

**25. Mukhyamantri Aarthik Kalyan Yojana** (Eligibility)
- EN: The applicant should not be a defaulter/insolvent defaulter of any nationalized bank/financial institution/cooperative bank.
- GU: અરજદાર કોઈ પણ નેશનલાઇઝ્ડ બેંક/વિત્તીય સંસ્થા/સહકારી બેંકનો ડિફોલ્ટર/દિવાળિયાત ડિફોલ્ટર ન હોવો જોઈએ.
- Back-translation: The applicant should not be a defaulter/bankrupt defaulter of any nationalized bank/financial institution/cooperative bank.
- Problem (term): "financial" as "વિત્તીય"

**26. Assistance of Concentrate Feed for Pregnant Animals (Scheduled Caste Category)** (Title)
- EN: Assistance of Concentrate Feed for Pregnant Animals (Scheduled Caste Category)
- GU: ગર્ભવતી પ્રાણીઓ માટે કૉન્સન્ટ્રેટ ફીડની સહાય (શેડ્યુલ્ડ કાસ્ટ કેટેગરી)
- Back-translation: Assistance for concentrate feed for pregnant animals (Scheduled Caste category)
- Problem (official-term): "Scheduled Caste" transliterated "શેડ્યુલ્ડ કાસ્ટ" (correct meaning)

**26. Assistance of Concentrate Feed for Pregnant Animals (Scheduled Caste Category)** (Eligibility)
- EN: The applicant must belong to the Scheduled Caste Category.
- GU: અરજદારને શેડ્યુલ્ડ કાસ્ટ કેટેગરીમાં આવવું આવશ્યક છે.
- Back-translation: It is necessary for the applicant to be in the Scheduled Caste category.
- Problem (official-term): same

**27. NEC Stipend And Book Grant Scheme** (Title)
- EN: NEC Stipend And Book Grant Scheme
- GU: નેક સ્ટાઇપેન્ડ અને બુક ગ્રાન્ટ યોજના
- Back-translation: Neck Stipend and Book Grant Scheme
- Problem (term): "NEC" written phonetically as "નેક" (reads like "neck")

**27. NEC Stipend And Book Grant Scheme** (Eligibility)
- EN: The applicant should belong to Scheduled Tribe (ST) or General category.
- GU: અરજદારને શેડ્યુલ્ડ ટ્રાઇબ (ST) અથવા જનરલ કેટેગરીમાં આવવું જોઈએ.
- Back-translation: The applicant should fall under the Scheduled Tribe (ST) or General category.
- Problem (official-term): "Scheduled Tribe" transliterated

**28. Mukhyamantri Nirman Shramikon Ke Bachon Hetu Nihshulk Coaching Sahaayata Yojana** (Title)
- EN: Mukhyamantri Nirman Shramikon Ke Bachon Hetu Nihshulk Coaching Sahaayata Yojana
- GU: મુખ્યમંત્રિ નિર્માણ શ્રમિકોં કે બાળકો માટે નિઃશુલ્ક કોચિંગ સહાયતા યોજના
- Back-translation: Chief Minister Construction Workers or Children Free Coaching Assistance Scheme
- Problem (term): Hindi "Ke" in the title read as Gujarati "or" (કે)

**29. USERC Establishment and Operation of Entrepreneurship Development Centers** (Title)
- EN: USERC Establishment and Operation of Entrepreneurship Development Centers
- GU: યુઝરસી સ્થાપન અને ઉદ્યમ વિકાસ કેન્દ્રોનું સંચાલન
- Back-translation: Operation of User Sites and Enterprise Development Centers
- Problem (term): acronym USERC written phonetically as "યુઝરસી"

**32. Startup India Seed Fund Scheme- For Incubators** (Title)
- EN: Startup India Seed Fund Scheme- For Incubators
- GU: સ્ટાર્ટઅપ ઈન્ડિયા સીડ ફંડ સ્કીમ- ઇન્ક્યુબેટર્સ
- Back-translation: Startup India Seed Fund Scheme- Incubators
- Problem (grammar): "For Incubators" lost its "for"

**32. Startup India Seed Fund Scheme- For Incubators** (Eligibility)
- EN: 1. Incubator must be a legal entity:
- GU: 1. ઇન્ક્યુબેટર કાનૂની સત્તા હોવું જોઈએ:
- Back-translation: 1. The incubator should have legal status:
- Problem (term): "legal entity" as "કાનૂની સત્તા"

**32. Startup India Seed Fund Scheme- For Incubators** (Eligibility)
- EN: a) A society registered under the Societies Registration Act 1860, or
- GU: a) સોસાયટી રજિસ્ટ્રેશન અધિનિયમ 1860 હેઠળ નોંધાયેલ સમાજ, અથવા
- Back-translation: a) A society registered under the Societies Registration Act 1860, or
- Problem (term): "society" as "સમાજ" (social community)

**34. Kanya Dhan Scheme for SC Students** (Title)
- EN: Kanya Dhan Scheme for SC Students
- GU: કન્યા ધન યોજના એ એસસી વિદ્યાર્થીઓ માટે.
- Back-translation: Kanya Dhan Yojana is for SC students.
- Problem (grammar): title restructured oddly ("... યોજના એ એસસી વિદ્યાર્થીઓ માટે")

**35. Sathiyavanimuthu Ammaiyar Ninaivu Free Supply of Sewing Machine Scheme** (Title)
- EN: Sathiyavanimuthu Ammaiyar Ninaivu Free Supply of Sewing Machine Scheme
- GU: સત્યાવનિમુથુ અંમૈયર નિનૈવુ મુક્ત સિલાઈ મશીન પુરવઠા યોજના
- Back-translation: Satya Avani Muthu Ammaiyer Nainavu Free Sewing Machine Supply Scheme
- Problem (term): "Free" as "મુક્ત" (liberated) instead of મફત

**36. Pradhan Mantri Surakshit Matritva Abhiyan** (Benefits)
- EN: Comprehensive Antenatal Care: Special Antenatal Care services provided by Obstetrics and Gynaecology specialists, Radiologists, and Physicians at government health facilities.
- GU: સંપૂર્ણ ગર્ભાવસ્થા કાળની કાળજી: obstetrics અને ગાયનેકોલોજી નિષ્ણાતો, રેડિયોલોજિસ્ટો અને ડોક્ટરો દ્વારા સરકારની આરોગ્ય સુવિધાઓમાં પ્રદાન કરવામાં આવતી વિશેષ ગર્ભાવસ્થા કાળજી સેવાઓ.
- Back-translation: Complete pregnancy period care: Special pregnancy care services provided in government health facilities by obstetrics and gynecology specialists, radiologists and doctors.
- Problem (untranslated): "obstetrics" left in Latin letters inside Gujarati

**37. Backward Classes Foreign Study Scholarship Scheme** (Title)
- EN: Backward Classes Foreign Study Scholarship Scheme
- GU: બેકવર્ડ ક્લાસિસ વિદેશી અભ્યાસ સ્કોલરશિપ યોજના
- Back-translation: Backward Class Foreign Study Scholarship Scheme
- Problem (official-term): "Backward Classes" transliterated

**37. Backward Classes Foreign Study Scholarship Scheme** (Eligibility)
- EN: The applicant should be under 35 years of age on 1st January of the year of application.
- GU: અરજદારનું વય અરજીના વર્ષના 1 જાન્યુઆરી સુધી 35 વર્ષથી ઓછું હોવું જોઈએ.
- Back-translation: The applicant's age should be less than 35 years as of January 1 of the year of application.
- Problem (grammar): "on 1st January" as "until 1 January"

**37. Backward Classes Foreign Study Scholarship Scheme** (Benefits)
- EN: To provide financial assistance to students belonging to the backward class.
- GU: પાછળની વર્ગમાં આવતા વિદ્યાર્થીઓને નાણાકીય સહાય પ્રદાન કરવા માટે.
- Back-translation: To provide financial assistance to students who come in the backward class.
- Problem (official-term): "backward class" as "પાછળની વર્ગ" (back class)

**38. State Scholarship for Class 6th to 10th (Denotified, Nomadic and Semi-Nomadic )** (Title)
- EN: State Scholarship for Class 6th to 10th (Denotified, Nomadic and Semi-Nomadic )
- GU: રાજ્ય સ્કોલરશિપ કક્ષાઓ 6 થી 10 (ડિનોટિફાઇડ, નૉમેડિક અને સેમી-નૉમેડિક)
- Back-translation: State Scholarship Classes 6 to 10 (Denotified, Nomadic and Semi-Nomadic)
- Problem (untranslated): "Denotified/Nomadic" only transliterated (correct but not understandable to most readers)

**38. State Scholarship for Class 6th to 10th (Denotified, Nomadic and Semi-Nomadic )** (Eligibility)
- EN: The applicant should be from a Denotified, Nomadic, and Semi-Nomadic Community.
- GU: અરજદાર ડિનોટિફાઇડ, નૉમેડિક અને સેમી-નૉમેડિક સમુદાયમાંથી હોવો જોઈએ.
- Back-translation: The applicant should be from the Denotified, Nomadic and Semi-Nomadic community.
- Problem (untranslated): same

**39. Mukhyamantri Sampoorna Pushti Yojana: Nutrition for Severely Underweight and Mod** (Title)
- EN: Mukhyamantri Sampoorna Pushti Yojana: Nutrition for Severely Underweight and Moderately Acute Malnourished Children (3 years - 6 years)
- GU: મુખ્યમંત્રિ સંપૂર્ણ પોષણ યોજના: ગંભીર રીતે અણવજનવાળા અને મધ્યમ તીવ્ર કુપોષિત બાળકો (૩ વર્ષ - ૬ વર્ષ) માટે પોષણ.
- Back-translation: Chief Minister Complete Nutrition Scheme: Nutrition for severely underweight and moderately acute malnourished children (3 years - 6 years).
- Problem (term): odd word "અણવજનવાળા" for underweight; typo "મુખ્યમંત્રિ"

**41. PRL's Vikram Sarabhai Postdoctoral Fellowship (VISHWAS)** (Benefits)
- EN: Scholarship Amount: Scholars receive ₹1,00,000/- per month with HRA and other facilities as per PRL/DOS rules.
- GU: વિત્તીય સહાયની રકમ: સ્કોલર્સને ₹1,00,000/- પ્રતિ મહિનો HRA અને અન્ય સુવિધાઓ PRL/DOS નિયમો મુજબ મળે છે.
- Back-translation: Amount of financial assistance: Scholars receive ₹1,00,000/- per month HRA and other facilities as per PRL/DOS rules.
- Problem (term): "Scholarship Amount" rendered as "financial assistance amount" (વિત્તીય સહાય)

**42. The West Bengal Incentive Scheme: Interest Subsidy on Term Loan** (Eligibility)
- EN: Eligible Hotel Units who started their commercial operation on or after 7th January, 2015 to 31st December, 2020 but could not apply under previous scheme 2015 due to absence of a Bar in the Hotel.
- GU: પાત્ર હોટેલ યુનિટ્સ જેમણે 7મી જાન્યુઆરી, 2015 થી 31મી ડિસેમ્બર, 2020 સુધી વ્યાપારી કામગીરી શરૂ કરી હતી પરંતુ 2015 ની પૂર્વ યોજના હેઠળ બારમાંની ગેરહાજરીને કારણે અરજી કરી શક્યા ન હતા.
- Back-translation: Eligible hotel units which commenced commercial operations from 7th January, 2015 to 31st December, 2020 but could not apply due to the absence of bar under the pre-2015 scheme.
- Problem (grammar): "absence of a Bar in the Hotel" garbled ("બારમાંની ગેરહાજરી")

**43. Financial Assistance for Purchase of Fuel (Petrol) to the Fishermen for Operatio** (Eligibility)
- EN: The applicant should be a member of the Registered Fisheries Co-operative Societies/ Association or Individual.
- GU: અરજદાર નોંધાયેલ માછીમારી સહકારી સમાજો/સંઘો અથવા વ્યક્તિગતનો સભ્ય હોવો જોઈએ.
- Back-translation: The applicant should be a member of registered fishing cooperative societies/associations or an individual.
- Problem (term): "Cooperative Societies" as "સહકારી સમાજો" (social communities)

**45. National Handicrafts Development Programme: Direct Benefit to Artisans - Support** (Benefits)
- EN: Assistance of upto ₹8,000/- per month is granted in the form of a monthly allowance or lump sum grant or both, disbursed via the Public Financial Management System (PFMS)/ Direct Benefit Transfer (DBT).
- GU: માસિક ભથ્થા અથવા એકમૂળ ગ્રાન્ટ અથવા બંને રૂપમાં, જાહેર નાણાકીય વ્યવસ્થાપન સિસ્ટમ (PFMS)/ ડાયરેક્ટ બેનિફિટ ટ્રાન્સફર (DBT) દ્વારા વિતરણ કરવામાં આવતી, મહિને ₹8,000/- સુધીની સહાય આપવામાં આવે છે.
- Back-translation: Assistance of up to ₹8,000/- per month is provided, distributed in the form of monthly stipend or lump sum grant or both, through the Public Financial Management System (PFMS)/ Direct Benefit Transfer (DBT).
- Problem (term): "lump sum" as the non-standard "એકમૂળ"

**46. Janani Sahayogi Yojana** (Eligibility)
- EN: The applicant must belong to a Below Poverty Line (BPL) family.
- GU: અરજદાર બેલો પાવર્ટી લાઇન (BPL) પરિવારનો સભ્ય હોવો જોઈએ.
- Back-translation: The applicant should be a member of a Below Poverty Line (BPL) family.
- Problem (term): "Below Poverty Line" only transliterated (બેલો પાવર્ટી લાઇન)

**46. Janani Sahayogi Yojana** (Benefits)
- EN: Free delivery services (both normal and cesarean) for pregnant women belonging to BPL families.
- GU: BPL પરિવારોની ગર્ભવતી સ્ત્રીઓ માટે મુક્ત ડિલિવરી સેવાઓ (સામાન્ય અને સીઝેરિયન બંને).
- Back-translation: Free delivery services (both normal and cesarean) for pregnant women of BPL families.
- Problem (term): "Free" as "મુક્ત" (liberated) instead of મફત

**46. Janani Sahayogi Yojana** (Benefits)
- EN: Free maternal and newborn healthcare, including antenatal, delivery, postnatal, and neonatal services.
- GU: મુક્ત માતૃત્વ અને નવજાત આરોગ્યસંભાળ, જેમાં એન્ટેનેટલ, ડિલિવરી, પોસ્ટનેટલ અને નેઓનલ સેવાઓ શામેલ છે.
- Back-translation: Free maternal and newborn healthcare, including antenatal, delivery, postnatal, and neonatal services.
- Problem (term): "મુક્ત" for free; "antenatal/postnatal/neonatal" only transliterated, "નેઓનલ" typo

**46. Janani Sahayogi Yojana** (Benefits)
- EN: Free abortion and emergency obstetric care when medically required.
- GU: મેડિકલ રીતે જરૂરી હોય ત્યારે મુક્ત ગર્ભપાત અને તાત્કાલિક પ્રસૂતિ કાળજી.
- Back-translation: Free abortion and emergency obstetric care when medically necessary.
- Problem (term): "મુક્ત" for free

**46. Janani Sahayogi Yojana** (Benefits)
- EN: Free medicines, diagnostics, and hospitalization at government or accredited private hospitals.
- GU: સરકારી અથવા માન્યતા પ્રાપ્ત ખાનગી હોસ્પિટલોમાં મુક્ત દવાઓ, નિદાન અને હોસ્પિટલાઇઝેશન.
- Back-translation: Free medicines, diagnostics, and hospitalization in government or accredited private hospitals.
- Problem (term): "મુક્ત" for free

**47. Revised Education Scheme For Children Of Artisans/Weavers Of Handicrafts And Han** (Title)
- EN: Revised Education Scheme For Children Of Artisans/Weavers Of Handicrafts And Handloom Departments
- GU: હસ્તકલા અને હેન્ડલૂમ વિભાગોના કારીગરો/વણિકાઓના બાળકો માટે સુધારેલ શિક્ષણ યોજના
- Back-translation: Improved education scheme for children of artisans/weavers of Handicraft and Handloom departments
- Problem (term): "Weavers" as "વણિકાઓ" (વણિક is a merchant community; weaver is વણકર)

**48. Arun Pig Development Scheme** (Benefits)
- EN: 4750 farmers will be given piggery subsidy (25% beneficiary contribution and 75% government contribution).
- GU: 4750 ખેડૂતોને પિગેરી સબસિડી આપવામાં આવશે (25% લાભાર્થી યોગદાન અને 75% સરકારનું યોગદાન).
- Back-translation: Piggery subsidy will be given to 4750 farmers (25% beneficiary contribution and 75% government contribution).
- Problem (untranslated): "piggery" only transliterated ("પિગેરી")

**48. Arun Pig Development Scheme** (Benefits)
- EN: Piglets will be procured by the District Administration and handed over to the farmers after ensuring that a suitable sty was constructed by the selected farmer.
- GU: પિગલેટ્સનું ખરીદી જિલ્લા પ્રશાસન કરશે અને પસંદ કરાયેલા ખેડૂત દ્વારા યોગ્ય સ્ટીનું નિર્માણ સુનિશ્ચિત કર્યા પછી ખેડૂતોને હસ્તાંતર કરવામાં આવશે.
- Back-translation: Purchase of piglets will be done by the district administration and after ensuring the construction of proper sty by the selected farmer, they will be handed over to the farmers.
- Problem (untranslated): "piglets" and "sty" only transliterated ("પિગલેટ્સ", "સ્ટી")

**48. Arun Pig Development Scheme** (Benefits)
- EN: The sty should accommodate 5 piglets with a scope to accommodate a further 15 nos.
- GU: સ્ટી 5 પિગલેટ્સને સમાવી શકે અને વધુ 15 નંબરને સમાવવા માટે ક્ષમતા હોવી જોઈએ.
- Back-translation: Sty should be able to accommodate 5 piglets and should have capacity to accommodate 15 more numbers.
- Problem (untranslated): same

**48. Arun Pig Development Scheme** (Benefits)
- EN: 5 pig entrepreneurs will be selected per district and each will be given an assistance of 15 piglets per unit @₹1.5 Lakh (govt. share)
- GU: દરેક જિલ્લામાં 5 પિગ ઉદ્યોગપતિઓની પસંદગી કરવામાં આવશે અને દરેકને પ્રતિ યુનિટ 15 પિગલેટ્સની સહાય @₹1.5 લાખ (સરકારનું હિસ્સો) આપવામાં આવશે.
- Back-translation: 5 pig entrepreneurs will be selected in each district and each will be given assistance of 15 piglets per unit @₹1.5 lakh (government's share).
- Problem (untranslated): same

**49. Personal Accident Assistance Scheme** (Eligibility)
- EN: The applicant must be at least 18 years of age to be eligible to claim compensation.
- GU: અરજદારને કમ્પેન્સેશન મેળવવા માટે યોગ્યતા મેળવવા ઓછામાં ઓછા 18 વર્ષનું હોવું આવશ્યક છે.
- Back-translation: It is necessary for the applicant to be at least 18 years old to be eligible to receive compensation.
- Problem (untranslated): "compensation" only transliterated

**49. Personal Accident Assistance Scheme** (Benefits)
- EN: Under the Mandi Act of Uttarakhand, farmers, agricultural labourers, and Mandi labourers working in Mandi areas regulated by the state, who are engaged in agricultural activities or the operation of agricultural equipment such as power equipment, digging or deepening wells and ponds for irrigation, using tractors for threshing or transporting produce, or performing other fieldwork are covered under the scheme operated by the Mandi Marketing Board through Mandi Committees. In case of physical injury or death resulting from an accident, the scheme provides them with compensation.
- GU: ઉત્તરાખંડના મંડિ અધિનિયમ હેઠળ, રાજ્ય દ્વારા નિયમિત મંડિ વિસ્તારોમાં કામ કરતા ખેડૂત, કૃષિ શ્રમિકો અને મંડિ શ્રમિકો, જે કૃષિ પ્રવૃત્તિઓમાં અથવા કૃષિ ઉપકરણો જેમ કે પાવર ઉપકરણો, કૂવો અને તળાવો ખોદવા અથવા ઊંડા કરવા, સિંચાઈ માટે, ટ્રેક્ટરનો ઉપયોગ કરીને થ્રેશિંગ અથવા ઉત્પાદન પરિવહન, અથવા અન્ય ક્ષેત્રકાર્યો કરવા માટે જોડાયેલા હોય છે, તેઓ મંડિ માર્કેટિંગ બોર્ડ દ્વારા મંડિ કમિટીઓ દ્વારા ચલાવવામાં આવતી યોજના હેઠળ આવરી લેવાય છે. અકસ્માતથી શારીરિક ઇજા અથવા મૃત્યુ થાય તો, આ યોજનામાં તેમને વળતર આપવામાં આવે છે.
- Back-translation: Under the Mandi Act of Uttarakhand, farmers, agricultural laborers, and mandi laborers working in regular mandi areas designated by the state, who are engaged in agricultural activities or in the use of agricultural equipment such as power equipment, digging or deepening wells and ponds for irrigation, threshing or production transport using tractors, or other field work, are covered under the scheme operated by the Mandi Committees through the Mandi Marketing Board. In case of physical injury or death due to an accident, they are compensated under this scheme.
- Problem (term): "regulated" mandi areas as "નિયમિત" (regular)


## Section 3: 25 random items judged CLEAN (control sample)

**1. Pradhan Mantri Mudra Yojana** (Eligibility)
- EN: Eligible borrowers
- GU: યોગ્ય ઉધારગ્રાહકો
- Back-translation: Eligible borrowers
- (judged clean; please confirm or correct)

**2. Dr. APJ Abdul Kalam Shramik Pravidhik Shiksha Sahaayata Yojana** (Eligibility)
- EN: The worker must be working in an establishment registered under the Shops and Commercial Establishments Act, 1962 or the Factories Act, 1948 in Uttar Pradesh.
- GU: કર્મચારીને ઉત્તર પ્રદેશમાં શોપ્સ અને કોમર્શિયલ એસ્ટેબ્લિશમેન્ટ્સ અધિનિયમ, 1962 અથવા ફેક્ટરીઝ અધિનિયમ, 1948 હેઠળ નોંધાયેલ એસ્ટેબ્લિશમેન્ટમાં કામ કરવું આવશ્યક છે.
- Back-translation: It is necessary for the employee to work in an establishment registered under the Uttar Pradesh Shops and Commercial Establishments Act, 1962 or the Factories Act, 1948.
- (judged clean; please confirm or correct)

**3. Buffalo Entrepreneurship Development Scheme** (Eligibility)
- EN: If the applicant is a PwD, their disability should be more than 40%.
- GU: જો અરજદાર PwD હોય, તો તેમની દિવ્યાંગતા 40% કરતાં વધુ હોવી જોઈએ.
- Back-translation: If the applicant is PwD, their disability should be more than 40%.
- (judged clean; please confirm or correct)

**10. Grant of Stipend to Differently Abled Trainees** (Eligibility)
- EN: The applicant should have undertaken a full-time vocational training course in any recognized vocational training centre, workshop, ITI, or any other institution sanctioned by the Central/State Government, local body, or voluntary organization.
- GU: અરજદારએ કોઈપણ માન્ય વ્યાવસાયિક તાલીમ કેન્દ્ર, વર્કશોપ, ITI, અથવા કેન્દ્ર/રાજ્ય સરકાર, સ્થાનિક પ્રાધિકરણ અથવા સ્વયંસેવક સંસ્થા દ્વારા મંજૂર કોઈપણ અન્ય સંસ્થામાં પૂર્ણ-સમય વ્યાવસાયિક તાલીમ કોર્સ પૂર્ણ કર્યો હોવો જોઈએ.
- Back-translation: The applicant should have completed a full-time vocational training course at any valid vocational training center, workshop, ITI, or any other institution approved by the central/state government, local authority, or voluntary organization.
- (judged clean; please confirm or correct)

**11. Rajiv Gandhi Krishak Sathi Sahayta Yojana** (Benefits)
- EN: In case of death in an accident ₹2,00,000/-.
- GU: દુર્ઘટનામાં મૃત્યુની સ્થિતિમાં ₹2,00,000/-
- Back-translation: In case of death in an accident ₹2,00,000/-
- (judged clean; please confirm or correct)

**11. Rajiv Gandhi Krishak Sathi Sahayta Yojana** (Benefits)
- EN: The following financial assistance will be provided by the government to farmers and people doing agriculture related work:-
- GU: સરકાર દ્વારા ખેડૂતો અને કૃષિ સંબંધિત કામ કરતા લોકોને નીચેની નાણાકીય સહાય પ્રદાન કરવામાં આવશે:-
- Back-translation: The government will provide the following financial assistance to farmers and people working in agriculture-related work:-
- (judged clean; please confirm or correct)

**12. Galvanizing Organic Bio-Agro Resources Dhan (GOBARdhan)** (Eligibility)
- EN: For Individual Household Model: Individual Households identified by the Gram Panchayats.
- GU: વ્યક્તિગત ઘરેલુ મોડેલ માટે: ગ્રામ પંચાયતો દ્વારા ઓળખાયેલ વ્યક્તિગત ઘરેલુ પરિવારો.
- Back-translation: For individual household model: Individual household families identified by Gram Panchayats.
- (judged clean; please confirm or correct)

**13. Denture, Spectacles & Hearing Aid Scheme (P.B.O.C.W.W.B)** (Benefits)
- EN: Hearing Aid: ₹6,000/-.
- GU: હિયરિંગ એડ: ₹6,000/-.
- Back-translation: Hearing Aid: ₹6,000/-.
- (judged clean; please confirm or correct)

**13. Denture, Spectacles & Hearing Aid Scheme (P.B.O.C.W.W.B)** (Eligibility)
- EN: The applicant should be a resident of Punjab.
- GU: અરજદાર પંજાબનો રહેવાસી હોવો જોઈએ.
- Back-translation: The applicant should be a resident of Punjab.
- (judged clean; please confirm or correct)

**15. Financial Assistance For Marriage (APB&OCWWB)** (Title)
- EN: Financial Assistance For Marriage (APB&OCWWB)
- GU: વિવાહ માટે નાણાકીય સહાય (APB&OCWWB)
- Back-translation: Financial assistance for marriage (APB&OCWWB)
- (judged clean; please confirm or correct)

**17. Government Service Home - Tamil Nadu** (Eligibility)
- EN: The applicant should qualify as one of the following:
- GU: અરજદારને નીચેનીમાંથી કોઈ એક તરીકે લાયક થવું જોઈએ:
- Back-translation: The applicant should be eligible as one of the following:
- (judged clean; please confirm or correct)

**20. Tenzing Norgay National Adventure Award** (Benefits)
- EN: The Status of the Award will be the same as the Arjuna Awards conferred in the field of Sports by the Ministry of Youth Affairs and Sports.'
- GU: પુરસ્કારની સ્થિતિ રમતગમત ક્ષેત્રમાં યુવા બાબતો અને રમતગમત મંત્રાલય દ્વારા આપવામાં આવતી અર્જુન પુરસ્કારો જેવી જ રહેશે.
- Back-translation: The status of the award shall be the same as the Arjuna Awards given by the Ministry of Youth Affairs and Sports in the field of sports.
- (judged clean; please confirm or correct)

**20. Tenzing Norgay National Adventure Award** (Eligibility)
- EN: 3. The Ministry may increase the number of awards in a particular year for specific reasons recorded in writing and with the approval of the Minister of Youth Affairs and Sports.
- GU: 3. મંત્રાલય લખિત રીતે નોંધાયેલા ખાસ કારણો માટે અને યુવા બાબતો અને ક્રીડા મંત્રીની મંજૂરી સાથે, નિર્ધારિત વર્ષમાં પુરસ્કારોની સંખ્યા વધારી શકે છે.
- Back-translation: 3. The Ministry may increase the number of awards in the prescribed year for special reasons recorded in writing and with the approval of the Minister of Youth Affairs and Sports.
- (judged clean; please confirm or correct)

**22. Production of Tiatr in Villages/Urban Areas/Educational Institutions** (Eligibility)
- EN: The participating artistes must be from the particular village/urban area/parish (Educational Institutions only).
- GU: ભાગ લેનારા કલાકારોને નિર્દિષ્ટ ગામ/શહેર વિસ્તાર/પેરીશ (માત્ર શૈક્ષણિક સંસ્થાઓ)માંથી હોવો જોઈએ.
- Back-translation: The participating artists should be from the specified village/city area/parish (only educational institutions).
- (judged clean; please confirm or correct)

**23. Investment Promotion Scheme (IPS) for Thrust Sectors: Scheme For Marine Products** (Eligibility)
- EN: The unit should have commenced the commercial production between 20.05.2022 to 19.05.2027.
- GU: યુનિટએ 20.05.2022 થી 19.05.2027 વચ્ચે વ્યાપારી ઉત્પાદન શરૂ કર્યું હોવું જોઈએ.
- Back-translation: The unit should have commenced commercial production between 20.05.2022 and 19.05.2027.
- (judged clean; please confirm or correct)

**32. Startup India Seed Fund Scheme- For Incubators** (Eligibility)
- EN: b) A Trust registered under the Indian Trusts Act 1882, or
- GU: b) ઇન્ડિયન ટ્રસ્ટ્સ અધિનિયમ 1882 હેઠળ નોંધાયેલ ટ્રસ્ટ, અથવા
- Back-translation: b) A trust registered under the Indian Trusts Act 1882, or
- (judged clean; please confirm or correct)

**33. D. D. Kosambi Research Fellowship Scheme** (Benefits)
- EN: However, the applicant who undertakes to complete the research work on a full-time basis may be awarded the scholarship upto ₹ 30,000/- per month. In such cases, the research period shall be as decided by the selection committee.
- GU: પરંતુ, જે અરજદાર પૂર્ણ સમય આધારિત રીતે સંશોધન કાર્ય પૂર્ણ કરવા પ્રતિબદ્ધ થાય છે તેને મહિને ₹ 30,000/- સુધીનું સ્કોલરશિપ આપવામાં આવી શકે છે. આવા કિસ્સાઓમાં, સંશોધન અવધિ પસંદગી કમિટી દ્વારા નક્કી કરવામાં આવશે.
- Back-translation: However, an applicant who is committed to completing research work on a full-time basis may be given a scholarship of up to ₹ 30,000/- per month. In such cases, the research period will be determined by the selection committee.
- (judged clean; please confirm or correct)

**35. Sathiyavanimuthu Ammaiyar Ninaivu Free Supply of Sewing Machine Scheme** (Eligibility)
- EN: The age of the applicant should be between 20 to 40 years.
- GU: અરજદારની ઉંમર 20 થી 40 વર્ષ વચ્ચે હોવી જોઈએ.
- Back-translation: The applicant's age should be between 20 and 40 years.
- (judged clean; please confirm or correct)

**39. Mukhyamantri Sampoorna Pushti Yojana: Nutrition for Severely Underweight and Mod** (Benefits)
- EN: 1 Hot Cooked Meals under regular SNP 25 days
- GU: 1 નિયમિત SNP હેઠળ હોટ કૂક્ડ મીલ્સ 25 દિવસ
- Back-translation: 1 Hot cooked meals under regular SNP 25 days
- (judged clean; please confirm or correct)

**41. PRL's Vikram Sarabhai Postdoctoral Fellowship (VISHWAS)** (Benefits)
- EN: Duration: Maximum of 2 years (subject to successful annual reviews). It may be extended for 1 additional year based on justification and approval.
- GU: અવધિ: મહત્તમ 2 વર્ષ (સફળ વાર્ષિક સમીક્ષાઓ પર આધારિત). યોગ્ય કારણ અને મંજૂરી પર આધારિત 1 વધારાનો વર્ષ માટે વિસ્તૃત કરી શકાય છે.
- Back-translation: Duration: Maximum 2 years (dependent on successful annual reviews). Can be extended for 1 additional year dependent on valid reason and approval.
- (judged clean; please confirm or correct)

**41. PRL's Vikram Sarabhai Postdoctoral Fellowship (VISHWAS)** (Eligibility)
- EN: The applicant's age should be 35 years or below on the last date of application.
- GU: અરજદારની ઉંમર અરજીની અંતિમ તારીખે 35 વર્ષ અથવા તેના કરતા ઓછી હોવી જોઈએ.
- Back-translation: The age of the applicant should be 35 years or less on the last date of application.
- (judged clean; please confirm or correct)

**42. The West Bengal Incentive Scheme: Interest Subsidy on Term Loan** (Title)
- EN: The West Bengal Incentive Scheme: Interest Subsidy on Term Loan
- GU: પશ્ચિમ બંગાળ પ્રોત્સાહન યોજના: ટર્મ લોન પર વ્યાજ સબસિડી
- Back-translation: West Bengal Incentive Scheme: Interest Subsidy on Term Loan
- (judged clean; please confirm or correct)

**47. Revised Education Scheme For Children Of Artisans/Weavers Of Handicrafts And Han** (Benefits)
- EN: ₹1500 per year up to primary education
- GU: ₹1500 પ્રતિ વર્ષ પ્રાથમિક શિક્ષણ સુધી
- Back-translation: ₹1500 per year up to primary education
- (judged clean; please confirm or correct)

**47. Revised Education Scheme For Children Of Artisans/Weavers Of Handicrafts And Han** (Eligibility)
- EN: The parent of the applicant should be a Weaver/Artisan.
- GU: અરજદારના માતાપિતામાંથી કોઈ એક વણનાર/કારુગર હોવા જોઈએ.
- Back-translation: One of the applicant's parents should be a weaver/artisan.
- (judged clean; please confirm or correct)

**50. Scheme for Marketing Organisations** (Benefits)
- EN: Financial assistance is provided for the purpose of setting up new sales outlets or undertaking renovation and expansion of existing outlets for marketing Village and Small Industries (VSI) Products.
- GU: નાણાકીય સહાય ગામ અને નાની ઉદ્યોગો (VSI) ઉત્પાદનોની માર્કેટિંગ માટે નવા વેચાણ આઉટલેટ્સ સ્થાપિત કરવા અથવા હાલના આઉટલેટ્સનું નવનિર્માણ અને વિસ્તરણ કરવા માટે આપવામાં આવે છે.
- Back-translation: Financial assistance is given for establishing new sales outlets or renovation and expansion of existing outlets for marketing of village and small industries (VSI) products.
- (judged clean; please confirm or correct)

