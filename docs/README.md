# Backend architecture documentation

Read these in any order; together they describe **observability**, **validation**, and the **HTTP request pipeline** for this repo.

| Document                                       | Topics                                                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [logging.md](./logging.md)                     | pino, pino-http (id only), lifecycle access logs, error-handler logging, field names, JSON examples |
| [validation.md](./validation.md)               | `validateRequest`, `requireValidated*`, single Zod parse, typing without call-site `as`             |
| [request-lifecycle.md](./request-lifecycle.md) | Middleware order, success vs error paths, duration tracking, diagrams                               |
| [async-context.md](./async-context.md)         | AsyncLocalStorage, `requestId` propagation, caveats                                                 |

The root **[README.md](../README.md)** includes a shorter **“Observability & System Design”** section that points here.
