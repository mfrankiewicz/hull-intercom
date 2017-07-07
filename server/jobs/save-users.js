import Promise from "bluebird";
import _ from "lodash";

import handleRateLimitError from "../lib/handle-rate-limit-error";

/**
 * Saves users incoming from Intercom API
 * @return {Promise}
 * @param ctx
 * @param payload
 */
export default function saveUsers(ctx, payload) {
  const { users } = payload;
  const { syncAgent } = ctx.service;

  ctx.metric.increment("ship.incoming.users", users.length);

  return Promise.map(users, (intercomUser) => {
    const ident = syncAgent.userMapping.getIdentFromIntercom(intercomUser);
    const traits = syncAgent.userMapping.getHullTraits(intercomUser);
    if (ident.email) {
      const asUser = ctx.client.asUser(ident);
      asUser.logger.info("incoming.user.success");
      return asUser.traits(traits);
    }
    return ctx.client.asUser(ident).logger.info("incoming.user.skip", { reason: "missing email in ident" });
  }).then(() => {
    const customAttributes = _.uniq(_.flatten(users.map(u => _.keys(u.custom_attributes))));
    const oldAttributes = ctx.ship.private_settings.custom_attributes;
    const newAttributes = _.difference(customAttributes, oldAttributes);
    if (!_.isEmpty(newAttributes)) {
      return ctx.helpers.updateSettings({
        custom_attributes: _.concat(oldAttributes, newAttributes)
      });
    }
    return true;
  })
  .catch(err => handleRateLimitError(ctx, "saveUsers", payload, err));
}
