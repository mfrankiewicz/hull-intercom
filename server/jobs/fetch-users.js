import Promise from "bluebird";
import moment from "moment";
import _ from "lodash";

import saveUsers from "./save-users";

export default function fetchUsers(ctx, payload = {}) {
  const { intercomAgent } = ctx.shipApp;
  const { count = 50, page = 1 } = payload;
  let { last_updated_at } = payload;

  if (!last_updated_at || !moment(last_updated_at).isValid()) {
    if (ctx.ship.private_settings.last_updated_at
      && moment(ctx.ship.private_settings.last_updated_at).isValid()) {
      last_updated_at = ctx.ship.private_settings.last_updated_at;
    } else {
      last_updated_at = moment().subtract(10, "minutes").format();
    }
  }

  ctx.client.logger.debug("fetchUsers", { last_updated_at, page });
  ctx.metric.value("ship.incoming.fetch.page", page);
  return intercomAgent.getRecentUsers(last_updated_at, count, page)
    .then(({ users, hasMore }) => {
      const promises = [];
      if (hasMore) {
        promises.push(fetchUsers(ctx, {
          last_updated_at,
          count,
          page: page + 1
        }));
      }

      if (!_.isEmpty(users)) {
        promises.push(saveUsers(ctx, { users }));
      }

      return Promise.all(promises)
        .then(() => {
          if (page !== 1 || _.isEmpty(users)) {
            return Promise.resolve();
          }
          const newLastUpdatedAt = moment(_.get(_.first(users), "updated_at"), "X").format();
          return ctx.helpers.updateSettings({
            last_updated_at: newLastUpdatedAt
          });
        });
    });
}
