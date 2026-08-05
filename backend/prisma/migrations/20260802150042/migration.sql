-- DropForeignKey
ALTER TABLE "feeders" DROP CONSTRAINT "feeders_substationId_fkey";

-- AlterTable
ALTER TABLE "feeders" ALTER COLUMN "substationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "feeders" ADD CONSTRAINT "feeders_substationId_fkey" FOREIGN KEY ("substationId") REFERENCES "substations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
