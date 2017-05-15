export default function fetchAll(req, res, next) {
  req.hull.enqueue("fetchAllUsers")
    .then(next, next);
}
