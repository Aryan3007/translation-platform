# Centralized Translation Platform

A centralized, production-ready Translation Platform designed to eliminate local translation JSON files (`en.json`, `de.json`, etc.) across multiple projects. 

Instead of maintaining duplicate translation files in every frontend repository, all your React, Next.js, and mobile applications fetch translations from this central service.

---

## 🚀 Key Features

* **Centralized Dashboard**: A Google Sheets-like translation grid supporting search, filtering (All, Missing, AI Generated, Outdated), and instant inline editing.
* **Auto-Discovery (Missing Keys)**: The React SDK automatically detects missing keys in your code and registers them to the Translation Service in the background.
* **AI Auto-Translation (Phase 2)**: Translates newly registered keys instantly into all enabled languages using **Gemini (1.5 Flash)** or **OpenAI (GPT-4o Mini)**.
* **Verification Workflow**: AI-generated translations are marked with a purple `AI` badge on the dashboard. Administrators can review, edit, and verify them with a single click.
* **Stale-While-Revalidate Caching**: The SDK instantly loads translations from `localStorage` to eliminate layout shift, then fetches the latest version in the background.
* **High Performance**: Employs a **Redis** caching layer in front of the **PostgreSQL** database to ensure sub-millisecond translation delivery.

---

## 🛠️ Tech Stack

* **Monorepo Manager**: `pnpm` workspaces
* **Backend**: NestJS + Prisma ORM + PostgreSQL + Redis
* **Frontend**: Next.js 15 + React 19 + Tailwind CSS
* **SDK**: TypeScript React Context & Hooks
* **AI Translation**: Gemini API & OpenAI API (JSON Mode)

---

## 📦 Monorepo Structure

```
translation-platform/
├── apps/
│   ├── dashboard/          # Next.js admin dashboard
│   └── api/                # NestJS translation service API
├── packages/
│   ├── sdk-react/          # React/Next.js SDK
│   └── shared/             # Shared TypeScript types & validation schemas
├── docker-compose.yml      # Local Postgres & Redis containers
└── rules/
    └── translation-platform.md # AI integration rules for client projects
```

---

## 🚦 Quick Start (Local Development)

### 1. Prerequisites
Ensure you have **Docker**, **Node.js**, and **pnpm** installed.

### 2. Start Database & Cache
```bash
docker compose up -d
```

### 3. Configure Environment Variables
Create a `.env` file in `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres_password@localhost:5432/translation_db?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
JWT_SECRET="super-secret-jwt-key"
PORT=3001

# AI Auto-Translation API Keys
GEMINI_API_KEY="your-gemini-key"
OPENAI_API_KEY="your-openai-key"
```

### 4. Install Dependencies & Setup DB
```bash
pnpm install
pnpm --filter @translation-platform/shared build
pnpm --filter @translation-platform/api prisma:generate
pnpm --filter @translation-platform/api exec prisma migrate dev
pnpm --filter @translation-platform/api db:seed
pnpm --filter @translation-platform/sdk-react build
```

### 5. Run the Applications
```bash
pnpm dev
```
* **Dashboard**: `http://localhost:3000` (Default credentials: `admin@translations.com` / `admin123`)
* **API Service**: `http://localhost:3001`
* **SDK Client Simulator**: `http://localhost:3000/client-test`

---

## 📖 How to Integrate Into Client Projects

Refer to the [rules/translation-platform.md](rules/translation-platform.md) file for complete instructions on installing the SDK, wrapping your app, and using the `t()` hook in your code.
