# Gender / category extraction — dry run (no database writes)

Schemes evaluated: 4722. Sample below: 39 schemes chosen deterministically.

| | Schemes | Share |
|---|---|---|
| Gender restriction extracted | 254 | 5.4% |
| Category restriction extracted | 447 | 9.5% |
| Both | 22 | 0.5% |

Gender values: {"female":232,"transgender":12,"male":10}

Category values: {"sc":182,"st":132,"sc,st":74,"obc":38,"general":12,"sc,obc":3,"st,obc":3,"sc,st,obc":3}

For each scheme: the decision, the sentences that drove it, and the sentences that mention gender/category but were REJECTED (with the reason). Please look for (a) wrong decisions and (b) rejected sentences that should have counted.

---
### Mangalya Scheme For Widow Remarriage
- Link: https://www.myscheme.gov.in/schemes/mswr
- Why it is in the sample: gender = female
- **Decision: gender = female, category = null**
- Gender driven by:
  - "Women belonging to the age group of 18 to 50 years who are legally divorced and widowed are eligible to apply under the scheme."
- Gender mentions REJECTED:
  - "The applicant should be a widow and a divorced woman." — mentions gender but is not an explicit rule on the applicant

### Devnarayan Scooty Distribution And Incentive Scheme
- Link: https://www.myscheme.gov.in/schemes/dsdais
- Why it is in the sample: gender = female
- **Decision: gender = female, category = null**
- Gender driven by:
  - "Girl students should be from extremely backward classes of Rajasthan origin."

### Financial Assistance for Miscarriage for the Construction Workers
- Link: https://www.myscheme.gov.in/schemes/famcw
- Why it is in the sample: gender = female
- **Decision: gender = female, category = null**
- Gender driven by:
  - "The applicant should be a registered women member Under the Delhi Building and Other Construction Workers Welfare Board."
- Gender mentions REJECTED:
  - "The applicant should be a wife of registered male member Under the Delhi Building and Other Construction Workers Welfare Board." — marriage/relationship wording, not a rule on the applicant

### To Increase Fish Seed Production and Inland Fisheries Resources in Tribal Areas: Fish Seed Rearing by Women - Gujarat
- Link: https://www.myscheme.gov.in/schemes/pfspfsrwguj
- Why it is in the sample: gender = female
- **Decision: gender = female, category = st**
- Gender driven by:
  - "The applicant must be an Individual woman involved in inland fisheries activities."
- Gender mentions REJECTED:
  - "Preference/Priority/Reservation: The scheme is specifically targeted at Scheduled Tribe women." — relaxation/priority/quota/benefit tier, not a gate
- Category driven by:
  - "The applicant must be from the Scheduled Tribe."
- Category mentions REJECTED:
  - "Preference/Priority/Reservation: The scheme is specifically targeted at Scheduled Tribe women." — relaxation/priority/quota/reservation note, not a gate

### Maternity Assistance for the Construction Worker
- Link: https://www.myscheme.gov.in/schemes/mafcws
- Why it is in the sample: gender = female
- **Decision: gender = female, category = null**
- Gender driven by:
  - "Women should be pregnant."
- Gender mentions REJECTED:
  - "Registered women member Under the Sikkim Building and Other Construction Workers Welfare Board." — mentions gender but is not an explicit rule on the applicant

### Distance Education Scheme for Girls
- Link: https://www.myscheme.gov.in/schemes/desfg
- Why it is in the sample: gender = female
- **Decision: gender = female, category = null**
- Gender driven by:
  - "The applicant should be a girl student."
- Gender mentions REJECTED:
  - "The applicant who is availing of other fee reimbursement in State Government Schemes during the same tenure is not eligible in this scheme. But these students will get reimbursement of difference amount of "Existing Scholarship" and "Distance Education Scheme " — relaxation/priority/quota/benefit tier, not a gate

### Minimata Mahtari Jatan Yojana
- Link: https://www.myscheme.gov.in/schemes/bpsy
- Why it is in the sample: gender = female
- **Decision: gender = female, category = null**
- Gender driven by:
  - "The applicant should be a woman worker."
- Gender mentions REJECTED:
  - "Note: In case of the death of the beneficiary female worker during delivery, the payment of the Assistance Scheme will be payable to her husband (full amount)." — relaxation/priority/quota/benefit tier, not a gate

### Financial Incentive to SC Meritorious Boy Students
- Link: https://www.myscheme.gov.in/schemes/fascmbs
- Why it is in the sample: gender = male
- **Decision: gender = male, category = sc**
- Gender driven by:
  - "The applicant must be male."
