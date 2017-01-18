import _ from "lodash";

/**
 * @param  {Object}   req
 * @param  {Object}   res
 * @param  {Function} next
 */
export default function responseMiddleware(result, req, res, next) {
  if (_.isError(result)) {
    try {
      req.hull.client.logger("response.error", result);
    } catch (e) {
      console.error("response.error", result);
    }
    res.status(500);
  } else {
    res.status(200);
  }
  res.end("ok");
  next();
}
