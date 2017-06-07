import _ from "lodash";

import sendUsers from "./send-users";

function batchHandler(ctx, source, segmentId) {
  return (users) => {
    const ignoreFilter = (source !== "connector");
    users = _.filter(users.map(u => {
      return ctx.service.syncAgent.updateUserSegments(u, { add_segment_ids: [segmentId] }, ignoreFilter);
    }));

    users.map(u => ctx.client.logger.debug("outgoing.user.start", _.pick(u, ["email", "id"])));

    return sendUsers(ctx, { users });
  };
}


export default function handleBatch(ctx, payload) {
  const { segmentId, body, source } = payload;
  ctx.metric.event("batch", {
    properties: {
      context: ctx.client.configuration(),
      text: JSON.stringify(payload.body)
    }
  });
  ctx.client.logger.debug("outgoing.batch", { body });
  return ctx.client.utils.extract.handle({ body, batchSize: 100, handler: batchHandler(ctx, source, segmentId) });
}
