# Documentation index

These files describe **how this boilerplate is wired**, so you can keep the patterns, delete optional pieces, or extend them in your own project.

| Document                                                                     | Description                                                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [boilerplate-requirements.md](./boilerplate-requirements.md)                 | Pro boilerplate checklist (Must/Should/Could) — domain-agnostic.                          |
| [openapi.md](./openapi.md)                                                   | Zod-generated OpenAPI, `/docs`, extending `openapi.ts`.                                   |
| [architecture.md](./architecture.md)                                         | Layers (`api` vs `modules`), adapting the template.                                       |
| [authentication-and-authorization.md](./authentication-and-authorization.md) | JWT access/refresh, `jwt.utils` + `auth.service`, sessions, `requireAuth`, `requireRole`. |
| [ci-and-git-hooks.md](./ci-and-git-hooks.md)                                 | GitHub Actions `check`, Husky, lint-staged.                                               |
| [database-migrations-and-seeding.md](./database-migrations-and-seeding.md)   | migrate-mongo scripts, authoring migrations, optional seed.                               |
| [docker-and-local-development.md](./docker-and-local-development.md)         | Compose services, Dockerfile, health URLs, local vs container Mongo URI.                  |
| [env-configuration.md](./env-configuration.md)                               | All environment variables, defaults, and `env` fail-fast behavior.                        |
| [errors-and-json-responses.md](./errors-and-json-responses.md)               | `AppError`, Zod/Mongoose mapping, 404, 500 production behavior.                           |
| [testing.md](./testing.md)                                                   | Vitest layout, test env overrides, integration tests with supertest.                      |
| [troubleshooting.md](./troubleshooting.md)                                   | Common startup, Mongo, port, migration, and test issues.                                  |
| [logging.md](./logging.md)                                                   | Pino, pino-http (request id only), lifecycle logs, error-handler, sample JSON.            |
| [validation.md](./validation.md)                                             | `validateRequest`, `req.validated`, `requireValidated*`, single Zod parse.                |
| [request-lifecycle.md](./request-lifecycle.md)                               | Middleware order, success vs error flow, duration, diagrams.                              |
| [security-and-http-hardening.md](./security-and-http-hardening.md)           | Helmet, CORS, rate limit, trust proxy, body size, JWT secrets overview.                   |
| [async-context.md](./async-context.md)                                       | AsyncLocalStorage, `requestId`, `req.id` vs ALS, limitations.                             |
