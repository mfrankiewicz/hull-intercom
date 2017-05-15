export default function batchHandler(req, res, next) {
  const segmentId = req.query.segment_id || null;
  const source = req.query.source || null;
  req.hull.enqueue("handleBatch", { body: req.body, segmentId, source })
    .then(next, next);
}
