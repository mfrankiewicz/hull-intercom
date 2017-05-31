export default function fetchAll(req, res, next) {
  req.hull.enqueue("fetchAllUsers", {
    updated_after: req.query.updated_after,
    updated_before: req.query.updated_before
  }).then(next, next);
}
