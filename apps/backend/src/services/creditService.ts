import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export class CreditService {
  /**
   * Check if a user has sufficient credits
   */
  static async hasSufficientCredits(userId: string, requiredAmount: number = 1): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) return false;
    return user.credits >= requiredAmount;
  }

  /**
   * Deduct credits for an action and create an audit transaction
   */
  static async deductCredits(userId: string, amount: number, description: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Check current balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < amount) {
        throw new Error('Insufficient credits');
      }

      // 2. Deduct credits and increment total reports
      await tx.user.update({
        where: { id: userId },
        data: { 
          credits: { decrement: amount },
          totalReports: { increment: 1 } 
        },
      });

      // 3. Log transaction
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          description,
        },
      });
    });

    logger.info(`Deducted ${amount} credits from user ${userId} for: ${description}`);
  }

  /**
   * Grant credits to a user
   */
  static async grantCredits(userId: string, amount: number, description: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          description,
        },
      });
    });

    logger.info(`Granted ${amount} credits to user ${userId} for: ${description}`);
  }
}
