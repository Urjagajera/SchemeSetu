-- CreateEnum
CREATE TYPE "SchemeLevel" AS ENUM ('STATE', 'CENTRAL');

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" "SchemeLevel" NOT NULL,
    "authorityName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eligibility" TEXT[],
    "documents" TEXT[],

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeCategory" (
    "schemeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "SchemeCategory_pkey" PRIMARY KEY ("schemeId","categoryId")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeTag" (
    "schemeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "SchemeTag_pkey" PRIMARY KEY ("schemeId","tagId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "income" TEXT NOT NULL,
    "residence" TEXT NOT NULL,
    "land" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "interests" TEXT[],
    "dob" TIMESTAMP(3),
    "district" TEXT,
    "minority" BOOLEAN NOT NULL DEFAULT false,
    "disability" BOOLEAN NOT NULL DEFAULT false,
    "farmer" BOOLEAN NOT NULL DEFAULT false,
    "widow" BOOLEAN NOT NULL DEFAULT false,
    "veteran" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchemeTranslation" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "translatedName" TEXT NOT NULL,
    "translatedDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueTranslation" (
    "id" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "originalValue" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "translatedValue" TEXT NOT NULL,

    CONSTRAINT "ValueTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Scheme_sourceUrl_key" ON "Scheme"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeTranslation_schemeId_languageCode_key" ON "SchemeTranslation"("schemeId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "ValueTranslation_fieldType_originalValue_languageCode_key" ON "ValueTranslation"("fieldType", "originalValue", "languageCode");

-- AddForeignKey
ALTER TABLE "SchemeCategory" ADD CONSTRAINT "SchemeCategory_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeCategory" ADD CONSTRAINT "SchemeCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeTag" ADD CONSTRAINT "SchemeTag_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeTag" ADD CONSTRAINT "SchemeTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchemeTranslation" ADD CONSTRAINT "SchemeTranslation_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
