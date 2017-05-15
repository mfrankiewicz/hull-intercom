import Promise from "bluebird";
import _ from "lodash";

export default function fetchUsers(ctx, payload = {}) {
  const { syncAgent, intercomAgent } = ctx.shipApp;
  const { last_updated_at, count, page = 1 } = payload;

  return (() => {
    if (_.isEmpty(last_updated_at)) {
      return syncAgent.getLastUpdatedAt();
    }
    return Promise.resolve(last_updated_at);
  })()
    .then((new_last_updated_at) => {
      ctx.client.logger.debug("fetchUsers", { new_last_updated_at, page });
      return intercomAgent.getRecentUsers(new_last_updated_at, count, page)
        .then(({ users, hasMore }) => {
          const promises = [];
          if (hasMore) {
            promises.push(ctx.enqueue("fetchUsers", {
              last_updated_at: new_last_updated_at,
              count,
              page: page + 1
            }));
          }

          if (!_.isEmpty(users)) {
            promises.push(ctx.enqueue("saveUsers", { users }));
          }

          return Promise.all(promises);
        });
    });
}
