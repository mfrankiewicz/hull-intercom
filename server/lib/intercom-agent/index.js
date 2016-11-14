import _ from "lodash";
import Promise from "bluebird";

/**
 * Superset of Intercom API
 */
export default class IntercomAgent {

    constructor(intercomClient, queueAgent) {
      this.intercomClient = intercomClient;
      this.queueAgent = queueAgent;
    }

    getJob(id) {
      return this.intercomClient.get(`/jobs/${id}`)
        .then(res => {
          return _.get(res, "body.tasks[0].state") === "completed"
            || _.get(res, "body.tasks[0].state") === "completed_with_errors";
        });
    }

    importUsers(scroll_param = null) {
      return this.intercomClient.get("/users/scroll")
      .query({ scroll_param })
      .then(response => {
        const { users, scroll_param } = response.body;

        return { users, scroll_param };
      })
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);

        if (_.get(fErr, "extra.body.errors[0].code") === "scroll_exists") {
          console.error("Trying to perform two separate scrolls");
          return Promise.resolve([]);
        }

        if (_.get(fErr, "extra.body.errors[0].code") === "not_found") {
          console.error("Scroll expired, should start it again");
          return Promise.resolve([]);
        }

        // handle errors which may happen here
        return Promise.reject(fErr);
      });
    }

    saveUsers(users) {
      if (_.isEmpty(users)) {
        return Promise.resolve();
      }
      const body = {
        "items": users.map(u => {
          return {
            method: "post",
            data_type: "user",
            data: u
          };
        })
      };
      return this.intercomClient
        .post("/bulk/users")
        .send(body)
        .catch(err => {
          const fErr = this.intercomClient.handleError(err);
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
            return Promise.reject(fErr);
          });
      }, { concurrency: 3 });
    }

}
