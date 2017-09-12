import Promise from "bluebird";
import _ from "lodash";

import handleRateLimitError from "../lib/handle-rate-limit-error";

/**
 * Takes list of users with fields and segment_ids set,
 * sends them to Intercom and tags them.
 */
export default function sendUsers(ctx, payload) {
  const { users, mode = "bulk" } = payload;
  const { syncAgent, intercomAgent } = ctx.service;

  ctx.client.logger.debug("sendUsers.preFilter", users.length);
  const usersToSave = syncAgent.getUsersToSave(users);
  const intercomUsersToSave = usersToSave.map(u => syncAgent.userMapping.getIntercomFields(u, ctx));

  ctx.client.logger.debug("sendUsers.filtered", intercomUsersToSave.length);
  ctx.metric.increment("ship.outgoing.users", intercomUsersToSave.length);

  return syncAgent.syncShip()
    .then(() => intercomAgent.sendUsers(intercomUsersToSave, mode))
    .then(res => {
      if (_.isArray(res)) {
        const savedUsers = _.intersectionBy(usersToSave, res, "email")
          .map(u => {
            const intercomData = _.find(res, { email: u.email });
            u["traits_intercom/id"] = intercomData.id;
            u["traits_intercom/tags"] = intercomData.tags.tags.map(t => t.name);

            ctx.client.asUser(_.pick(u, ["email", "id", "external_id"])).logger.info("outgoing.user.success");
            return u;
          });
        const errors = _.filter(res, { body: { type: "error.list" } });

        const groupedErrors = errors.map(errorReq => {
          return {
            data: errorReq.req.data,
            error: errorReq.body.errors
          };
        });

        return syncAgent.sendEvents(savedUsers)
          .then(() => syncAgent.groupUsersToTag(savedUsers))
          .then(groupedUsers => intercomAgent.tagUsers(groupedUsers))
          .then(() => syncAgent.handleUserErrors(groupedErrors));
      }

      if (_.get(res, "body.id")) {
        return ctx.enqueue("handleBulk", { users: usersToSave, id: res.body.id }, { delay: parseInt(process.env.BULK_JOB_DELAY, 10) || 10000 });
      }
      return Promise.resolve();
    })
    .catch(err => handleRateLimitError(ctx, "sendUsers", payload, err));
}
