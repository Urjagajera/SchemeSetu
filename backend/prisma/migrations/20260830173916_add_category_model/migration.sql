-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "stateName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToScheme" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryToScheme_AB_unique" ON "_CategoryToScheme"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryToScheme_B_index" ON "_CategoryToScheme"("B");

-- AddForeignKey
ALTER TABLE "_CategoryToScheme" ADD CONSTRAINT "_CategoryToScheme_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToScheme" ADD CONSTRAINT "_CategoryToScheme_B_fkey" FOREIGN KEY ("B") REFERENCES "Scheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
