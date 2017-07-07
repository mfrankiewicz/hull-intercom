// @flow
import { Request, Response } from "express";

export default function fetchLeads(req: Request, res: Response, next: Function) {
  if (req.query.fetch_all) {
    return req.hull.enqueue("fetchAllLeads").then(next, next);
  }
  return req.hull.enqueue("fetchLeads", {
    updated_after: req.query.updated_after,
    updated_before: req.query.updated_before
  }).then(next, next);
}
