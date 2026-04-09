import { FREE_ANALYSIS_LIMIT } from "../../config/constants";

export const buildUserProfile = async (prisma: any, userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId }
  });

  const totalAnalyses = await prisma.analysis.count({
    where: {
      userId,
      input: {
        not: "[deleted by user]"
      }
    }
  });

  const usedAnalyses = Math.max(user.analysisCount, totalAnalyses);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    analysisCount: usedAnalyses,
    remainingFreeAnalyses: user.plan === "PRO" ? 9999 : Math.max(FREE_ANALYSIS_LIMIT - usedAnalyses, 0),
    subscriptionStatus: user.subscriptionStatus ?? null,
    subscriptionEndsAt: user.subscriptionEndsAt?.toISOString() ?? null
  };
};

export const updateUserName = async (prisma: any, userId: string, name: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { name }
  });

  return buildUserProfile(prisma, userId);
};

