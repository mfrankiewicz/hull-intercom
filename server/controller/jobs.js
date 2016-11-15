import Promise from "bluebird";
import _ from "lodash";

export default class Jobs {

  /**
   * Takes incoming list of users with fields and segment_ids set.
   * Performing the
   */
  sendUsers(req) {
    const { users } = req.payload;
    const { syncAgent, hullAgent, intercomAgent, queueAgent } = req.shipApp;

    const usersToSave = syncAgent.getUsersToSave(users);
    const usersToTag = syncAgent.getUsersToTag(users);

    const intercomUsersToSave = usersToSave.map(u => syncAgent.userMapping.getIntercomFields(u));
    const intercomUsersToTag = usersToTag.map(u => syncAgent.userMapping.getIntercomFields(u));
    return syncAgent.webhookAgent.ensureWebhook()
      .then(() => hullAgent.getSegments())
      .then((segments) => {
        return syncAgent.tagMapping.sync(segments)
      })
      .then(() => intercomAgent.tagUsers(intercomUsersToTag))
      .then(() => intercomAgent.saveUsers(intercomUsersToSave))
      .then(res => {
        if (_.get(res, "body.id")) {
          return queueAgent.create("handleBulkJob", { users: usersToSave, id: res.body.id });
        }
        return Promise.resolve();
      });
  }

  handleBulkJob(req) {
    const { id, users } = req.payload;
    const { syncAgent, intercomAgent, queueAgent, hullAgent } = req.shipApp;

    return intercomAgent.getJob(id)
      .then(isCompleted => {
        if (isCompleted) {
          return syncAgent.groupUsersToTag(users)
            .then(groupedUsers => {
              return intercomAgent.tagUsers(groupedUsers);
            });
        } else {
          return queueAgent.create("handleBulkJob", { users, id }, { delay: 10000 });
        }
      });
  }

  saveUsers(req) {
    const { users } = req.payload;
    const { syncAgent, hullAgent } = req.shipApp;

    const mappedUsers = users.map((u) => syncAgent.userMapping.getHullTraits(u));

    return syncAgent.webhookAgent.ensureWebhook()
      .then(() => hullAgent.getSegments())
      .then((segments) => {
        return syncAgent.tagMapping.sync(segments)
      })
      .then(() => {
        return Promise.map(mappedUsers, (user) => {
          console.log("SAVE USER", user.email);
          const ident = { email: user.email };
          if (user["intercom/id"]) {
            ident.anonymous_id = `intercom:${user["intercom/id"]}`;
          }
          return req.hull.client.as(ident).traits(user);
        }, { concurrency: 3 });
      });
  }

  importUsers(req) {
    const { scroll_param } = req.payload;
    const { intercomAgent, queueAgent } = req.shipApp;
    return intercomAgent.importUsers(scroll_param)
      .then(({ users, scroll_param }) => {
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
          queueAgent.create("importUsers", { scroll_param }, { priority: "high" }),
          queueAgent.create("saveUsers", { users })
        ]);
      });
  }

}
