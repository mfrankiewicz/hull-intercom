import Promise from "bluebird";
import _ from "lodash";

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

  return syncAgent.syncShip()
    .then(() => {
      return Promise.map(users, (intercomUser) => {
        ctx.client.logger.info("incoming.user", intercomUser);
        const ident = syncAgent.userMapping.getIdentFromIntercom(intercomUser);
        const traits = syncAgent.userMapping.getHullTraits(intercomUser);
        if (ident.email) {
          return ctx.client.asUser(ident).traits(traits);
        }
        return ctx.client.logger.info("incoming.user.skip", intercomUser);
      });
    })
    .then(() => {
      const customAttributes = _.uniq(_.flatten(users.map(u => _.keys(u.custom_attributes))));
      const oldAttributes = ctx.ship.private_settings.custom_attributes;
      const newAttributes = _.difference(customAttributes, oldAttributes);
      if (!_.isEmpty(newAttributes)) {
        return ctx.helpers.updateSettings({
          custom_attributes: _.concat(oldAttributes, newAttributes)
        });
      }
      return true;
    });
}
