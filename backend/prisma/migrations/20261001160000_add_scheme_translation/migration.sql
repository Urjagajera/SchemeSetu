-- CreateTable
CREATE TABLE "SchemeTranslation" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "value" JSONB,
    "sourceHash" TEXT NOT NULL,
    "model" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchemeTranslation_schemeId_languageCode_idx" ON "SchemeTranslation"("schemeId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeTranslation_schemeId_languageCode_field_key" ON "SchemeTranslation"("schemeId", "languageCode", "field");

-- AddForeignKey
ALTER TABLE "SchemeTranslation" ADD CONSTRAINT "SchemeTranslation_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
