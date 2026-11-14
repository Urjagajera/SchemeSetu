-- "Report a wrong scheme": anonymous reports (scheme, kind of problem, optional note, date). Additive only.
CREATE TABLE "SchemeReport" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchemeReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SchemeReport_createdAt_idx" ON "SchemeReport"("createdAt");

ALTER TABLE "SchemeReport" ADD CONSTRAINT "SchemeReport_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
