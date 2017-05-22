import Promise from "bluebird";
import _ from "lodash";

export default function userUpdate(ctx, messages) {
  const { syncAgent } = ctx.shipApp;
  const { logger } = ctx.client;
  if (!syncAgent.isConfigured()) {
    logger.info("ship is not configured");
    return Promise.resolve();
  }
  logger.debug("MESSAGES", messages.length);
  const users = messages.reduce((accumulator, message) => {
    const { user, changes = {}, segments = [], events = [] } = message;
    const { left = [] } = _.get(changes, "segments", {});

    logger.debug("outgoing.user.start", _.pick(user, ["email", "id"]));

    if (!_.isEmpty(_.get(changes, "user['traits_intercom/id'][1]"))
      || !_.isEmpty(_.get(changes, "user['traits_intercom/tags'][1]"))) {
      logger.debug("outgoing.user.skip", _.pick(user, ["email", "id"]));
      return accumulator;
    }
    user.segment_ids = user.segment_ids || segments.map(s => s.id);

    const filteredUser = syncAgent.updateUserSegments(user, {
      add_segment_ids: segments.map(s => s.id),
      remove_segment_ids: left.map(s => s.id)
    });

    if (!filteredUser) {
      logger.info("outgoing.user.skip", _.merge(_.pick(user, ["email", "id", "external_id"]), {
        reason: "doesn't match filtered segments"
      }));
      return accumulator;
    }

    user.events = events || [];
    return accumulator.concat(user);
  }, []);

  return ctx.enqueue("sendUsers", { users });
}
