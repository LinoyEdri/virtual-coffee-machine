import type { ConnectionOptions }  from "bullmq";
import { env } from "../config/env";

export const QUEUE_NAME = "orders";

export const redisConnection: ConnectionOptions = {
    host: env.redis.host,
    port: env.redis.port,
}