import Promise from "bluebird";
import moment from "moment";
import _ from "lodash";

export default function fetchUsers(ctx, payload = {}) {
  const { intercomAgent } = ctx.shipApp;
  const defaultLastUpdatedAt = ctx.ship.private_settings.last_updated_at || moment().subtract(1, "hour").format();
  const { last_updated_at = defaultLastUpdatedAt, count = 50, page = 1 } = payload;

  ctx.client.logger.debug("fetchUsers", { last_updated_at, page });
  return intercomAgent.getRecentUsers(last_updated_at, count, page)
    .then(({ users, hasMore }) => {
      const promises = [];
      if (hasMore) {
        promises.push(ctx.enqueue("fetchUsers", {
          last_updated_at,
          count,
          page: page + 1
        }));
      }

      if (!_.isEmpty(users)) {
        promises.push(ctx.enqueue("saveUsers", { users }));
      }

      return Promise.all(promises)
        .then(() => {
          const newLastUpdatedAt = _.get(_.last(users), "updated_at");
          return ctx.helpers.updateSettings({
            last_updated_at: newLastUpdatedAt
          });
        });
    });
}
