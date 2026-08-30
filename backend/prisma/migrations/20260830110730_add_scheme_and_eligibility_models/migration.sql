-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "offeredBy" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "benefits" TEXT[],
    "documentRequirements" TEXT[],
    "applicationMode" TEXT,
    "applicationProcess" TEXT,
    "eligibilityRawText" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityCriteria" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "incomeMinAnnual" INTEGER,
    "incomeMaxAnnual" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EligibilityCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_link_key" ON "Scheme"("link");

-- CreateIndex
CREATE UNIQUE INDEX "EligibilityCriteria_schemeId_key" ON "EligibilityCriteria"("schemeId");

-- AddForeignKey
ALTER TABLE "EligibilityCriteria" ADD CONSTRAINT "EligibilityCriteria_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
