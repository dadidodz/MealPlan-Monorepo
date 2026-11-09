-- AlterTable
ALTER TABLE "Recipe" DROP COLUMN "icon",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other';

