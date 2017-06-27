import Promise from "bluebird";
import _ from "lodash";

import handleRateLimitError from "../lib/handle-rate-limit-error";

export default function saveEvents(ctx, payload) {
  const { syncAgent, intercomAgent } = ctx.shipApp;
  const { events = [] } = payload;
  return Promise.all(events.map(e => syncAgent.eventsAgent.saveEvent(e)))
    .then(() => intercomAgent.getTags())
    .then((allTags) => {
      return Promise.all(events.map(e => {
        if ((e.topic === "user.tag.created" || e.topic === "user.tag.deleted")
          && _.get(e, "data.item.user")) {
          const user = _.get(e, "data.item.user");
          const ident = syncAgent.userMapping.getIdentFromIntercom(user);
          const tags = user.tags.tags.map(t => {
            if (!t.name) {
              t = _.find(allTags, { id: t.id });
            }
            return t.name;
          });
          if (ident.email) {
            const traits = {};
            traits["intercom/tags"] = tags;
            return ctx.client.asUser(ident).traits(traits);
          }
        }
        return null;
      }));
    })
    .catch(err => handleRateLimitError(ctx, "saveEvents", payload, err));
}
