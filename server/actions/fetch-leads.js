/* @flow */
import type { $Response, NextFunction } from "express";

export default function fetchLeads(req: Object, res: $Response, next: NextFunction) {
  if (req.query.fetch_all) {
    return req.hull.enqueue("fetchAllLeads").then(next, next);
  }
  return req.hull.enqueue("fetchLeads", {
    updated_after: req.query.updated_after,
    updated_before: req.query.updated_before
  }).then(next, next);
}
