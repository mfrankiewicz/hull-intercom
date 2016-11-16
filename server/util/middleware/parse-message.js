import rawBody from "raw-body";

/**
 * @param  {Object}   req
 * @param  {Object}   res
 * @param  {Function} next
 */
export default function handle(req, res, next) {
  req.hull = req.hull || {};
  rawBody(req, true, (err, body) => {
    if (err) {
      const e = new Error("Invalid Body");
      e.status = 400;
      return next(e);
    }
    try {
      req.hull.message = JSON.parse(body);
    } catch (parseError) {
      const e = new Error("Invalid Body");
      e.status = 400;
      return next(e);
    }
    return next();
  });
}
