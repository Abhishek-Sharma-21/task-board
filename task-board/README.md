# Task Board

A real-time collaborative Kanban task management platform built for modern teams.

Task Board helps teams organize projects, manage tasks, collaborate in real time, and keep track of work across multiple projects and workspaces.

---

## Live Links

| Platform       | URL                                                                                |
| -------------- | ---------------------------------------------------------------------------------- |
| **Frontend**   | [https://task-board-virid-ten.vercel.app](https://task-board-virid-ten.vercel.app) |
| **Mobile APK** | Built via EAS Build (see `mobile-app/` folder)                                     |

---

## Features

### Workspaces & Projects

- Multi-workspace support
- Project-based organization
- Workspace roles: Owner, Admin, Member
- Team and member management
- Project-level access control

### Kanban Boards

- Drag-and-drop task management
- Customizable workflow columns
- Task ordering and column management
- Archive and restore tasks
- Real-time board updates

### Multi-Assignee Tasks

- Assign multiple team members to a task
- Checkbox-based member selection
- Stacked avatar display

### Real-Time Collaboration

Powered by Socket.IO for instant updates across connected clients.

- Task updates, comments, chat
- Notifications
- Board changes
- Collaborative activity

### Task Chat

Every task can have its own dedicated conversation.

- Real-time messaging
- Message history and search
- Thread-based communication

### Notifications

- Real-time notifications
- Unread notification count
- Bulk mark-all-read
- Task and workspace activity notifications

### My Work

A personalized view of tasks that require your attention.

- Today, Overdue, Upcoming
- Waiting For, Blocked
- Completed

### Calendar

- Calendar-based task view
- Due-date tracking with task dots

### Task Checklists

- Checklist items with completion tracking
- Progress indicators

### Activity History

Complete audit trail of workspace, project, and task changes.

### Workspace Invitations

- Email invitations
- Shareable workspace invitation links

### Dark & Light Themes

- Full theme support
- Persistent theme preference

---

## Tech Stack

| Layer          | Technologies                                                                               |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Frontend**   | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router, dnd-kit, Socket.IO Client |
| **Backend**    | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Socket.IO, JWT                       |
| **Mobile**     | React Native, Expo, TypeScript, Zustand                                                    |
| **Database**   | PostgreSQL (Neon)                                                                          |
| **Deployment** | Vercel (Frontend), Render (Backend), EAS Build (Mobile)                                    |

---

## Project Structure

```
task-board/
  backend/          Express.js API server
    src/            TypeScript source
    prisma/         Database schema and migrations
  frontend/         React SPA
    src/            TypeScript + React components
  mobile-app/       React Native Expo app
    src/            TypeScript + React Native screens
    assets/         App icons and images
    eas.json        EAS Build configuration
```

---

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env   # Configure database URL and secrets
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # Set API URL
npm run dev
```

### Mobile

```bash
cd mobile-app
npm install
npx expo start
```

---

## Mobile APK Build

```bash
npm install -g eas-cli
eas login
cd mobile-app
eas build --platform android --profile preview
```

Download the APK from the link provided by EAS Build.

---

## Environment Variables

### Backend (.env)

| Variable             | Description                  |
| -------------------- | ---------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string |
| `JWT_ACCESS_SECRET`  | Secret for access tokens     |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens    |
| `CLIENT_URL`         | Frontend URL for CORS        |
| `CORS_ORIGIN`        | Allowed origin               |

### Frontend (.env)

| Variable            | Description     |
| ------------------- | --------------- |
| `VITE_API_BASE_URL` | Backend API URL |

### Mobile (src/config/env.ts)

Production URLs are configured in `app.json` under `extra.apiUrl` and `extra.socketUrl`.

---

## License

Private
