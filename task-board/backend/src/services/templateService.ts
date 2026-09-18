import { prisma } from '../config/db.js';
import { HttpError } from '../utils/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidId(id: string): boolean { return UUID_REGEX.test(id); }

export interface TemplateDefinition {
  name: string;
  description: string;
  icon: string;
  columns: string[];
  labels: string[];
  sampleTasks: Array<{ title: string; column: string; priority: string; labels: string[] }>;
}

export const BUILTIN_TEMPLATES: Record<string, TemplateDefinition> = {
  'software-sprint': {
    name: 'Software Engineering Sprint',
    description: 'Agile sprint board with standard development workflow',
    icon: '💻',
    columns: ['Backlog', 'To Do', 'In Progress', 'Code Review', 'Testing', 'Done'],
    labels: ['feature', 'bug', 'chore', 'tech-debt'],
    sampleTasks: [
      { title: 'Sprint Planning', column: 'To Do', priority: 'High', labels: ['chore'] },
      { title: 'Code Review Checklist', column: 'Backlog', priority: 'Medium', labels: ['chore'] },
    ],
  },
  'marketing-launch': {
    name: 'Marketing Launch',
    description: 'Campaign planning and execution workflow',
    icon: '📢',
    columns: ['Ideas', 'Planning', 'Creative', 'Review', 'Launched', 'Done'],
    labels: ['campaign', 'content', 'design', 'social'],
    sampleTasks: [
      { title: 'Define target audience', column: 'Planning', priority: 'High', labels: ['campaign'] },
      { title: 'Create content calendar', column: 'Ideas', priority: 'Medium', labels: ['content'] },
    ],
  },
  'bug-tracking': {
    name: 'Bug Tracking',
    description: 'Track and resolve bugs systematically',
    icon: '🐛',
    columns: ['Reported', 'Triaged', 'In Progress', 'Verified', 'Closed'],
    labels: ['critical', 'regression', 'ui', 'backend'],
    sampleTasks: [
      { title: 'Triage incoming bugs', column: 'Reported', priority: 'High', labels: ['chore'] },
    ],
  },
  'personal-kanban': {
    name: 'Personal Kanban',
    description: 'Simple personal task management',
    icon: '📋',
    columns: ['Backlog', 'Today', 'Doing', 'Done'],
    labels: [],
    sampleTasks: [],
  },
};

export async function getTemplates(): Promise<TemplateDefinition[]> {
  return Object.values(BUILTIN_TEMPLATES);
}

export async function createProjectFromTemplate(
  workspaceId: string,
  userId: string,
  templateId: string,
  projectName: string,
  description?: string
) {
  if (!isValidId(workspaceId)) throw new HttpError(400, 'INVALID_ID', 'Invalid workspace ID');
  const template = BUILTIN_TEMPLATES[templateId];
  if (!template) throw new HttpError(400, 'INVALID_TEMPLATE', 'Template not found');

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: projectName,
        description: description || template.description,
        workspaceId,
        createdBy: userId,
      },
    });

    const board = await tx.board.create({
      data: {
        name: `${projectName} Board`,
        description: template.description,
        projectId: project.id,
        createdBy: userId,
      },
    });

    const columnRecords = await Promise.all(
      template.columns.map((name, idx) =>
        tx.boardColumn.create({ data: { name, boardId: board.id, position: idx } })
      )
    );

    const colMap = new Map(columnRecords.map((c) => [c.name, c.id]));

    for (let i = 0; i < template.sampleTasks.length; i++) {
      const st = template.sampleTasks[i];
      const colId = colMap.get(st.column) || columnRecords[0].id;
      await tx.task.create({
        data: {
          title: st.title,
          projectId: project.id,
          boardId: board.id,
          columnId: colId,
          position: i,
          priority: st.priority,
          labels: st.labels,
          createdBy: userId,
        },
      });
    }

    return { project, board };
  });
}
