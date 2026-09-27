-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" TEXT,
    "dob" TEXT,
    "gender" TEXT,
    "occupation" TEXT,
    "education" TEXT,
    "income" TEXT,
    "category" TEXT,
    "state" TEXT,
    "district" TEXT,
    "minority" TEXT,
    "disability" TEXT,
    "farmer" TEXT,
    "widow" TEXT,
    "veteran" TEXT,
    "land" TEXT,
    "profileTags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
