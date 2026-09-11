# Real-Time Collaborative Task Board

A production-quality collaborative Kanban board built with React, TypeScript, Node.js, PostgreSQL, and Socket.IO.

## Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Zustand, dnd-kit, Socket.IO Client
- **Backend:** Node.js, Express, TypeScript, PostgreSQL (Prisma), Socket.IO, JWT, bcrypt
- **Shared:** zod schemas + TS types reused by both frontend and backend

## Project Structure

```
task-board/
├── frontend/    → React application
├── backend/     → Express API server
└── shared/      → Shared types & validation schemas
```

## Quick start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173

### Backend

```bash
cd backend
cp .env.example .env   # configure your environment
npm install
npx prisma generate
npm run dev
```

- Backend: http://localhost:4000

### Database

```bash
# Start local Postgres (Docker)
docker compose up -d mongo

# Run migrations
cd backend
npx prisma migrate dev

# Seed sample data
npm run seed
```

## Scripts

### Frontend (`cd frontend`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run test` | Run tests |
| `npm run typecheck` | TypeScript check |

### Backend (`cd backend`)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with watch |
| `npm run build` | TypeScript build |
| `npm run start` | Start production server |
| `npm run test` | Run tests |
| `npm run seed` | Seed database |
| `npm run typecheck` | TypeScript check |

## License
MIT
