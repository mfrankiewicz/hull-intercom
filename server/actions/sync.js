export default function sync(req, res, next) {
  req.hull.lock.get("fetchUsers", 30000)
    .then(() => req.hull.enqueue("fetchUsers"), () => "other fetch running, skipping")
    .then(next, next);
}
