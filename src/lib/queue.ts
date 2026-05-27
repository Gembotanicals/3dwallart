import { Queue } from "bullmq";

export const reliefQueue = new Queue("relief-processing", {
  connection: {
    host: process.env.REDIS_URL
      ? new URL(process.env.REDIS_URL).hostname
      : "localhost",
    port: process.env.REDIS_URL
      ? parseInt(new URL(process.env.REDIS_URL).port || "6379")
      : 6379,
  },
});
