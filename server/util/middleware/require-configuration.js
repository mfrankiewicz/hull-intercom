/**
 * This Middleware makes sure that we have the ship configured to run
 * Hubspot queries
 * @param  {Object}   req
 * @param  {Object}   res
 * @param  {Function} next
 */
export default function requireConfiguration(req, res, next) {
  if (!req.shipApp.hubspotAgent.isConfigured()) {
    req.hull.client.logger.info("ship is not configured");
    return res.sendStatus(403);
  }
  return next();
}
