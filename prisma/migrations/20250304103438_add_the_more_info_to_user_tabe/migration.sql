/*
  Warnings:

  - You are about to drop the column `coverImageUrl` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `releaseDate` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `trailerUrl` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the `MovieCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_MovieCategory` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `dislikes` to the `Movie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hlsFilePathS3` to the `Movie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `likes` to the `Movie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Movie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `releaseYear` to the `Movie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnailUrl` to the `Movie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `views` to the `Movie` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MovieStatus" AS ENUM ('UPLOADED', 'CONVERTING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other', 'PreferNotToSay');

-- DropForeignKey
ALTER TABLE "_MovieCategory" DROP CONSTRAINT "_MovieCategory_A_fkey";

-- DropForeignKey
ALTER TABLE "_MovieCategory" DROP CONSTRAINT "_MovieCategory_B_fkey";

-- AlterTable
ALTER TABLE "Movie" DROP COLUMN "coverImageUrl",
DROP COLUMN "rating",
DROP COLUMN "releaseDate",
DROP COLUMN "title",
DROP COLUMN "trailerUrl",
ADD COLUMN     "dislikes" INTEGER NOT NULL,
ADD COLUMN     "hlsFilePathS3" TEXT NOT NULL,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "likes" INTEGER NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "releaseYear" INTEGER NOT NULL,
ADD COLUMN     "status" "MovieStatus" NOT NULL DEFAULT 'UPLOADED',
ADD COLUMN     "thumbnailUrl" TEXT NOT NULL,
ADD COLUMN     "views" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "MovieType" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "MovieCategory";

-- DropTable
DROP TABLE "_MovieCategory";

-- CreateTable
CREATE TABLE "MovieGenre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "Country" TEXT,
    "timeZone" TEXT,
    "bio" TEXT,
    "gender" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totpSecret" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationRequests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MovieGenre" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MovieGenre_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationRequests_email_key" ON "RegistrationRequests"("email");

-- CreateIndex
CREATE INDEX "_MovieGenre_B_index" ON "_MovieGenre"("B");

-- AddForeignKey
ALTER TABLE "_MovieGenre" ADD CONSTRAINT "_MovieGenre_A_fkey" FOREIGN KEY ("A") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieGenre" ADD CONSTRAINT "_MovieGenre_B_fkey" FOREIGN KEY ("B") REFERENCES "MovieGenre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
