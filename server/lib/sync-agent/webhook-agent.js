import _ from "lodash";
import uri from "urijs";
import Promise from "bluebird";

export default class WebhookAgent {

  constructor(intercomAgent, hullAgent, ship, req) {
    this.ship = ship;
    this.hullAgent = hullAgent
    this.hullClient = hullAgent.hullClient;
    this.intercomClient = intercomAgent.intercomClient;
    this.req = req;

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
        topics: ["conversation", "user"],
        url: url
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
    const { hostname } = this.req;
    const { organization, id, secret } = this.hullClient.configuration();
    const search = {
      organization,
      secret,
      ship: id
    };
    return uri(`https://${hostname}/mailchimp`).search(search).toString();
  }
}
