# TaskManager

A full-stack task management application built with **Next.js 16**, **PostgreSQL (Neon)**, **JWT authentication**, and **AES-GCM encrypted task descriptions**. Users can register, log in, and manage their personal tasks with filtering, searching, and sorting capabilities.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [Security](#security)
- [API Reference](#api-reference)

---

## Features

- **User Authentication** — Register and login with JWT-based sessions (7-day expiry) stored in HTTP-only cookies
- **Task CRUD** — Create, read, update, and delete personal tasks
- **Task Statuses** — `todo`, `in-progress`, `done`
- **Search & Filter** — Filter tasks by status and/or keyword search across title and description
- **Sorting** — Sort tasks by `created_at`, `updated_at`, `title`, or `status` in ascending or descending order
- **Encrypted Descriptions** — Task descriptions are encrypted at rest using AES-GCM (256-bit) via the Web Crypto API
- **Input Validation** — All inputs validated with Zod schemas server-side
- **Dark Mode** — Theme support via `next-themes`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Neon (`@neondatabase/serverless`) |
| Auth | JWT (`jose`) + HTTP-only cookies |
| Password Hashing | bcryptjs (12 salt rounds) |
| Encryption | Web Crypto API — AES-GCM 256-bit |
| Validation | Zod |
| UI | Tailwind CSS v4, Radix UI, shadcn/ui |
| Forms | React Hook Form + Zod resolvers |
| Data Fetching | SWR |
| Deployment | Vercel (recommended) |

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts       # POST /api/auth/login
│   │   │   ├── logout/route.ts      # POST /api/auth/logout
│   │   │   ├── me/route.ts          # GET  /api/auth/me
│   │   │   └── register/route.ts   # POST /api/auth/register
│   │   └── tasks/
│   │       ├── route.ts             # GET / POST /api/tasks
│   │       └── [id]/route.ts       # GET / PUT / DELETE /api/tasks/:id
│   ├── dashboard/page.tsx           # Protected dashboard page
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx
├── components/
│   ├── dashboard-header.tsx
│   ├── task-card.tsx
│   ├── task-dialog.tsx
│   ├── task-list.tsx
│   ├── login-form.tsx
│   ├── register-form.tsx
│   └── ui/                         # shadcn/ui component library
├── lib/
│   ├── auth.ts                      # JWT creation, verification, session management
│   ├── crypto.ts                    # AES-GCM encrypt/decrypt utilities
│   ├── db.ts                        # Neon serverless SQL client
│   ├── validations.ts               # Zod schemas
│   └── utils.ts
├── scripts/
│   └── 001-create-tables.sql        # Database schema
└── hooks/
    ├── use-mobile.ts
    └── use-toast.ts
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **pnpm** (or npm/yarn)
- A **Neon** (or any PostgreSQL) database
- Git

### Installation

```bash
git clone https://github.com/ashish070patel/TaskManger-
cd TaskManger-
pnpm install
```

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# PostgreSQL connection string (Neon recommended)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Secret used to sign JWT tokens — must be a long, random string
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# Key used to encrypt task descriptions at rest (AES-GCM)
ENCRYPTION_KEY=your-32-character-encryption-key!!
```

> **Warning:** Never commit `.env.local` to version control. Rotate all secrets if exposed.

---

## Database Setup

Run the SQL migration script against your PostgreSQL database to create the required tables and indexes:

```bash
psql $DATABASE_URL -f scripts/001-create-tables.sql
```

Or paste the contents of `scripts/001-create-tables.sql` directly into your Neon SQL editor.

**Schema overview:**

```sql
-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (descriptions stored encrypted)
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in-progress', 'done')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Running the App

```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm start
```

The app will be available at `http://localhost:3000`.

---

## Security

| Concern | Implementation |
|---|---|
| Passwords | Hashed with bcrypt, 12 salt rounds |
| Sessions | Signed JWT (HS256), 7-day expiry, HTTP-only + SameSite=Lax cookie |
| Task descriptions | AES-GCM 256-bit encryption at rest |
| SQL injection | Parameterised queries via Neon tagged template literals |
| Sort injection | Allowlist validation for `sort` and `order` query params |
| Auth enforcement | Every `/api/tasks/*` route verifies the session cookie |

---

## API Reference

See [`API_DOCS.md`](./API_DOCS.md) for full request/response documentation with examples.

### Quick Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive session cookie |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `GET` | `/api/tasks` | List all tasks (supports filtering & sorting) |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/tasks/:id` | Get a single task by ID |
| `PUT` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |

---

## License

MIT
