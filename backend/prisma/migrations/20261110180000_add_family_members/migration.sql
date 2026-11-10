-- Family profiles: eligibility answers for a family member, kept under the account holder.
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dob" TEXT,
    "gender" TEXT,
    "occupation" TEXT,
    "income" TEXT,
    "category" TEXT,
    "state" TEXT,
    "residence" TEXT,
    "land" TEXT,
    "govtJob" TEXT,
    "incomeTax" TEXT,
    "bpl" TEXT,
    "pension" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FamilyMember_userId_idx" ON "FamilyMember"("userId");

ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
