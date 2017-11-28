/* global describe, it */
import Hull from "hull";
import express from "express";
import request from "request";

import AppRouter from "../../server/router/app";
import OAuthRouter from "../../server/router/oauth";
import ClientMock from "./mocks/client-mock";

const assert = require("assert");

const app = express();

const hostSecret = "1234";
const connector = new Hull.Connector({ hostSecret, port: 8070 });
connector.setupApp(app);

connector.queue.adapter.app = (req, res, next) => { return next(); }; // Memory queue does not have app field


app.use((req, res, next) => {
  req.hull = {
    client: ClientMock(),
    ship: {
      private_settings: {
        api_key: "123",
        app_id: "1234",
        access_token: "12345",
        custom_attributes: [
          "custom"
        ]
      },
    },
    metric: {
      increment: () => {}
    }
  };

  next();
});


const opts = {
  hostSecret,
  clientID: "123",
  clientSecret: "321",
};

app.use("/", AppRouter(opts))
  .use("/", OAuthRouter(opts));


connector.startApp(app);

describe("Server", () => {
  describe("for /schema/user_fields", () => {
    it("should", (done) => {
      request
        .get("http://127.0.0.1:8070/schema/user_fields", (error, response, body) => {
          assert(response.statusCode === 200);
          assert.equal(JSON.parse(body).options.slice(-1)[0].label, "custom");
          assert.equal(JSON.parse(body).options.slice(-1)[0].value, "custom");
          done();
        });
    });
  });
});
