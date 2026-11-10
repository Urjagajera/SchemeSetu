-- Status rules on schemes (government job, income tax, BPL, pension) and the matching profile answers.
ALTER TABLE "EligibilityCriteria" ADD COLUMN     "govtJob" TEXT,
ADD COLUMN     "incomeTax" TEXT,
ADD COLUMN     "bpl" TEXT,
ADD COLUMN     "pension" TEXT;

ALTER TABLE "Profile" ADD COLUMN     "govtJob" TEXT,
ADD COLUMN     "incomeTax" TEXT,
ADD COLUMN     "bpl" TEXT,
ADD COLUMN     "pension" TEXT;
