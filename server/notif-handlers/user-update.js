import Promise from "bluebird";
import _ from "lodash";

export default function userUpdate(ctx, messages) {
  const { syncAgent } = ctx.service;
  const { logger } = ctx.client;
  if (!syncAgent.isConfigured()) {
    logger.error("connector.configuration.error", { errors: "connector is not configured" });
    return Promise.resolve();
  }
  const leads = [];
  const leadsToConvert = [];
  const users = messages.reduce((accumulator, message) => {
    const { user, changes = {}, segments = [], events = [] } = message;
    const { left = [], entered = [] } = _.get(changes, "segments", {});

    ctx.client.asUser(user).logger.debug("outgoing.user.start", { changes, events: _.map(events, e => e.event) });
    if (!_.isEmpty(_.get(changes, "user['traits_intercom/id'][1]"))
      || !_.isEmpty(_.get(changes, "user['traits_intercom/tags'][1]"))) {
      ctx.client.asUser(user).logger.info("outgoing.user.skip", { reason: "User was just updated by the Intercom connector, avoiding loop" });
      return accumulator;
    }

    if (ctx.ship.private_settings.skip_users_already_synced && _.get(user, "traits_intercom/id") && _.isEmpty(events)) {
      const hullTraits = syncAgent.userMapping.computeIntercomFields().map(f => f.hull);
      const changedTraits = _.keys(_.get(changes, "user"));
      if (_.intersection(hullTraits, changedTraits).length === 0) {
        ctx.client.asUser(user).logger.info("outgoing.user.skip", { reason: "user already synced with Intercom, none of selected attributes were changed and no event happened" });
        return accumulator;
      }
    }

    user.segment_ids = _.concat(user.segment_ids || [], segments.map(s => s.id));

    const filteredUser = syncAgent.updateUserSegments(user, {
      add_segment_ids: entered.map(s => s.id),
      remove_segment_ids: left.map(s => s.id)
    });

    if (!filteredUser) {
      ctx.client.asUser(user).logger.info("outgoing.user.skip", { reason: "doesn't match filtered segments" });
      return accumulator;
    }

    if (
      user["traits_intercom/is_lead"] === true
      && user.external_id
      && user["traits_intercom/anonymous"] === false
    ) {
      leadsToConvert.push(user);
      return accumulator;
    }

    if (user["traits_intercom/is_lead"] === true) {
      leads.push(user);
      return accumulator;
    }

    user.events = events || [];
    return accumulator.concat(user);
  }, []);

  const promises = [];

  if (!_.isEmpty(users)) {
    promises.push(ctx.enqueue("sendUsers", { users }));
  }

  if (!_.isEmpty(leads)) {
    promises.push(ctx.enqueue("sendLeads", { leads }));
  }

  if (!_.isEmpty(leadsToConvert)) {
    promises.push(ctx.enqueue("convertLeadsToUsers", { users: leadsToConvert }));
  }

  return Promise.all(promises);
}
