// @flow
import { Request, Response } from "express";

export default function fetchLeads(req: Request, res: Response, next: Function) {
  req.hull.enqueue("fetchLeads", {
    fetch_all: req.query.fetch_all,
    updated_after: req.query.updated_after,
    updated_before: req.query.updated_before
  }).then(next, next);
}
