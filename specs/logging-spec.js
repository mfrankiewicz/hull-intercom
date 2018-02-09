const Hull = require("hull");
const Minihull = require("minihull");
const expect = require("chai").expect;
const sinon = require("sinon");
const winston = require("winston");
require("winston-spy");

const Miniintercom = require("./miniintercom");
const bootstrap = require("./bootstrap");

process.env.OVERRIDE_INTERCOM_URL = "http://localhost:8002";
process.env.RATE_LIMIT_DELAY = 200;

describe("log error response from intercom", function test() {
  let minihull;
  let miniintercom;
  let server;
  beforeEach(() => {
    minihull = new Minihull();
    miniintercom = new Miniintercom();
    minihull.listen(8001);
    miniintercom.listen(8002);
    server = bootstrap();
    minihull.stubConnector({
      id: "595103c73628d081190000f6",
      private_settings: {
        access_token: "intercomABC",
        webhook_id: "abc-123"
      }
    });
  });

  it("should log the response status after the error", (done) => {
    const loggerSpy = sinon.spy();
    Hull.logger.transports.console.level = "debug";
    Hull.logger.add(winston.transports.SpyLogger, { level: "debug", spy: loggerSpy });

    miniintercom.stubApp("/subscriptions/abc-123")
      .respond(429);

    minihull.notifyConnector("595103c73628d081190000f6", "http://localhost:8000/notify", "ship:update", { foo: "bar" })
      .then(() => {});

    setTimeout(() => {
      expect(loggerSpy.callCount).to.equal(6);
      expect(loggerSpy.getCall(4).args[0]).to.equal("error");
      expect(loggerSpy.getCall(4).args[1]).to.equal("intercomClient.resError");
      Hull.logger.remove(winston.transports.SpyLogger);
      done();
    }, 200);
  });

  afterEach(() => {
    minihull.close();
    miniintercom.close();
    server.close();
  });
});
