import _ from "lodash";
import uri from "urijs";
import Promise from "bluebird";

export default class WebhookAgent {

  constructor(intercomAgent, hullAgent, ship, hostname) {
    this.ship = ship;
    this.hullAgent = hullAgent
    this.hullClient = hullAgent.hullClient;
    this.intercomClient = intercomAgent.intercomClient;
    this.hostname = hostname;

    this.webhookId = _.get(this.ship, `private_settings.webhook_id`);
  }

  /**
   * @return Promise
   */
  ensureWebhook() {
    if (this.webhookId) {
      return Promise.resolve(this.webhookId);
    }
    return this.createWebhook();
  }

  createWebhook() {

    const url = this.getWebhookUrl();

    return this.intercomClient.post("/subscriptions")
      .send({
        service_type: "web",
        topics: ["user.created", "user.deleted", "user.unsubscribed", "user.updated"],
        url: url
      })
      .catch(err => {
        const fErr = this.intercomClient.handleError(err);
        // handle errors which may happen here
        return Promise.reject(fErr);
      })
      .then(res => {
        this.webhookId = res.body.id;
        return this.hullAgent.updateShipSettings({
          webhook_id: this.webhookId
        }).then(() => {
          return this.webhookId;
        });
      });
  }

  getWebhookUrl() {
    const { organization, id, secret } = this.hullClient.configuration();
    const search = {
      organization,
      secret,
      ship: id
    };
    return uri(`https://${this.hostname}/intercom`).search(search).toString();
  }
}
