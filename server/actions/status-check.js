/* @flow */
import type { $Response } from "express";
import _ from "lodash";

export default function (req: Object, res: $Response) {
  const { ship = {}, client = {}, service = {} } = req.hull;
  const messages = [];
  let status = "ok";
  const pushMessage = (message) => {
    status = "error";
    messages.push(message);
  };
  const promises = [];

  if (!_.get(ship, "private_settings.access_token")) {
    pushMessage("Missing access token");
  }

  if (_.isEmpty(_.get(ship, "private_settings.synchronized_segments", []))) {
    pushMessage("No segments will be synchronized because of missing configuration");
  }

  if (_.isEmpty(_.get(ship, "private_settings.send_events", []))) {
    // FIXME: decide how to handle emty events settings
    // pushMessage("No events will be sent to Intercom because of missing configuration");
  }

  if (_.get(ship, "private_settings.access_token")) {
    promises.push(service.intercomAgent.getUsersTotalCount()
      .then((total) => {
        if (!total || (total === 0)) {
          pushMessage("Got zero results from Intercom");
        }
      }).catch((err) => {
        if (err && err.statusCode === 401) {
          return pushMessage("API Credentials are invalid");
        }
        return pushMessage(`Error when trying to connect with Intercom: ${_.get(err, "message", "Unknown")}`);
      }));
  }

  Promise.all(promises).then(() => {
    res.json({ status, messages });
    return client.put(`${ship.id}/status`, { status, messages });
  });
}
