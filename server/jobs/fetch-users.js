import Promise from "bluebird";
import moment from "moment";
import _ from "lodash";

import saveUsers from "./save-users";
import fetchAllUsers from "./fetch-all-users";

export default function fetchUsers(ctx, payload = {}) {
  const { intercomAgent } = ctx.service;
  const { count = 50, page = 1 } = payload;
  let { last_updated_at } = payload;

  if (!last_updated_at || !moment(last_updated_at).isValid()) {
    if (ctx.ship.private_settings.last_updated_at
      && moment(ctx.ship.private_settings.last_updated_at).isValid()
      && moment(ctx.ship.private_settings.last_updated_at).isAfter(moment().subtract(1, "day"))) {
      last_updated_at = ctx.ship.private_settings.last_updated_at;
    } else {
      ctx.metric.event({
        title: "fetchUsers - wrong last_updated_at value, switching to default - 1 day",
        text: ctx.ship.private_settings.last_updated_at
      });
      last_updated_at = moment().subtract(1, "day").format();
    }
  }

  ctx.client.logger.debug("fetchUsers", { last_updated_at, page });
  ctx.metric.value("ship.incoming.fetch.page", page);
  return intercomAgent.getRecentUsers(last_updated_at, count, page)
    .then(({ users, hasMore }) => {
      const promises = [];

      if ((page + 1) * count >= 10000) {
        if (process.env.ENABLE_FETCH_ALL_FALLBACK) {
          const updated_after = last_updated_at;
          const updated_before = moment(_.get(_.last(users), "updated_at"), "X").format();
          ctx.metric.event({
            title: "fetchUsers - going to too high page, switching to fetchAllUsers with filtering",
            text: JSON.stringify({ updated_after, updated_before })
          });
          promises.push(fetchAllUsers(ctx, { updated_before, updated_after }));
        } else {
          ctx.metric.event({
            title: "fetchUsers - going to too high page, stopping the fetch"
          });
        }
      } else if (hasMore) {
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
          if ((page === 1 || page % 5 === 0) && !_.isEmpty(users)) {
            const newLastUpdatedAt = moment(_.get(_.first(users), "updated_at"), "X").format();
            return ctx.helpers.updateSettings({
              last_updated_at: newLastUpdatedAt
            });
          }
          return Promise.resolve();
        });
    })
    .catch(err => {
      if (_.get(err, "statusCode") === 429 || _.get(err, "response.statusCode") === 429) {
        ctx.client.logger.debug("service.api.ratelimit", { message: "stopping fetch, another will continue" });
        return Promise.resolve("skip");
      }
      return Promise.reject(err);
    });
}
