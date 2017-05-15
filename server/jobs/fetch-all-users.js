import Promise from "bluebird";
import _ from "lodash";

import saveUsers from "./save-users";

export default function fetchAllUsers(ctx, payload = {}) {
  const { scroll_param } = payload;
  const { intercomAgent } = ctx.shipApp;
  if (_.isEmpty(scroll_param)) {
    ctx.metric.event({
      title: "fetchAllUsers"
    });
  }
  return intercomAgent.importUsers(scroll_param)
    .then(({ users, scroll_param: next_scroll_param }) => {
      if (_.isEmpty(users)) {
        return Promise.resolve();
      }
      return Promise.all([
        fetchAllUsers(ctx, { scroll_param: next_scroll_param }),
        saveUsers(ctx, { users })
      ]);
    });
}
