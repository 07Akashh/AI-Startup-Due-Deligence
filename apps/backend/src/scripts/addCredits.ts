import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCreditsToAllUsers() {
  console.log('Fetching all users from the database...');
  
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users.`);

  if (users.length === 0) {
    console.log('No users found in the database. Exiting.');
    return;
  }

  const creditsToAdd = 50; // Adding 50 credits to each user

  for (const user of users) {
    try {
      await prisma.$transaction(async (tx) => {
        // Increment user credits
        await tx.user.update({
          where: { id: user.id },
          data: {
            credits: { increment: creditsToAdd },
          },
        });

        // Add a credit transaction record for auditing
        await tx.creditTransaction.create({
          data: {
            userId: user.id,
            amount: creditsToAdd,
            description: `Admin manual top-up: added ${creditsToAdd} credits`,
          },
        });
      });
      console.log(`✅ Added ${creditsToAdd} credits to user ${user.email} (ID: ${user.id})`);
    } catch (err) {
      console.error(`❌ Failed to add credits to user ${user.id}:`, err);
    }
  }

  console.log('Successfully completed adding credits to all users.');
}

addCreditsToAllUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
