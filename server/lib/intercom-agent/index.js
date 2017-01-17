import _ from "lodash";
import Promise from "bluebird";
import moment from "moment";

/**
 * Superset of Intercom API
 */
export default class IntercomAgent {

  constructor(intercomClient, queueAgent, hull, instrumentationAgent) {
    this.intercomClient = intercomClient;
    this.queueAgent = queueAgent;
    this.hull = hull;
    this.logger = hull.client.logger;
    this.instrumentationAgent = instrumentationAgent;
  }

  getJob(id) {
    return this.intercomClient.get(`/jobs/${id}`)
      .then(res => {
        const isCompleted = _.get(res, "body.tasks[0].state") === "completed"
          || _.get(res, "body.tasks[0].state") === "completed_with_errors";

        const hasErrors = _.get(res, "body.tasks[0].state") === "completed_with_errors";

        return {
          isCompleted,
          hasErrors
        };
      });
  }

  getJobErrors(id) {
    return this.intercomClient.get(`/jobs/${id}/error`)
      .then(res => {
        return _.get(res, "body.items", []);
      });
  }

  importUsers(scroll_param = null) {
    return this.intercomClient.get("/users/scroll")
    .query({ scroll_param })
    .then(response => {
      const { users, scroll_param: next_scroll_param } = response.body;

      return { users, scroll_param: next_scroll_param };
    })
    .catch(err => {
      const fErr = this.intercomClient.handleError(err);

      if (_.get(fErr, "extra.body.errors[0].code") === "scroll_exists") {
        this.logger.error("Trying to perform two separate scrolls");
        return Promise.resolve([]);
      }

      if (_.get(fErr, "extra.body.errors[0].code") === "not_found") {
        this.logger.error("Scroll expired, should start it again");
        return Promise.resolve([]);
      }

      // handle errors which may happen here
      return Promise.reject(fErr);
    });
  }

  saveUsers(users, mode = "bulk") {
    if (_.isEmpty(users)) {
      return Promise.resolve();
    }

    this.logger.info("SAVING", users.length);

    const body = {
      items: users.map(u => {
        return {
          method: "post",
          data_type: "user",
          data: u
        };
      })
    };

    if (users.length < (process.env.MINMUM_BULK_SIZE || 10)
      || mode === "regular") {
      return Promise.map(body.items, item => {
        return this.intercomClient.post("/users")
          .send(item.data)
          .then(response => {
            return response.body;
          })
          .catch(err => {
            const fErr = this.intercomClient.handleError(err);
            this.logger.error("intercomAgent.saveUsers.microbatch.error", fErr);
            return Promise.resolve(fErr);
          });
      }, { concurrency: 5 });
    }

    return this.intercomClient
      .post("/bulk/users")
      .send(body)
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);
        this.logger.error("intercomAgent.saveUsers.bulkSubmit.error", fErr);
        return Promise.reject(fErr);
      });
  }

  tagUsers(ops) {
    const opArray = [];
    _.map(ops, (op, segmentName) => {
      opArray.push({
        name: segmentName,
        users: op
      });
    });
    return Promise.map(opArray, (op) => {
      return this.intercomClient.post("/tags")
        .send(op)
        .catch(err => {
          const fErr = this.intercomClient.handleError(err);
          this.logger.error("intercomAgent.tagUsers.error", fErr);
          return Promise.reject(fErr);
        });
    }, { concurrency: 3 });
  }

  /**
   * get total count of users
   */
  getUsersTotalCount() {
    return this.intercomClient.get("/users")
      .query({ per_page: 1 })
      .then(response => {
        return _.get(response, "body.total_count");
      })
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);
        this.logger.error("getUsersTotalCount.error", fErr);
        return Promise.reject(fErr);
      });
  }

  getRecentUsers(last_updated_at, count, page) {
    return this.intercomClient.get("/users")
      .query({
        per_page: count,
        page,
        order: "desc",
        sort: "updated_at"
      })
      .then(response => {
        const originalUsers = _.get(response, "body.users", []);
        const users = originalUsers.filter((u) => {
          return moment(u.updated_at, "X")
            .isAfter(last_updated_at);
        });
        this.logger.info("getRecentUsers.count", {
          total: originalUsers.length,
          filtered: users.length
        });

        return {
          users,
          hasMore: !_.isEmpty(_.get(response, "body.pages.next"))
            && users.length === originalUsers.length
        };
      })
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);
        this.logger.error("getRecentUsers.error", fErr);
        return Promise.reject(fErr);
      });
  }

  /**
   * @see https://developers.intercom.com/reference#event-model
   * @see https://developers.intercom.com/reference#bulk-event-ops
   * @see https://developers.intercom.com/reference#submitting-events
   * @param  {Array} array of events data
   * @return {Promise}
   */
  sendEvents(events) {
    this.instrumentationAgent.metricInc("outgoing.events", events.length, this.hull.client.configuration());
    // FIXME: enable bulk jobs and remove `true` here, when we can match the user by `id`,
    // look at error logged below
    if (true || events.length <= 10) { // eslint-disable-line no-constant-condition
      return Promise.map(events, (event) => {
        return this.intercomClient
        .post("/events")
        .send(event)
        .catch((err) => {
          return Promise.reject(this.intercomClient.handleError(err));
        });
      }, { concurrency: 3 });
    }

    const wrappedEvents = events.map(e => {
      return {
        method: "post",
        data_type: "event",
        data: e
      };
    });

    const batches = _.chunk(wrappedEvents, 100);

    return Promise.map(batches, (batch) => {
      return this.intercomClient
        .post("/bulk/events")
        .send({
          items: batch
        })
        .then(({ body }) => {
          return this.intercomClient
            .get(body.links.error)
            .then((res) => {
              // FIXME: place to verify if the error still persists
              console.error(res.body.items[0].error);
            });
        })
        .catch((err) => {
          return Promise.reject(this.intercomClient.handleError(err));
        });
    }, { concurrency: 3 });
  }
}
