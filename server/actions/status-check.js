/* @flow */
import type { $Response } from "express";
import _ from "lodash";

export default function (req: Object, res: $Response) {
  const { ship = {}, client = {}, service = {} } = req.hull;
  const messages = [];
  let status = "ok";
  const promises = [];

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
  }

  Promise.all(promises).then(() => {
    res.json({ status, messages });
    return client.put(`${ship.id}/status`, { status, messages });
  });
}
