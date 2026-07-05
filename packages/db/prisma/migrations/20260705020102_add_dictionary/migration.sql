-- CreateTable
CREATE TABLE "dictionary_entries" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "german" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "pos" TEXT,
    "gender" "Gender",
    "example" TEXT,

    CONSTRAINT "dictionary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_entries_sourceId_key" ON "dictionary_entries"("sourceId");

-- CreateIndex
CREATE INDEX "dictionary_entries_german_idx" ON "dictionary_entries"("german");

-- CreateIndex
CREATE INDEX "dictionary_entries_english_idx" ON "dictionary_entries"("english");
