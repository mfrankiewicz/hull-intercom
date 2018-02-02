function batchHandler(ctx, messages) {
  return ctx.enqueue("handleBatch", messages);
}

module.exports = batchHandler;
