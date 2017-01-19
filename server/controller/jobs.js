import Promise from "bluebird";
import _ from "lodash";

export default class Jobs {

  /**
   * Takes list of users with fields and segment_ids set,
   * sends them to Intercom and tags them.
   */
  static sendUsers(req) {
    const { users, mode = "bulk" } = req.payload;
    const { syncAgent, intercomAgent, queueAgent } = req.shipApp;

    const usersToSave = syncAgent.getUsersToSave(users);
    const intercomUsersToSave = usersToSave.map(u => syncAgent.userMapping.getIntercomFields(u));

    req.shipApp.instrumentationAgent.metricVal("ship.outgoing.users", intercomUsersToSave.length, req.hull.client.configuration());

    return syncAgent.syncShip()
      .then(() => intercomAgent.sendUsers(intercomUsersToSave, mode))
      .then(res => {
        if (_.isArray(res)) {
          const savedUsers = _.intersectionBy(usersToSave, res, "email")
            .map(u => {
              const intercomData = _.find(res, { email: u.email });
              u["traits_intercom/id"] = intercomData.id;
              return u;
            });
          const errors = _.filter(res, { body: { type: "error.list" } });

          req.hull.client.logger.error("ERRORS", errors.map(r => r.body.errors));

          const groupedErrors = errors.map(errorReq => {
            return {
              data: errorReq.req.data,
              error: errorReq.body.errors
            };
          });

          return syncAgent.sendEvents(savedUsers)
            .then(() => syncAgent.groupUsersToTag(savedUsers))
            .then(groupedUsers => intercomAgent.tagUsers(groupedUsers))
            .then(() => syncAgent.handleUserErrors(groupedErrors));
        }

        if (_.get(res, "body.id")) {
          return queueAgent.create("handleBulkJob", { users: usersToSave, id: res.body.id });
        }
        return Promise.resolve();
      });
  }

  static handleBulkJob(req) {
    const { id, users, attempt = 1 } = req.payload;
    const { syncAgent, intercomAgent, queueAgent } = req.shipApp;
    return intercomAgent.getJob(id)
      .then(({ isCompleted, hasErrors }) => {
        if (isCompleted) {
          req.shipApp.instrumentationAgent.metricVal("intercom.bulk_job.attempt", attempt, req.hull.client.configuration());
          return (() => {
            if (hasErrors) {
              return intercomAgent.getJobErrors(id)
                .then(data => syncAgent.handleUserErrors(data));
            }
            return Promise.resolve();
          })()
            .then(() => syncAgent.groupUsersToTag(users))
            .then(groupedUsers => intercomAgent.tagUsers(groupedUsers));
        }

        if (attempt > 20) {
          req.shipApp.instrumentationAgent.metricInc("intercom.bulk_job.fallback", 1, req.hull.client.configuration());
          return queueAgent.create("sendUsers", { users, mode: "regular" });
        }

        return queueAgent.create("handleBulkJob", {
          users,
          id,
          attempt: attempt + 1
        }, { delay: attempt * 10000 });
      });
  }


  /**
   * Saves users incoming from Intercom API
   * @param  {Object} req
   * @return {Promise}
   */
  static saveUsers(req) {
    const { users } = req.payload;
    const { syncAgent, hullAgent } = req.shipApp;

    req.shipApp.instrumentationAgent.metricVal("ship.incoming.users", users.length, req.hull.client.configuration());

    return syncAgent.syncShip()
      .then(() => {
        return Promise.map(users, (intercomUser) => {
          req.hull.client.logger.info("incoming.user", intercomUser);
          const ident = syncAgent.userMapping.getIdentFromIntercom(intercomUser);
          const traits = syncAgent.userMapping.getHullTraits(intercomUser);
          return req.hull.client.as(ident).traits(traits);
        });
      })
      .then(() => {
        const customAttributes = _.uniq(_.flatten(users.map(u => _.keys(u.custom_attributes))));
        const oldAttributes = req.hull.ship.private_settings.custom_attributes;
        const newAttributes = _.difference(customAttributes, oldAttributes);
        if (!_.isEmpty(newAttributes)) {
          return hullAgent.updateShipSettings({
            custom_attributes: _.concat(oldAttributes, newAttributes)
          });
        }
        return true;
      });
  }

  static fetchAllUsers(req) {
    const { scroll_param } = req.payload;
    const { intercomAgent, queueAgent, instrumentationAgent } = req.shipApp;
    if (_.isEmpty(scroll_param)) {
      instrumentationAgent.metricEvent({
        title: "fetchAllUsers", context: req.hull.client.configuration(),
      });
    }
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
          queueAgent.create("fetchAllUsers", { scroll_param: next_scroll_param }, { priority: "high" }),
          queueAgent.create("saveUsers", { users })
        ]);
      });
  }

  static handleBatch(req) {
    const { hullAgent, syncAgent, instrumentationAgent } = req.shipApp;
    const { body, segmentId } = req.payload;
    instrumentationAgent.metricEvent({
      title: "batch", context: req.hull.client.configuration(),
    });
    return hullAgent.extractAgent.handleExtract(body, 100, (users) => {
      users = _.filter(users.map(u => {
        return syncAgent.updateUserSegments(u, { add_segment_ids: [segmentId] });
      }));
      return req.shipApp.queueAgent.create("sendUsers", { users });
    });
  }

  static fetchUsers(req) {
    const { syncAgent, intercomAgent, queueAgent } = req.shipApp;
    const { last_updated_at, count, page = 1 } = req.payload;

    return (() => {
      if (_.isEmpty(last_updated_at)) {
        return syncAgent.getLastUpdatedAt();
      }
      return Promise.resolve(last_updated_at);
    })()
      .then((new_last_updated_at) => {
        req.hull.client.logger.info("fetchUsers", { new_last_updated_at, page });
        return intercomAgent.getRecentUsers(new_last_updated_at, count, page)
          .then(({ users, hasMore }) => {
            const promises = [];
            if (hasMore) {
              promises.push(queueAgent.create("fetchUsers", {
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

  static saveEvents(req) {
    const { syncAgent } = req.shipApp;
    const { events = [] } = req.payload;
    return Promise.all(events.map(e => syncAgent.eventsAgent.saveEvent(e)));
  }
}
