import Promise from "bluebird";

import getLeadIdent from "../lib/lead/get-lead-ident";
import isTagEvent from "../lib/event/is-tag-event";
import getTagEventTraits from "../lib/event/get-tag-event-traits";
import getEventPayload from "../lib/event/get-event-payload";

export default function saveEvents(ctx, payload) {
  const { client, metric } = ctx;
  const { syncAgent, intercomAgent } = ctx.service;
  const { events = [] } = payload;

  return intercomAgent.getTags()
    .then((allTags) => {
      return Promise.map(events, event => {
        const { user, eventName, props, context } = getEventPayload(ctx, event);

        if (!user) {
          return Promise.resolve();
        }

        let ident;
        // anonymous is set to true for intercom leads
        if (user.anonymous === true || user.type === "lead" || user.type === "contact") {
          ident = getLeadIdent(ctx, user);
          context.active = true;
        } else {
          ident = syncAgent.userMapping.getIdentFromIntercom(user);
        }

        if (isTagEvent(ctx, event)) {
          client.logger.debug("skipping tag event", {
            user: user.email,
            topic: event.topic,
            tag: event.data.item.tag.name
          });
          const traits = getTagEventTraits(ctx, user, allTags);
          return client.asUser(ident).traits(traits);
        }

        client.logger.info("incoming.event", { ident, eventName, props, context });
        metric.increment("ship.incoming.events", 1);
        return client.asUser(ident).track(eventName, props, context);
      });
    });
}
