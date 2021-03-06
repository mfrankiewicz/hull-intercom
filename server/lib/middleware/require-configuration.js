/* @flow */
import { Request, Response, Next } from "express";
/**
 * This Middleware makes sure that we have the ship configured to make
 * 3rd API calls
 * @param  {Object}   req
 * @param  {Object}   res
 * @param  {Function} next
 */
export default function requireConfiguration(req: Request, res: Response, next: Next) {
  if (!req.hull.service || !req.hull.service.syncAgent || !req.hull.service.syncAgent.isConfigured()) {
    return res.status(403).send("connector is not configured");
  }
  return next();
}