- Category driven by:
  - "The applicant must belong to a Scheduled Caste (SC) community of Assam."

### Ambubhai Purani Award
- Link: https://www.myscheme.gov.in/schemes/apyg
- Why it is in the sample: gender = male
- **Decision: gender = male, category = null**
- Gender driven by:
  - "The applicant should be a male individual."

### Sweekruti: Pre & Post Matric Scholarship
- Link: https://www.myscheme.gov.in/schemes/sppms
- Why it is in the sample: gender = transgender
- **Decision: gender = transgender, category = null**
- Gender driven by:
  - "The applicant must be a transgender person."

### Pension Scheme for Transgender
- Link: https://www.myscheme.gov.in/schemes/psft
- Why it is in the sample: gender = transgender
- **Decision: gender = transgender, category = null**
- Gender driven by:
  - "The applicant should be Transgender."

### Marriage Assistance For Legally Married Transgender Couples
- Link: https://www.myscheme.gov.in/schemes/malmtc
- Why it is in the sample: gender = transgender
- **Decision: gender = transgender, category = null**
- Gender driven by:
  - "The applicant should be Transgender."
- Gender mentions REJECTED:
  - "The applicants must possess a Transgender Identity card." — mentions gender but is not an explicit rule on the applicant
  - "Transgender couples must apply for financial assistance after 6 months from the date of marriage and not exceeding the 1-year period." — marriage/relationship wording, not a rule on the applicant
  - "For receiving the aid, one of the partners should belong to the Transgender community." — mentions gender but is not an explicit rule on the applicant

### Centrally Sponsored Scheme of Upgradation of Merit of Scheduled Caste Students
- Link: https://www.myscheme.gov.in/schemes/css-umscs
- Why it is in the sample: category = sc
- **Decision: gender = null, category = sc**
- Gender mentions REJECTED:
  - "Girls students are given equal preference with awards allocated in 50:50 ratio between boys and girls." — relaxation/priority/quota/benefit tier, not a gate
  - "Unutilized awards by girls may be used by boys and vice-versa." — mentions gender but is not an explicit rule on the applicant
- Category driven by:
  - "The applicant must be a Scheduled Caste student."
  - "The applicant must be from districts selected based on highest Scheduled Caste population and identified as Educationally Backward Districts (for new selections from 2014-15 onwards)."
- Category mentions REJECTED:
  - "At least 3% representation for disabled Scheduled Caste students wherever possible." — relaxation/priority/quota/reservation note, not a gate

### Assistance to Scheduled Caste Farmers for Installation of Submersible / Centrifugal Motor Pumpsets With Accessories
- Link: https://www.myscheme.gov.in/schemes/ascfiscmpa
- Why it is in the sample: category = sc
- **Decision: gender = null, category = sc**
- Category driven by:
  - "The applicant should be from the Scheduled Caste Category."

### Special Livestock Insurance Scheme
- Link: https://www.myscheme.gov.in/schemes/slisc
- Why it is in the sample: category = sc
- **Decision: gender = null, category = sc**
- Category driven by:
  - "The applicant should be from a Scheduled Caste family."
- Category mentions REJECTED:
  - "*Livestock units established under the “Scheme for Providing Employment Opportunities to Scheduled Castes” are automatically eligible." — mentions a category but is not phrased as a rule on the applicant

### Cycle Distribution Scheme
- Link: https://www.myscheme.gov.in/schemes/cds
- Why it is in the sample: category = st
- **Decision: gender = female, category = st**
- Gender driven by:
  - "The applicant should be a girl student."
  - "The girl student should be a native of Madhya Pradesh."
  - "The girl student should be studying in Class 11."
  - "The girl student should belong to the Scheduled Tribe category."
  - "The girl student who did not receive a cycle in Class 9 is eligible under the scheme."
- Gender mentions REJECTED:
  - "The girl student should travel more than 2 km to reach her school." — relaxation/priority/quota/benefit tier, not a gate
- Category driven by:
  - "The girl student should belong to the Scheduled Tribe category."

### Pre-Matric Scholarship For Scheduled Tribe Students Studying In Classes 9th & 10th
- Link: https://www.myscheme.gov.in/schemes/pmsstsscnt
- Why it is in the sample: category = st
- **Decision: gender = null, category = st**
- Category driven by:
  - "The applicant must belong to the Scheduled Tribe, as specified in relation to the State or Union Territory to which they actually belong (Domicile State)."

