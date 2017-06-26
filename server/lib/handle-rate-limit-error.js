import Promise from "bluebird";

export default function handleRateLimitError(ctx, jobName, payload, err) {
  if (err && err.statusCode === 429) {
    ctx.client.logger.error("connector.ratelimit.error");
    return ctx.enqueue(jobName, payload, { delay: process.env.RATE_LIMIT_DELAY || 10000 });
  }
  return Promise.reject(err);
}
