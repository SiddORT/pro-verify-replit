# PROverify on Replit

## Stack

- Frontend: React, TypeScript, and Vite
- Backend: FastAPI and SQLAlchemy
- Database: PostgreSQL with Alembic migrations

## Running the project

Use the **Run** button. It starts both configured workflows:

- `Start application`: Vite frontend on port 5000
- `Backend API`: FastAPI backend on port 8000

The Vite development server proxies `/api` and `/uploads` to the backend.

## Database setup

`DATABASE_URL` and `SESSION_SECRET` must be available in the Replit environment.
Apply pending schema migrations with:

```bash
alembic upgrade head
```

## Validation

```bash
cd frontend
npm run typecheck
npm run build
```