### Assistance for Power Driven Chaff Cutter Scheme under Tribal Area Sub Plan (TASP- ST Category)
- Link: https://www.myscheme.gov.in/schemes/apdccstaspstc
- Why it is in the sample: category = st
- **Decision: gender = null, category = st**
- Category driven by:
  - "The beneficiary should belong to the Scheduled Tribe category."

### Distribution of Free Books and Stationery to SC/ST Students
- Link: https://www.myscheme.gov.in/schemes/dfbsscsts
- Why it is in the sample: category = sc,st
- **Decision: gender = null, category = sc,st**
- Category driven by:
  - "The applicant should belong to the Scheduled Caste or Scheduled Tribe category."

### Dr. Bhimrao Ambedkar Kamdhenu Yojana
- Link: https://www.myscheme.gov.in/schemes/dbaky
- Why it is in the sample: category = sc,st
- **Decision: gender = null, category = sc,st**
- Category driven by:
  - "The applicant belongs to all categories: SC, ST, and others are eligible to apply."

### Mukhyamantri Anusuchit Jati / Anusuchit Janjati Udyami Yojana
- Link: https://www.myscheme.gov.in/schemes/majajuy
- Why it is in the sample: category = sc,st
- **Decision: gender = null, category = sc,st**
- Category driven by:
  - "The applicant must belong to the Schedule Castes (SC)/ Scheduled Tribe (ST) category."

### Construction of Hostels for OBC Boys and Girls
- Link: https://www.myscheme.gov.in/schemes/chobcbg
- Why it is in the sample: category = obc
- **Decision: gender = null, category = obc**
- Gender mentions REJECTED:
  - "Application Process Offline Step 1: Eligible agencies seeking assistance under the scheme may download the proposal format prescribed in Annexure-I of the official scheme document. Step 2: Complete the form and submit it along with all the necessary documents " — relaxation/priority/quota/benefit tier, not a gate
- Category driven by:
  - "Students whose castes are included in the Central/State/UT list of Other Backward Classes and who do not belong to the "creamy layer"."
- Category mentions REJECTED:
  - "Other things, being equal preference will be given to OBC students hailing from low-income families." — relaxation/priority/quota/reservation note, not a gate

### Scheme for Grant of Additional Scholarship to the Students of Other Backward Classes of Andaman and Nicobar Islands, for Pursuing Higher Studies Anywhere in India after Secondary Level (Except Class XI & XII)
- Link: https://www.myscheme.gov.in/schemes/sgassobcaniphsaislecxixii
- Why it is in the sample: category = obc
- **Decision: gender = null, category = obc**
- Category driven by:
  - "Only those students who belong to OBCs so specified and notified in relation to Andaman and Nicobar Islands and are domicile of Andaman & Nicobar Islands and who have passed Secondary (Class X)/Senior Secondary (Class XII) from a recognized Board of School Education and pursuing higher education in a recognized Institution/University shall be eligible for award of this scholarship."
- Category mentions REJECTED:
  - "The scholarship shall be open to students belonging to a non-creamy layer of OBC of the Andaman and Nicobar Islands listed in the Notification issued by the Andaman and Nicobar Administration dated 16th December 2005 and amendments therein." — negated wording

### Swaran Jayanti Ashray Yojana - Himachal Pradesh
- Link: https://www.myscheme.gov.in/schemes/sjay-hp
- Why it is in the sample: category = multi-set (obc combos)
- **Decision: gender = null, category = sc,st,obc**
- Category driven by:
  - "The applicant should belong to Scheduled Castes (SC), Scheduled Tribes (ST), or Other Backward Classes (OBC)."

### Technical Education Scholarship Scheme for ITI Level
- Link: https://www.myscheme.gov.in/schemes/tessitil
- Why it is in the sample: category = multi-set (obc combos)
- **Decision: gender = null, category = sc,st,obc**
- Gender mentions REJECTED:
  - "The applicant should be studying in a Government or Government-recognized Industrial Training Institute (I.T.I.) or I.T.I. for Women in Himachal Pradesh." — relaxation/priority/quota/benefit tier, not a gate
- Category driven by:
  - "The applicant should belong to Scheduled Caste (SC), Scheduled Tribe (ST), or Other Backward Class (OBC) as notified by the Himachal Pradesh State Government."

### Dr. Ambedakar Centrally Sponsored Scheme of Post-Matric Scholarships for the Economically Backward Class (EBC) Students
- Link: https://www.myscheme.gov.in/schemes/dacsspostmsebcs
- Why it is in the sample: category includes general
- **Decision: gender = null, category = general**
- Gender mentions REJECTED:
  - "Only two boys of the same parents/guardians will be entitled to receive scholarships. This restriction will, however, not apply to girls. Accordingly, scholarships availed by girls of the same parents/guardian will not adversely affect the admissibility of ava" — mentions gender but is not an explicit rule on the applicant
