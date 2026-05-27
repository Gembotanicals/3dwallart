import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

/**
 * Get the current authenticated user's internal DB ID.
 * Uses Clerk's auth() to get the clerkId, then looks up
 * (or creates) the user in our database.
 * Returns the internal user.id (cuid) or null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId: clerkUserId } = auth();

  if (!clerkUserId) {
    return null;
  }

  // Look up user by clerkId
  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true, email: true, name: true },
  });

  // If user doesn't exist in our DB yet, create them (sync from Clerk)
  if (!user) {
    try {
      // Fetch user details from Clerk
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerkUser = await clerkClient.users.getUser(clerkUserId);

      const email = clerkUser.emailAddresses?.[0]?.emailAddress || `${clerkUserId}@clerk.placeholder`;
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
      const avatar = clerkUser.imageUrl || null;

      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email,
          name,
          avatar,
        },
        select: { id: true, email: true, name: true },
      });
    } catch (error) {
      console.error("Failed to sync Clerk user to DB:", error);
      // Try a minimal create as fallback
      try {
        user = await prisma.user.create({
          data: {
            clerkId: clerkUserId,
            email: `${clerkUserId}@clerk.placeholder`,
          },
          select: { id: true, email: true, name: true },
        });
      } catch {
        return null;
      }
    }
  }

  return user.id;
}
