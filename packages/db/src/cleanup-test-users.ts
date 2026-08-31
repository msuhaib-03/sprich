import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Deletes users created by E2E test runs — apps/web/e2e/utils/api-client.ts's
// uniqueEmail() generates addresses ending in @dolang.test — plus everything
// that references them, so repeated CI/local runs don't accumulate rows in
// the test database indefinitely. Invoked from
// apps/web/e2e/global-teardown.ts after every Playwright run.
async function main() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: '@dolang.test' } },
    select: { id: true },
  })
  const userIds = users.map((u) => u.id)

  if (userIds.length === 0) {
    console.log('No E2E test users to clean up.')
    return
  }

  // Same FK-safe ordering as seed.ts's cleanup — none of these relations
  // cascade on delete (only PasswordResetToken does), so children must be
  // removed before their parent User row.
  await prisma.userProgress.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.sRSCard.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.speakingSession.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.weeklyReport.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.certificate.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })

  console.log(`🧹 Cleaned up ${userIds.length} E2E test user(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
