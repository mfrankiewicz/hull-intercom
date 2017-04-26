/* global describe, it */
import Hull from "hull";
import express from "express";
import request from "request";

import AppRouter from "../server/router/app";
import OAuthRouter from "../server/router/oauth";
import KueRouter from "../server/router/kue";
import ClientMock from "./mocks/client-mock";
import * as controllers from "../server/controller";

const assert = require("assert");

const app = express();

const hostSecret = "1234";
const connector = new Hull.Connector({ hostSecret, port: 8080 });
connector.setupApp(app);

connector.queue.adapter.app = (req, res, next) => { return next(); }; // Memory queue does not have app field


app.use((req, res, next) => {
  req.hull = {
    client: ClientMock(),
    ship: {
      private_settings: {
        token: "12345"
      }
    },
    metric: {
      increment: () => {}
    }
  };

  next();
});

const shipConfig = {
  hostSecret,
  clientID: "123",
  clientSecret: "321"
};

const opts = {
  connector,
  controllers,
  shipConfig,
  jobs: controllers.Jobs
};

app.use("/", AppRouter(opts))
  .use("/", OAuthRouter(opts))
  .use("/kue", KueRouter(connector));


connector.startApp(app);

describe("Server", () => {
  describe("for /schema/user_fields", () => {
    it("should", (done) => {
      let body = "";

      request
        .get("http://127.0.0.1:8080/schema/user_fields")
        .on("response", (response) => {
          assert(response.statusCode === 200);
        })
        .on("data", (data) => {
          body += data;
        });

      setTimeout(() => {
        console.log(body);
        done();
      }, 100);
    });
  });
});
