export default function sync(req, res, next) {
  return req.hull.enqueue("fetchUsers")
    .then(next, next);
}
