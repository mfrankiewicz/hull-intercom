import Promise from "bluebird";
import _ from "lodash";
import moment from "moment";

export default class Jobs {

  /**
   * Takes incoming list of users with fields and segment_ids set.
   * Performing the
   */
  static sendUsers(req) {
    const { users } = req.payload;
    const { syncAgent, hullAgent, intercomAgent, queueAgent } = req.shipApp;

    const usersToSave = syncAgent.getUsersToSave(users);
    const usersToTag = syncAgent.getUsersToTag(users);

    const intercomUsersToSave = usersToSave.map(u => syncAgent.userMapping.getIntercomFields(u));

    return syncAgent.syncShip()
      .then(() => {
        return syncAgent.groupUsersToTag(usersToTag)
          .then(groupedUsers => intercomAgent.tagUsers(groupedUsers));
      })
      .then(() => intercomAgent.saveUsers(intercomUsersToSave))
      .then(res => {
        if (_.isArray(res)) {
          const savedUsers = _.intersectionBy(usersToSave, res, "email");
          const errors = _.filter(res, { body: { type: "error.list" } });
          // ERRORS [ [ { code: 'bad_request', message: 'bad \'asdfasdf\' parameter' } ] ]
          console.log("ERRORS", errors.map(e => e.errors));

          return syncAgent.groupUsersToTag(savedUsers)
            .then(groupedUsers => intercomAgent.tagUsers(groupedUsers))
            .then(() => {
              return Promise.map(errors, error => {
                return syncAgent.saveUserError(error);
              });
            });
        }

        if (_.get(res, "body.id")) {
          return queueAgent.create("handleBulkJob", { users: usersToSave, id: res.body.id });
        }
        return Promise.resolve();
      });
  }

  static handleBulkJob(req) {
    const { id, users } = req.payload;
    const { syncAgent, intercomAgent, queueAgent, hullAgent } = req.shipApp;

    return intercomAgent.getJob(id)
      .then(isCompleted => {
        if (isCompleted) {
          return syncAgent.groupUsersToTag(users)
            .then(groupedUsers => {
              return intercomAgent.tagUsers(groupedUsers);
            });
        }
        return queueAgent.create("handleBulkJob", { users, id }, { delay: 10000 });
      });
  }

  static saveUsers(req) {
    const { users } = req.payload;
    const { syncAgent, hullAgent } = req.shipApp;

    const mappedUsers = users.map((u) => syncAgent.userMapping.getHullTraits(u));

    return syncAgent.webhookAgent.ensureWebhook()
      .then(() => hullAgent.getSegments())
      .then((segments) => syncAgent.tagMapping.sync(segments))
      .then(() => {
        return Promise.map(mappedUsers, (user) => {
          console.log("SAVE USER", user.email);
          const ident = { email: user.email };
          if (user["intercom/id"]) {
            ident.anonymous_id = `intercom:${user["intercom/id"]}`;
          }
          return req.hull.client.as(ident).traits(user);
        });
      });
  }

  static importUsers(req) {
    const { scroll_param } = req.payload;
    const { intercomAgent, queueAgent } = req.shipApp;
    return intercomAgent.importUsers(scroll_param)
      .then(({ users, scroll_param: next_scroll_param }) => {
        if (_.isEmpty(users)) {
          return Promise.resolve();
        }
        console.log("IMPORTED", users.length);
        // scroll feature of Intercom API have expiration time which is
        // hard to recover from. The is the reason why continuing the import
        // scroll queries is more important than other tasks here.
        // It will put much more data into the queue, but when user scroll param
        // expires it cannot be recovered.
        // @see https://developers.intercom.com/reference#iterating-over-all-users
        return Promise.all([
          queueAgent.create("importUsers", { scroll_param: next_scroll_param }, { priority: "high" }),
          queueAgent.create("saveUsers", { users })
        ]);
      });
  }

  static handleBatch(req) {
    const { hullAgent, syncAgent } = req.shipApp;
    const { body, segmentId } = req.payload;
    return hullAgent.extractAgent.handleExtract(body, 100, (users) => {
      users = _.filter(users.map(u => {
        return syncAgent.updateUserSegments(u, { add_segment_ids: [segmentId] });
      }));
      return req.shipApp.queueAgent.create("sendUsers", { users });
    });
  }

  static syncUsers(req) {
    const { hullAgent, syncAgent, intercomAgent, queueAgent } = req.shipApp;
    let { last_sync_at } = req.payload;
    const { count, page } = req.payload;

    return (() => {
      if (_.isEmpty(last_sync_at)) {
        last_sync_at = _.get(req, "hull.ship.private_settings.last_sync_at", moment().utc());
        return hullAgent.updateShipSettings({ last_sync_at });
      }
      return Promise.resolve();
    })()
      .then(() => intercomAgent.getRecentUsers(last_sync_at, count, page))
      .then(({ users, hasMore }) => {
        const promises = [];

        if (hasMore && !_.isEmpty(users)) {
          promises.push(queueAgent.create("syncUsers", {
            last_sync_at,
            count,
            page: page + 1
          }));
        }

        if (!_.isEmpty(users)) {
          promises.push(queueAgent.create("saveUsers", { users }));
        }

        return Promise.all(promises);
      });
  }

}
