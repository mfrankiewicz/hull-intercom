import Promise from "bluebird";
import _ from "lodash";
import moment from "moment";

export default class Jobs {

  /**
   * Takes incoming list of users with fields and segment_ids set.
   * Performing the
   */
  static sendUsers(req) {
    const { users, mode = "bulk", setUserId = false } = req.payload;
    const { syncAgent, hullAgent, intercomAgent, queueAgent } = req.shipApp;

    req.shipApp.instrumentationAgent.metricVal("send_users", users.length);

    const usersToSave = syncAgent.getUsersToSave(users);
    const intercomUsersToSave = usersToSave.map(u => syncAgent.userMapping.getIntercomFields(u, { setUserId }));

    return syncAgent.syncShip()
      .then(() => intercomAgent.saveUsers(intercomUsersToSave, mode))
      .then(res => {
        if (_.isArray(res)) {
          const savedUsers = _.intersectionBy(usersToSave, res, "email");
          const errors = _.filter(res, { body: { type: "error.list" } });

          req.hull.client.logger.error("ERRORS", errors.map(r => r.body.errors));

          const groupedErrors = errors.map(errorReq => {
            return {
              data: errorReq.req.data,
              error: errorReq.body.errors
            };
          });

          return syncAgent.groupUsersToTag(savedUsers)
            .then(groupedUsers => intercomAgent.tagUsers(groupedUsers))
            .then(() => syncAgent.handleUserErrors(groupedErrors, usersToSave))
            .then(res => {
              if (!_.isEmpty(res)) {
                return queueAgent.create("sendUsers", { users: res, setUserId: true });
              }
            })
        }

        if (_.get(res, "body.id")) {
          return queueAgent.create("handleBulkJob", { users: usersToSave, id: res.body.id });
        }
        return Promise.resolve();
      });
  }

  static handleBulkJob(req) {
    const { id, users, attempt = 1 } = req.payload;
    const { syncAgent, intercomAgent, queueAgent, hullAgent } = req.shipApp;

    return intercomAgent.getJob(id)
      .then(({ isCompleted, hasErrors }) => {

        if (isCompleted) {
          req.shipApp.instrumentationAgent.metricVal("bulk_job.attempt", attempt);
          return (() => {
            if (hasErrors) {
              return intercomAgent.getJobErrors(id)
                .then(data => syncAgent.handleUserErrors(data, users))
                .then(res => {
                  if (!_.isEmpty(res)) {
                    return queueAgent.create("sendUsers", { users: res, setUserId: true });
                  }
                });
            }
            return Promise.resolve();
          })()
            .then(() => syncAgent.groupUsersToTag(users))
            .then(groupedUsers => intercomAgent.tagUsers(groupedUsers))
        }

        if (attempt > 20) {
          req.shipApp.instrumentationAgent.metricInc("bulk_job.fallback");
          return queueAgent.create("sendUsers", { users, mode: "regular" });
        }

        return queueAgent.create("handleBulkJob", {
          users,
          id,
          attempt: attempt + 1
        }, { delay: attempt * 10000 });
      });
  }

  static saveUsers(req) {
    const { users } = req.payload;
    const { syncAgent, hullAgent } = req.shipApp;

    req.shipApp.instrumentationAgent.metricVal("save_users", users.length);

    const mappedUsers = users.map((u) => syncAgent.userMapping.getHullTraits(u));

    return syncAgent.webhookAgent.ensureWebhook()
      .then(() => hullAgent.getSegments())
      .then((segments) => syncAgent.tagMapping.sync(segments))
      .then(() => {
        return Promise.map(mappedUsers, (user) => {
          req.hull.client.logger.info("SAVE USER", user.email);
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
    let { last_updated_at } = req.payload;
    const { count, page = 1 } = req.payload;

    return (() => {
      if (_.isEmpty(last_updated_at)) {
        return syncAgent.getLastUpdatedAt();
      }
      return Promise.resolve(last_updated_at);
    })()
      .then((new_last_updated_at) => {
        req.hull.client.logger.info("syncUsers", { new_last_updated_at, page });
        return intercomAgent.getRecentUsers(new_last_updated_at, count, page)
          .then(({ users, hasMore }) => {
            const promises = [];
            if (hasMore) {
              promises.push(queueAgent.create("syncUsers", {
                last_updated_at: new_last_updated_at,
                count,
                page: page + 1
              }));
            }

            if (!_.isEmpty(users)) {
              promises.push(queueAgent.create("saveUsers", { users }));
            }

            return Promise.all(promises);
          });
      });
  }

}
