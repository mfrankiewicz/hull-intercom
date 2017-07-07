import Promise from "bluebird";
import handleRateLimitError from "../lib/handle-rate-limit-error";

export default function handleBulk(ctx, payload) {
  const { id, users, attempt = 1 } = payload;
  const { syncAgent, intercomAgent } = ctx.service;
  return intercomAgent.getJob(id)
    .then(({ isCompleted, hasErrors }) => {
      if (isCompleted) {
        ctx.metric.increment("intercom.bulk_job.attempt", attempt);
        return (() => {
          if (hasErrors) {
            return intercomAgent.getJobErrors(id)
              .then(data => syncAgent.handleUserErrors(data));
          }
          return Promise.resolve();
        })()
          .then(() => {
            users.map(u => {
              return ctx.client.asUser(_.pick(u, ["id", "email", "external_id"])).logger.info("outgoing.user.success", { users });
            });
          })
          .then(() => syncAgent.groupUsersToTag(users))
          .then(groupedUsers => intercomAgent.tagUsers(groupedUsers));
      }

      if (attempt > 20) {
        ctx.metric.increment("intercom.bulk_job.fallback", 1);
        return ctx.enqueue("sendUsers", { users, mode: "regular" });
      }

      return ctx.enqueue("handleBulk", {
        users,
        id,
        attempt: attempt + 1
      }, { delay: attempt * 10000 });
    })
    .catch(err => handleRateLimitError(ctx, "handleBulk", payload, err));
}
