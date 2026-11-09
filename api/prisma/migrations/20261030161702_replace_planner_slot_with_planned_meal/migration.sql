/*
  Warnings:

  - You are about to drop the `PlannerSlot` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('LUNCH', 'DINNER');

-- DropForeignKey
ALTER TABLE "PlannerSlot" DROP CONSTRAINT "PlannerSlot_recipeId_fkey";

-- DropTable
DROP TABLE "PlannerSlot";

-- CreateTable
CREATE TABLE "PlannedMeal" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "peopleCount" INTEGER NOT NULL,
    "recipeId" TEXT NOT NULL,

    CONSTRAINT "PlannedMeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlannedMeal_date_mealType_key" ON "PlannedMeal"("date", "mealType");

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