- Category driven by:
  - "The scholarships will be open to Indian nationals belonging to the General Category (Other than Schedule Caste, Schedule Tribe and Other Backward Classes)."

### General Pre Matric Scholarship-Uttar Pradesh
- Link: https://www.myscheme.gov.in/schemes/gpmsup
- Why it is in the sample: category includes general
- **Decision: gender = null, category = general**
- Category driven by:
  - "Beneficiary must belong to the General category."

### Mahila Kisan Yojana
- Link: https://www.myscheme.gov.in/schemes/mkyh
- Why it is in the sample: has BOTH a gender and a category restriction
- **Decision: gender = female, category = sc**
- Gender driven by:
  - "The applicant should be a female."
- Category driven by:
  - "The applicant should be from a 'Scheduled Caste'."

### Grant of Financial Assistance to Poor Scheduled Caste Pregnant & Lactating Women
- Link: https://www.myscheme.gov.in/schemes/gfapscplw
- Why it is in the sample: has BOTH a gender and a category restriction
- **Decision: gender = female, category = sc**
- Gender driven by:
  - "The applicant should be a woman."
- Category driven by:
  - "The applicant should be from Scheduled Caste."

### Kanya Saksharta Protsahan Yojana (For Scheduled Caste Girls)
- Link: https://www.myscheme.gov.in/schemes/kspyscg
- Why it is in the sample: has BOTH a gender and a category restriction
- **Decision: gender = female, category = sc**
- Gender driven by:
  - "The applicant should be a girl student."
  - "The girl student should be a native of Madhya Pradesh."
  - "The girl student should belong to the Scheduled Caste category."
  - "All Scheduled Caste girl students who have passed Class 10 and are entering Class 11 are eligible for the scheme."
  - "The girl student should be pursuing her education continuously."
  - "The girl student should be enrolled in a government or recognized government school/institution and attend regularly."
- Category driven by:
  - "The girl student should belong to the Scheduled Caste category."
  - "All Scheduled Caste girl students who have passed Class 10 and are entering Class 11 are eligible for the scheme."

### Noni Suraksha Yojana
- Link: https://www.myscheme.gov.in/schemes/nsycg
- Why it is in the sample: NEGATIVE: girl-child/daughter scheme (gender null by design)
- **Decision: gender = null, category = null**
- Gender left null because: girl-child / daughter scheme: gender left null by design
- Gender mentions REJECTED:
  - "The girl's parents must be permanent residents of Chhattisgarh." — mentions gender but is not an explicit rule on the applicant
  - "The benefit under the scheme is limited to two daughters. If there are two sons, a third daughter is not eligible for the benefit." — girl-child / daughter wording: beneficiary is the child, applicant is the parent
  - "In the case of the second girl child, it is mandatory for the mother or father to have adopted a permanent family planning method before applying." — girl-child / daughter wording: beneficiary is the child, applicant is the parent
  - "All girls born as twins or more than one child in the first/second delivery will receive the benefit of the scheme." — relaxation/priority/quota/benefit tier, not a gate
  - "If a third girl child is born after the benefit has been given to twin girls born in the first delivery, the third girl child will not receive the benefit of the scheme." — girl-child / daughter wording: beneficiary is the child, applicant is the parent
  - "If the family has legally adopted a girl, she will be considered eligible and given the benefit of the scheme if she meets the other criteria." — marriage/relationship wording, not a rule on the applicant
  - "The girl must not marry before the age of 18, and she must complete her 12th standard education to be eligible for benefits under the scheme." — marriage/relationship wording, not a rule on the applicant
  - "Girls born to HIV-affected couples (including A.P.L. families) after April 1, 2016, will also be given the benefit of the scheme for the first two girls." — mentions gender but is not an explicit rule on the applicant

### Shagun Scheme (P.B.O.C.W.W.B)
- Link: https://www.myscheme.gov.in/schemes/sspbocwwb
- Why it is in the sample: NEGATIVE: girl-child/daughter scheme (gender null by design)
- **Decision: gender = null, category = null**
- Gender left null because: girl-child / daughter scheme: gender left null by design
- Gender mentions REJECTED:
  - "The applicant should be a registered member/female member (for self-marriage) of the Punjab Building and Other Construction Workers Welfare Board or an unmarried daughter of the member." — girl-child / daughter wording: beneficiary is the child, applicant is the parent
  - "It should be the first marriage of the daughter/ self." — girl-child / daughter wording: beneficiary is the child, applicant is the parent
  - "The scheme applies only to the marriage of up to two daughters." — girl-child / daughter wording: beneficiary is the child, applicant is the parent

