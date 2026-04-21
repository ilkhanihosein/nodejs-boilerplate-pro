import type { Store } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient, type RedisClientType } from "redis";
import { getLogger } from "../common/logger.js";

export type RateLimitRedisResources = {
  store: Store;
  disconnect: () => Promise<void>;
};

/**
 * Connects a dedicated **node-redis** client for {@link RedisStore} (HTTP rate limiting only).
 * Call **once** during bootstrap; call `disconnect` during graceful shutdown before exiting.
 */
export async function connectRateLimitRedis(url: string): Promise<RateLimitRedisResources> {
  const client: RedisClientType = createClient({
    url,
    socket: {
      connectTimeout: 10_000,
    },
  });

  client.on("error", (err) => {
    getLogger().error(
      { err, event: "rate_limit_redis_client_error" },
      "rate_limit_redis_client_error",
    );
  });

  await client.connect();
  getLogger().info({ event: "rate_limit_redis_connected" }, "rate_limit_redis_connected");

  const store = new RedisStore({
    sendCommand: (...args: string[]) => client.sendCommand(args),
    prefix: "rl:http:",
  });

  return {
    store,
    disconnect: async () => {
      try {
        if (client.isOpen) {
          await client.quit();
          getLogger().info(
            { event: "rate_limit_redis_disconnected" },
            "rate_limit_redis_disconnected",
          );
        }
      } catch (err: unknown) {
        getLogger().warn(
          { err, event: "rate_limit_redis_quit_error" },
          "rate_limit_redis_quit_error",
        );
      }
    },
  };
}
