/* @flow */
import type { $Response } from "express";

const Promise = require("bluebird");
const _ = require("lodash");

function statusCheck(req: Object, res: $Response) {
  const {
    segments = [],
    ship = {},
    client = {},
    service = {}
  } = req.hull;
  const messages = [];
  let status = "ok";
  const promises = [];
  const audit = [];

  if (!_.get(ship, "private_settings.access_token")) {
    messages.push("Missing access token");
    status = "error";
  }

  if (_.isEmpty(_.get(ship, "private_settings.synchronized_segments", []))) {
    messages.push("No segments will be send out to Intercom because of missing configuration");
    status = "warning";
  }

  if (_.isEmpty(_.get(ship, "private_settings.send_events", []))) {
    messages.push("No events will be sent to Intercom because of missing configuration");
    status = "warning";
  }

  if (_.get(ship, "private_settings.access_token")) {
    promises.push(service.intercomAgent.getUsersTotalCount()
      .then((total) => {
        if (!total || (total === 0)) {
          messages.push("Got zero results from Intercom");
          status = "error";
        }
      }).catch((err) => {
        if (err && err.statusCode === 401) {
          messages.push("API Credentials are invalid");
        } else {
          messages.push(`Error when trying to connect with Intercom: ${_.get(err, "message", "Unknown")}`);
        }
        status = "error";
      }));
    promises.push(service.intercomAgent.intercomClient.get("/tags")
      .then(({ body }) => {
        const mapping = _.get(ship, "private_settings.tag_mapping");
        const promises2 = [];
        _.forEach(mapping, (tagId, segmentId) => {
          const segment = _.find(segments, { id: segmentId });
          const tag = _.find(body.tags, { id: tagId });
          if (_.isUndefined(tag) && segment !== undefined) {
            messages.push(`Not found tag: ${tagId} mapped to segment: ${segmentId} (${segment.name})`);
            status = "error";
          }
          if (segment !== undefined && _.includes(_.get(ship, "private_settings.synchronized_segments", []), segmentId)) {
            promises2.push(service.intercomAgent
              .intercomClient.get("/users").query({ tag_id: tagId, per_page: 1 })
              .then((res) => {
                return audit.push({
                  segmentId,
                  tagId,
                  name: segment.name,
                  hullCount: segment.stats.users,
                  intercomCount: res.body.pages.total_pages,
                  percentage: segment.stats.users === 0
                    ? 0
                    : res.body.pages.total_pages / segment.stats.users * 100
                });
              }));
          }
        });
        return Promise.all(promises2);
      }));
  }

  Promise.all(promises).then(() => {
    res.json({ status, messages, audit: _.sortBy(audit, ["name"]) });
    return client.put(`${ship.id}/status`, { status, messages });
  });
}

module.exports = statusCheck;
