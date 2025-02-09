/*
  Warnings:

  - Added the required column `description` to the `MovieCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MovieCategory" ADD COLUMN     "description" TEXT NOT NULL;
