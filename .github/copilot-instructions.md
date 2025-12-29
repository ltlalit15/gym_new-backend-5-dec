# Copilot Instructions for gym-backend

## Project Overview
- This is a Node.js backend for a gym management system, built with Express and Prisma (SQLite).
- The main entry points are `src/app.js` (Express app setup) and `src/server.js` (server startup).
- Business logic is organized in `src/modules/`, with each domain (e.g., member, staff, attendance) having its own folder containing controller, service, and route files.
- Database schema and migrations are managed via Prisma in the `prisma/` directory.

## Key Patterns & Conventions
- **Modular Structure:** Each feature (e.g., `member`, `attendance`, `finance`) follows a clear separation: `*.controller.js` (request handling), `*.service.js` (business logic), `*.routes.js` (Express routes).
- **Routes Registration:** All module routes are typically registered in `src/routes/index.js`.
- **Config Files:** External integrations (Cloudinary, Redis) and environment variables are configured in `src/config/`.
- **Error Handling:** Centralized error handling middleware is in `src/middlewares/errorHandler.js`.
- **Authentication:** Auth logic is in `src/modules/auth/` and middleware in `src/middlewares/auth.js`.
- **Seeding:** Initial roles can be seeded via `src/seed/role.seed.js`.

## Developer Workflows
- **Install dependencies:** `npm install`
- **Prisma setup:**
  - Generate client: `npx prisma generate`
  - Run migrations: `npx prisma migrate dev --name <name>`
- **Start development server:** `npm run dev`
- **API Health Check:** `GET /api/`

## Integration Points
- **Prisma:** Database access via generated Prisma client; schema in `prisma/schema.prisma`.
- **Cloudinary:** Image uploads configured in `src/config/cloudinary.js`.
- **Redis:** Caching/session management in `src/config/redis.js`.

## Project-Specific Advice
- When adding a new feature, create a new folder in `src/modules/` and follow the controller/service/routes pattern.
- Register new routes in `src/routes/index.js`.
- For database changes, update `prisma/schema.prisma` and run migrations.
- Use the provided error handling and authentication middleware for consistency.

## Example: Adding a New Module
1. Create `src/modules/example/` with `example.controller.js`, `example.service.js`, `example.routes.js`.
2. Register routes in `src/routes/index.js`.
3. Update database schema if needed and run migration.

## References
- Main app setup: [src/app.js](src/app.js)
- Server entry: [src/server.js](src/server.js)
- Prisma schema: [prisma/schema.prisma](prisma/schema.prisma)
- Route registration: [src/routes/index.js](src/routes/index.js)
- Error handling: [src/middlewares/errorHandler.js](src/middlewares/errorHandler.js)
- Auth middleware: [src/middlewares/auth.js](src/middlewares/auth.js)

---
_Review and update these instructions as the project evolves. Feedback on unclear or missing sections is welcome._
