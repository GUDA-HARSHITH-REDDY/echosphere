/*
  Warnings:

  - Added the required column `category` to the `WasteReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `WasteReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WasteReport" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "title" TEXT NOT NULL;
