import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreCreditsForFailedJobs() {
  console.log('Fetching all failed jobs...');
  
  const failedJobs = await prisma.job.findMany({
    where: { status: 'FAILED', userId: { not: null } },
  });

  console.log(`Found ${failedJobs.length} failed jobs with associated users.`);

  for (const job of failedJobs) {
    try {
      await prisma.$transaction(async (tx) => {
        // Increment user credits and decrement total reports
        await tx.user.update({
          where: { id: job.userId! },
          data: {
            credits: { increment: 1 },
            totalReports: { decrement: 1 },
          },
        });

        // Add a credit transaction record for auditing
        await tx.creditTransaction.create({
          data: {
            userId: job.userId!,
            amount: 1,
            description: `Auto-refund for previously failed job: ${job.id}`,
          },
        });
      });
      console.log(`✅ Refunded 1 credit to user ${job.userId} for failed job ${job.id}`);
    } catch (err) {
      console.error(`❌ Failed to refund job ${job.id}:`, err);
    }
  }

  console.log('Credit restoration complete.');
}

restoreCreditsForFailedJobs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
