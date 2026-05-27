-- DropTable
DROP TABLE "accounts";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "verification_tokens";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "clerkId" TEXT;
ALTER TABLE "users" DROP COLUMN "password";
ALTER TABLE "users" DROP COLUMN "emailVerified";

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");
