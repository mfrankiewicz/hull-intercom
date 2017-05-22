import _ from "lodash";

function batchHandler(ctx, source, segmentId) {
  return (users) => {
    const ignoreFilter = (source !== "connector");
    users = _.filter(users.map(u => {
      return ctx.shipApp.syncAgent.updateUserSegments(u, { add_segment_ids: [segmentId] }, ignoreFilter);
    }));

    users.map(u => ctx.client.logger.debug("outgoing.user.start", _.pick(u, ["email", "id"])));

    return ctx.enqueue("sendUsers", { users });
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

  return ctx.client.utils.extract.handle({ body, batchSize: 100, handler: batchHandler(ctx, source, segmentId) });
}
