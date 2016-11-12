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

    /**
     *
     */
    userAdded(user) {
      return !_.isEmpty(user["intercom/id"]);
    }

    /**
     *
     */
    userWithError(user) {
      return !_.isEmpty(user["traits_mailchimp/import_error"]);
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

    tagUsers(users) {
      const body = {

      };
    }

}
