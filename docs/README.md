# Documentation index

These files describe **how this boilerplate is wired**, so you can keep the patterns, delete optional pieces, or extend them in your own project.

| Document                                       | Description                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| [architecture.md](./architecture.md)           | Layers (`api` vs `modules`), adapting the template, database tooling.          |
| [env-configuration.md](./env-configuration.md) | All environment variables, defaults, and `env` fail-fast behavior.             |
| [testing.md](./testing.md)                     | Vitest layout, test env overrides, integration tests with supertest.           |
| [troubleshooting.md](./troubleshooting.md)     | Common startup, Mongo, port, migration, and test issues.                       |
| [logging.md](./logging.md)                     | Pino, pino-http (request id only), lifecycle logs, error-handler, sample JSON. |
| [validation.md](./validation.md)               | `validateRequest`, `req.validated`, `requireValidated*`, single Zod parse.     |
| [request-lifecycle.md](./request-lifecycle.md) | Middleware order, success vs error flow, duration, diagrams.                   |
| [async-context.md](./async-context.md)         | AsyncLocalStorage, `requestId`, `req.id` vs ALS, limitations.                  |
