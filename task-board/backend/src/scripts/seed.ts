import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

const passwordHash = bcrypt.hashSync('password123', 10);

const seedUsers = [
  { name: 'Abhishek Sharma', email: 'owner@forgeboard.com', passwordHash },
  { name: 'Sarah Connor', email: 'admin1@forgeboard.com', passwordHash },
  { name: 'John Doe', email: 'admin2@forgeboard.com', passwordHash },
  { name: 'Priya Patel', email: 'member1@forgeboard.com', passwordHash },
  { name: 'Rahul Kumar', email: 'member2@forgeboard.com', passwordHash },
  { name: 'Alex Smith', email: 'member3@forgeboard.com', passwordHash },
  { name: 'Elena Rostova', email: 'member4@forgeboard.com', passwordHash },
];

async function seed() {
  console.log('Connecting to database...');
  await prisma.$connect();
  console.log('Clearing database collections...');

  // Delete in reverse order of relationships to prevent foreign key violations
  await prisma.activity.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.boardColumn.deleteMany({});
  await prisma.board.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding Users...');
  const users: any[] = [];
  for (const u of seedUsers) {
    const createdUser = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        refreshTokenJtis: [],
      },
    });
    users.push(createdUser);
  }
  const [owner, admin1, admin2, member1, member2, member3, member4] = users;

  console.log('Seeding Workspaces & Members...');
  // Workspace 1
  const ws1 = await prisma.workspace.create({
    data: { name: 'Northstar Studio', ownerId: owner.id },
  });
  const ws1Members = [
    { workspaceId: ws1.id, userId: owner.id, role: 'owner' },
    { workspaceId: ws1.id, userId: admin1.id, role: 'admin' },
    { workspaceId: ws1.id, userId: admin2.id, role: 'admin' },
    { workspaceId: ws1.id, userId: member1.id, role: 'member' },
    { workspaceId: ws1.id, userId: member2.id, role: 'member' },
    { workspaceId: ws1.id, userId: member3.id, role: 'member' },
    { workspaceId: ws1.id, userId: member4.id, role: 'member' },
  ];
  for (const mem of ws1Members) {
    await prisma.workspaceMember.create({ data: mem });
  }

  // Workspace 2
  const ws2 = await prisma.workspace.create({
    data: { name: 'Forge Labs', ownerId: owner.id },
  });
  const ws2Members = [
    { workspaceId: ws2.id, userId: owner.id, role: 'owner' },
    { workspaceId: ws2.id, userId: admin1.id, role: 'admin' },
    { workspaceId: ws2.id, userId: member1.id, role: 'member' },
    { workspaceId: ws2.id, userId: member2.id, role: 'member' },
  ];
  for (const mem of ws2Members) {
    await prisma.workspaceMember.create({ data: mem });
  }

  console.log('Seeding Projects & Boards...');
  // WS1 Projects
  const p1 = await prisma.project.create({
    data: {
      name: 'Launch Control',
      description: 'Rocket guidance systems and launch operations workspace.',
      status: 'Active',
      workspaceId: ws1.id,
      createdBy: owner.id,
    },
  });

  const p2 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Redesigning the main corporate portal for the launch services.',
      status: 'Planning',
      workspaceId: ws1.id,
      createdBy: admin1.id,
    },
  });

  // WS2 Projects
  const p3 = await prisma.project.create({
    data: {
      name: 'R&D Propulsion',
      description: 'Propulsion research division and fuel systems testing.',
      status: 'Active',
      workspaceId: ws2.id,
      createdBy: owner.id,
    },
  });

  // Boards
  const b1 = await prisma.board.create({
    data: {
      name: 'Sprint 04',
      description: 'Current development sprint board.',
      projectId: p1.id,
      createdBy: owner.id,
    },
  });

  const b2 = await prisma.board.create({
    data: {
      name: 'Marketing Board',
      description: 'Social outreach campaigns.',
      projectId: p2.id,
      createdBy: admin1.id,
    },
  });

  const b3 = await prisma.board.create({
    data: {
      name: 'R&D Kanban',
      description: 'Fuel system design cards.',
      projectId: p3.id,
      createdBy: owner.id,
    },
  });

  console.log('Seeding Board Columns...');
  const columnsList = ['TODO', 'IN PROGRESS', 'REVIEW', 'DONE'];
  const columnsB1: any[] = [];
  const columnsB2: any[] = [];
  const columnsB3: any[] = [];

  for (let i = 0; i < columnsList.length; i++) {
    columnsB1.push(await prisma.boardColumn.create({ data: { name: columnsList[i], boardId: b1.id, position: i } }));
    columnsB2.push(await prisma.boardColumn.create({ data: { name: columnsList[i], boardId: b2.id, position: i } }));
    columnsB3.push(await prisma.boardColumn.create({ data: { name: columnsList[i], boardId: b3.id, position: i } }));
  }

  console.log('Seeding Tasks...');
  const tasksData = [
    // Sprint 04 Board Tasks
    {
      title: 'Database Design Schema',
      description: 'Implement mongoose models for tasks, columns, and activities.',
      projectId: p1.id,
      boardId: b1.id,
      columnId: columnsB1[0].id, // TODO
      position: 0,
      priority: 'Urgent',
      assigneeId: admin2.id,
      labels: ['Backend', 'Database'],
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Set up Docker configurations',
      description: 'Configure Dockerfile and docker-compose configurations for deployment.',
      projectId: p1.id,
      boardId: b1.id,
      columnId: columnsB1[0].id, // TODO
      position: 1,
      priority: 'Low',
      assigneeId: member1.id,
      labels: ['Devops'],
    },
    {
      title: 'Create API Skeleton',
      description: 'Hook up express app router and error handler middlewares.',
      projectId: p1.id,
      boardId: b1.id,
      columnId: columnsB1[0].id, // TODO
      position: 2,
      priority: 'High',
      assigneeId: admin1.id,
      labels: ['Backend'],
    },
    {
      title: 'Fix auth middleware token refresh',
      description: 'Troubleshoot refresh token rotation cookie problems.',
      projectId: p1.id,
      boardId: b1.id,
      columnId: columnsB1[1].id, // IN PROGRESS
      position: 0,
      priority: 'High',
      assigneeId: member2.id,
      labels: ['Security', 'Bug'],
    },
    {
      title: 'Collaborative Kanban board UI',
      description: 'Write frontend dashboard, sidebar routing, and workspace loaders.',
      projectId: p1.id,
      boardId: b1.id,
      columnId: columnsB1[1].id, // IN PROGRESS
      position: 1,
      priority: 'High',
      assigneeId: owner.id,
      labels: ['Frontend', 'UI'],
    },
    {
      title: 'Socket.IO room setup',
      description: 'Organize websocket rooms by board ID.',
      projectId: p1.id,
      boardId: b1.id,
      columnId: columnsB1[1].id, // IN PROGRESS
      position: 2,
      priority: 'Urgent',
      assigneeId: owner.id,
      labels: ['Realtime'],
    },
    {
      title: 'Login/Register form validation',
      description: 'Implement React Hook Form client-side schema validations using Zod.',
      projectId: p1.id,
      boardId: b1.id,
      columnId: columnsB1[2].id, // REVIEW
      position: 0,
      priority: 'Medium',
      assigneeId: member3.id,
      labels: ['Frontend'],
    },
    {
      title: 'API Unit tests',
      description: 'Write supertest integrations verifying workspace roles permissions.',
      projectId: p1.id,
      boardId: b1.id,
      columnId: columnsB1[2].id, // REVIEW
      position: 1,
      priority: 'Medium',
      assigneeId: member4.id,
      labels: ['Testing'],
    },
    {
      title: 'Initial setup with Vite & TypeScript',
      description: 'Configure Vite build toolchain and tsconfig paths.',
      projectId: p1.id,
      boardId: b1.id,
      columnId: columnsB1[3].id, // DONE
      position: 0,
      priority: 'Medium',
      assigneeId: owner.id,
      labels: ['Frontend'],
    },

    // Marketing Board Tasks
    {
      title: 'Social outreach campaign',
      description: 'Write initial copy for LinkedIn and Twitter launch announcements.',
      projectId: p2.id,
      boardId: b2.id,
      columnId: columnsB2[0].id,
      position: 0,
      priority: 'Low',
      assigneeId: member3.id,
      labels: ['Marketing'],
    },
    {
      title: 'Produce feature demo video',
      description: 'Screen record drag and drop and typing indicators sync.',
      projectId: p2.id,
      boardId: b2.id,
      columnId: columnsB2[1].id,
      position: 0,
      priority: 'High',
      assigneeId: member1.id,
      labels: ['Video'],
    },
    {
      title: 'Prepare press release draft',
      description: 'Draft release notes for PR agency reviews.',
      projectId: p2.id,
      boardId: b2.id,
      columnId: columnsB2[3].id,
      position: 0,
      priority: 'Medium',
      assigneeId: admin1.id,
      labels: ['PR'],
    },

    // R&D Kanban Tasks (8 Tasks)
    {
      title: 'Analyze kerosene fuel injector dynamics',
      description: 'Simulate high flow rates dynamics.',
      projectId: p3.id,
      boardId: b3.id,
      columnId: columnsB3[0].id,
      position: 0,
      priority: 'Urgent',
      assigneeId: member1.id,
      labels: ['Simulation'],
    },
    {
      title: 'Test combustion chamber pressures',
      description: 'Measure acoustic frequencies under heat loads.',
      projectId: p3.id,
      boardId: b3.id,
      columnId: columnsB3[0].id,
      position: 1,
      priority: 'High',
      labels: ['Lab-Test'],
    },
    {
      title: 'Review valves leakage stats',
      description: 'Gather feedback on cryogenic seals leakage counts.',
      projectId: p3.id,
      boardId: b3.id,
      columnId: columnsB3[0].id,
      position: 2,
      priority: 'Medium',
      assigneeId: member2.id,
      labels: ['Quality'],
    },
    {
      title: 'Optimize liquid oxygen pump flow',
      description: 'Adjust impeller geometry for higher flow.',
      projectId: p3.id,
      boardId: b3.id,
      columnId: columnsB3[1].id,
      position: 0,
      priority: 'High',
      assigneeId: owner.id,
      labels: ['CAD'],
    },
    {
      title: 'Check structural load bounds of nozzle',
      description: 'Validate thickness boundaries in CAD.',
      projectId: p3.id,
      boardId: b3.id,
      columnId: columnsB3[1].id,
      position: 1,
      priority: 'Medium',
      assigneeId: member1.id,
      labels: ['FEA'],
    },
    {
      title: 'Compare gas generator models',
      description: 'Audit efficiency parameters of open vs closed cycles.',
      projectId: p3.id,
      boardId: b3.id,
      columnId: columnsB3[2].id,
      position: 0,
      priority: 'Low',
      labels: ['Research'],
    },
    {
      title: 'Calibrate pressure gauges',
      description: 'Annual certification of pressure sensors in lab.',
      projectId: p3.id,
      boardId: b3.id,
      columnId: columnsB3[3].id,
      position: 0,
      priority: 'Low',
      assigneeId: member2.id,
      labels: ['Calibration'],
    },
    {
      title: 'Draft nozzle heat flow findings',
      description: 'Submit technical note to committee.',
      projectId: p3.id,
      boardId: b3.id,
      columnId: columnsB3[3].id,
      position: 1,
      priority: 'Medium',
      assigneeId: admin1.id,
      labels: ['Documentation'],
    },
  ];

  const insertedTasks: any[] = [];
  for (const t of tasksData) {
    const task = await prisma.task.create({
      data: {
        createdBy: owner.id,
        ...t,
      },
    });
    insertedTasks.push(task);
  }

  console.log('Seeding Comments...');
  const taskToComment = insertedTasks.find((t) => t.title === 'Fix auth middleware token refresh')!;
  const taskToComment2 = insertedTasks.find((t) => t.title === 'Database Design Schema')!;

  await prisma.comment.create({
    data: {
      taskId: taskToComment.id,
      userId: member2.id,
      body: 'I am having an issue with the refresh token rotation in dev mode.',
    },
  });
  await prisma.comment.create({
    data: {
      taskId: taskToComment.id,
      userId: owner.id,
      body: 'Make sure the Cookie header is correctly sent on the proxy settings.',
    },
  });
  await prisma.comment.create({
    data: {
      taskId: taskToComment.id,
      userId: member2.id,
      body: 'Thanks, adding withCredentials solved it!',
    },
  });

  await prisma.comment.create({
    data: {
      taskId: taskToComment2.id,
      userId: admin2.id,
      body: 'Should we use references or embed columns in boards?',
    },
  });
  await prisma.comment.create({
    data: {
      taskId: taskToComment2.id,
      userId: owner.id,
      body: 'Let\'s use separate collections for columns to allow easier task grouping and reordering.',
    },
  });

  console.log('Seeding Notifications...');
  await prisma.notification.create({
    data: {
      userId: admin1.id,
      senderId: owner.id,
      type: 'project_added',
      title: 'Project Assigned',
      message: 'Abhishek Sharma added you to project "Launch Control"',
      link: `/workspaces/${ws1.id}/projects/${p1.id}`,
      read: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin2.id,
      senderId: owner.id,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: 'Abhishek Sharma assigned task "Database Design Schema" to you.',
      link: `/workspaces/${ws1.id}/projects/${p1.id}/boards/${b1.id}`,
      read: false,
    },
  });

  console.log('Seeding Activities...');
  const activityData = [
    { workspaceId: ws1.id, userId: owner.id, action: 'created', description: 'created workspace "Northstar Studio"' },
    { workspaceId: ws1.id, userId: owner.id, action: 'created', description: 'created project "Launch Control"', projectId: p1.id },
    { workspaceId: ws1.id, userId: owner.id, action: 'created', description: 'created board "Sprint 04"', projectId: p1.id, boardId: b1.id },
    { workspaceId: ws1.id, userId: owner.id, action: 'created', description: 'created task "Database Design Schema"', projectId: p1.id, boardId: b1.id, taskId: taskToComment2.id },
    { workspaceId: ws1.id, userId: admin2.id, action: 'commented', description: 'commented on task "Database Design Schema"', projectId: p1.id, boardId: b1.id, taskId: taskToComment2.id },
  ];
  for (const act of activityData) {
    await prisma.activity.create({ data: act });
  }

  console.log('Database Seeding Successful!');
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
