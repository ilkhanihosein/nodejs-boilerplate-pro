import { createApp } from "./app.js";
import { getLogger } from "./common/logger.js";
import { connectMongo, disconnectMongo } from "./config/database.js";
import { env } from "./config/env.js";
import type { Server } from "node:http";
import type { Socket } from "node:net";

const GRACEFUL_SHUTDOWN_MS = 10_000;

/**
 * Socket tracking is required because Node.js HTTP server does not
 * automatically terminate persistent or keep-alive connections during shutdown.
 *
 * Purpose of this mechanism:
 * - Keep visibility over active TCP connections
 * - Enable forced cleanup if graceful shutdown cannot complete
 * - Prevent process from hanging indefinitely due to open sockets
 */
function trackOpenSockets(server: Server): Set<Socket> {
  const sockets = new Set<Socket>();

  server.on("connection", (socket) => {
    sockets.add(socket);

    socket.once("close", () => {
      sockets.delete(socket);
    });
  });

  return sockets;
}

/**
 * Last-resort cleanup mechanism for TCP sockets.
 *
 * This is only used when graceful shutdown exceeds the configured timeout.
 * It is intentionally destructive to guarantee process termination.
 */
function destroyOpenSockets(sockets: Set<Socket>): void {
  for (const socket of sockets) {
    socket.destroy();
  }
  sockets.clear();
}

/**
 * Application bootstrap lifecycle:
 *
 * Execution order is important because each step depends on the previous one:
 *
 * 1. Environment validation (handled in env module during import)
 * 2. Database connection (MongoDB)
 * 3. HTTP server startup
 * 4. Shutdown handlers registration
 *
 * This order ensures the system never enters a partially-initialized state.
 */
async function bootstrap(): Promise<void> {
  /**
   * Environment validation is assumed to be handled in `config/env.ts`.
   * That module throws during import if required variables are missing.
   *
   * Therefore, `env.mongodbUri` is considered safe to use here.
   */
  await connectMongo(env.mongodbUri);
  getLogger().info("mongodb_connected");

  const app = createApp();
  const server: Server = app.listen(env.port, () => {
    getLogger().info({ port: env.port }, "server_listening");
  });

  const openSockets = trackOpenSockets(server);
  let shuttingDown = false;

  /**
   * Shutdown strategy used in this service:
   *
   * HYBRID MODEL:
   * - Graceful phase: allow in-flight HTTP requests to complete
   * - Hard timeout: enforce termination if any step hangs
   *
   * This design prioritizes avoiding indefinite shutdown blocking
   * over extending cleanup duration beyond a bounded window.
   */
  const gracefulShutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;

    getLogger().info({ signal }, "shutdown_started");

    const forceTimer = setTimeout(() => {
      getLogger().error({ signal }, "shutdown_forced_timeout");

      /**
       * At this point graceful shutdown is considered failed.
       * Remaining sockets are destroyed to guarantee termination.
       */
      destroyOpenSockets(openSockets);

      process.exit(1);
    }, GRACEFUL_SHUTDOWN_MS);

    forceTimer.unref();

    /**
     * server.close behavior:
     * - Stops accepting new connections
     * - Waits for active requests to finish
     * - Does NOT guarantee completion of async cleanup tasks
     */
    server.close((closeErr?: Error) => {
      void (async () => {
        let mongoDisconnectFailed = false;

        try {
          /**
           * MongoDB teardown is executed after HTTP server stops accepting traffic.
           * This avoids new queries being initiated during shutdown.
           */
          await disconnectMongo();
          getLogger().info("mongodb_disconnected");
        } catch (err: unknown) {
          mongoDisconnectFailed = true;
          getLogger().error({ err }, "mongodb_disconnect_error");
        }

        if (closeErr) {
          getLogger().error({ err: closeErr }, "server_close_error");
        }

        /**
         * Exit code semantics:
         * - 0: clean shutdown (no errors in server or DB teardown)
         * - 1: partial or failed shutdown
         */
        const exitCode = closeErr || mongoDisconnectFailed ? 1 : 0;

        /**
         * DESIGN DECISION (timeout lifecycle):
         *
         * The shutdown watchdog remains active during MongoDB teardown.
         * This ensures that if the database driver hangs indefinitely,
         * the process is still forcibly terminated.
         *
         * The timer is cleared only after teardown completes (success or failure),
         * ensuring bounded total shutdown time.
         */
        clearTimeout(forceTimer);

        getLogger().info({ exitCode }, "shutdown_complete");
        process.exit(exitCode);
      })();
    });
  };

  /**
   * OS signals that trigger graceful shutdown:
   * These are the only supported external termination triggers.
   */
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      gracefulShutdown(signal);
    });
  }

  /**
   * Unhandled promise rejections represent unknown failure states.
   *
   * Policy:
   * - Log the error for observability
   * - Terminate the process to avoid operating in inconsistent state
   *
   * Recovery is intentionally not attempted because root cause is undefined.
   */
  process.on("unhandledRejection", (reason) => {
    getLogger().error({ err: reason }, "unhandled_rejection");
    process.exit(1);
  });

  /**
   * Uncaught exceptions indicate a violation of normal execution flow.
   *
   * After such an event, Node.js state is considered unsafe for continuation.
   * Therefore, the process is terminated immediately.
   */
  process.on("uncaughtException", (err, origin) => {
    getLogger().fatal({ err, origin }, "uncaught_exception");
    process.exit(1);
  });
}

/**
 * Bootstrap failure indicates system never reached a stable runtime state.
 * In this case, immediate termination is required.
 */
void bootstrap().catch((err: unknown) => {
  getLogger().fatal({ err }, "bootstrap_failed");
  process.exit(1);
});
