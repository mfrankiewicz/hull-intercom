import Promise from "bluebird";
import _ from "lodash";

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
      // scroll feature of Intercom API have expiration time which is
      // hard to recover from. The is the reason why continuing the import
      // scroll queries is more important than other tasks here.
      // It will put much more data into the queue, but when user scroll param
      // expires it cannot be recovered.
      // @see https://developers.intercom.com/reference#iterating-over-all-users
      return Promise.all([
        ctx.enqueue("fetchAllUsers", { scroll_param: next_scroll_param }, { priority: "high" }),
        ctx.enqueue("saveUsers", { users })
      ]);
    });
}