### Savitribai Jyotirao Phule Fellowship For Single Girl Child
- Link: https://www.myscheme.gov.in/schemes/sjpfsgc
- Why it is in the sample: NEGATIVE: SC/ST/OBC only appears as a relaxation/priority/reservation
- **Decision: gender = null, category = null**
- Gender left null because: girl-child / daughter scheme: gender left null by design
- Gender mentions REJECTED:
  - "Any single girl child of her parents pursuing Ph.D. in any stream/subject in recognised Universities/Colleges/ Institutes is eligible to apply under the scheme." — girl-child / daughter wording: beneficiary is the child, applicant is the parent
  - "The scheme is applicable to such a single girl child who has registered herself in regular, full-time Ph. D. program." — girl-child / daughter wording: beneficiary is the child, applicant is the parent
  - "Girl students up to the age of 40 years for general category and 45 years for the reserved categories i.e. SC/ST/OBC and PWD (Persons with Disabilities) as on the last date of submission of online application are eligible." — relaxation/priority/quota/benefit tier, not a gate
- Category mentions REJECTED:
  - "Girl students up to the age of 40 years for general category and 45 years for the reserved categories i.e. SC/ST/OBC and PWD (Persons with Disabilities) as on the last date of submission of online application are eligible." — relaxation/priority/quota/reservation note, not a gate

### Foreign Study Loan Scheme (GUEEDC)
- Link: https://www.myscheme.gov.in/schemes/fsls
- Why it is in the sample: NEGATIVE: SC/ST/OBC only appears as a relaxation/priority/reservation
- **Decision: gender = null, category = null**
- Category mentions REJECTED:
  - "The applicant must belong to the Unreserved category." — relaxation/priority/quota/reservation note, not a gate

### Dr. Ambedkar Medhavi Chattar Sansodhit Yojna
- Link: https://www.myscheme.gov.in/schemes/amcsy
- Why it is in the sample: NEGATIVE: category list includes groups we do not model (DNT, minority, landless...)
- **Decision: gender = null, category = null**
- Category mentions REJECTED:
  - "For Students of Backward Classes, Scheduled Castes, Nomadic, DNTs, Semi-Nomadic, Vimukt Jati, and Tapriwas Jaati - matric-(Urban 70%) (Rural 60%).,10+2-(Urban 75%) (Rural 70%) , Graduation-Urban 65%) (Rural 60%)" — list includes groups outside SC/ST/OBC/general (e.g. DNT, minority, EWS, landless)

### Composite Loan Scheme
- Link: https://www.myscheme.gov.in/schemes/cls
- Why it is in the sample: NEGATIVE: category list includes groups we do not model (DNT, minority, landless...)
- **Decision: gender = null, category = null**
- Category mentions REJECTED:
  - "The applicant should be from one of the following target groups - Scheduled Caste, Scheduled Tribe, Other Backward Class, Minority, Persons with Disability." — list includes groups outside SC/ST/OBC/general (e.g. DNT, minority, EWS, landless)

### Integrated Hostel Scheme
- Link: https://www.myscheme.gov.in/schemes/ihs
- Why it is in the sample: NEGATIVE: marriage/partner context
- **Decision: gender = null, category = null**
- Gender mentions REJECTED:
  - "The applicant's school should be within a maximum distance of 3 km for girls or 8 km for boys." — relaxation/priority/quota/benefit tier, not a gate
- Category mentions REJECTED:
  - "The applicant should belong to the Other Backward Castes, Scheduled Castes, Scheduled Tribes category." — marriage/partner context, not the applicant's own category

### Assistance to Co-operative Irrigation Societies (Trible Area)
- Link: https://www.myscheme.gov.in/schemes/atcista
- Why it is in the sample: NEGATIVE: mentions a category but not phrased as a rule on the applicant
- **Decision: gender = null, category = null**
- Category mentions REJECTED:
  - "The Scheme is applicable to the Scheduled Tribe (ST) category." — mentions a category but is not phrased as a rule on the applicant

### State Research Scholarship
- Link: https://www.myscheme.gov.in/schemes/srsn
- Why it is in the sample: NEGATIVE: mentions a category but not phrased as a rule on the applicant
- **Decision: gender = null, category = null**
- Category mentions REJECTED:
  - "Applicable for Scheduled Tribe and Indigenous students of Nagaland who are pursuing Ph.D/D.Litt. course from recognized Universities within India." — mentions a category but is not phrased as a rule on the applicant
