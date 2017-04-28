/* @flow */
import _ from "lodash";
import { Request, Response, Next, Result } from "express";

/**
 * @param result
 * @param  {Object}   req
 * @param  {Object}   res
 * @param  {Function} next
 */
export default function responseMiddleware(result: Result, req: Request, res: Response, next: Next) {
  if (_.isError(result)) {
    try {
      req.hull.client.logger.error("action.error", result);
    } catch (e) {
      console.error("action.error", result);
    }
    res.status(500);
  } else {
    res.status(200);
  }
  res.end("ok");
  next();
}
