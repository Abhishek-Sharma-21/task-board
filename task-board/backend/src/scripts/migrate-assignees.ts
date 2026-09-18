import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAssignees() {
  console.log('Migrating assigneeId data to TaskAssignee table...');

  // Find all tasks with an assigneeId using raw SQL (column may not exist in schema anymore)
  const tasksWithAssignee = await prisma.$queryRawUnsafe<Array<{ id: string; assigneeId: string }>>(
    `SELECT id, "assigneeId" FROM "Task" WHERE "assigneeId" IS NOT NULL`
  );

  console.log(`Found ${tasksWithAssignee.length} tasks with assignees`);

  for (const task of tasksWithAssignee) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "TaskAssignee" (id, "taskId", "userId", "assignedAt") 
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT ("taskId", "userId") DO NOTHING`,
      task.id,
      task.assigneeId
    );
  }

  console.log('Migration complete!');
}

migrateAssignees()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
