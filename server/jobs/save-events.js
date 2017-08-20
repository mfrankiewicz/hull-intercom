import Promise from "bluebird";

import getLeadIdent from "../lib/lead/get-lead-ident";
import isTagEvent from "../lib/event/is-tag-event";
import getEventPayload from "../lib/event/get-event-payload";

import handleRateLimitError from "../lib/handle-rate-limit-error";

export default function saveEvents(ctx, payload) {
  const { client, metric } = ctx;
  const { syncAgent } = ctx.service;
  const { events = [] } = payload;

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
      return Promise.resolve("ok");
    }

    metric.increment("ship.incoming.events", 1);
    const asUser = client.asUser(ident);
    return asUser.track(eventName, props, context).then(
      () => asUser.logger.info("incoming.event.success", { eventName, props, context }),
      (error) => asUser.logger.error("incoming.event.error", { eventName, props, context, errors: error })
    );
  })
  .catch(err => handleRateLimitError(ctx, "saveEvents", payload, err));
}
