const Minihull = require("minihull");
const Connector = require("hull").Connector;
const express = require("express");
const expect = require("chai").expect;
const moment = require("moment");

const Miniintercom = require("./miniintercom");
const bootstrap = require("./bootstrap");

process.env.OVERRIDE_INTERCOM_URL = "http://localhost:8002";

describe("fetchLeads", function test() {
  let minihull, miniintercom, server;
  beforeEach((done) => {
    minihull = new Minihull();
    miniintercom = new Miniintercom();
    server = bootstrap();
    setTimeout(() => {
      minihull.listen(8001);
      minihull.install("http://localhost:8000")
        .then(() => {
          minihull.updateFirstShip({
            access_token: "intercomABC"
          });
          done();
        });
    }, 100);

    miniintercom.listen(8002);
  });

  it("should fetch all leads", (done) => {
    const now = moment().format("X");
    miniintercom.stubGet("/contacts")
    .callsFake((req, res) => {
      res.json({
        "contacts": [{
          email: "foo@bar.com",
          user_id: "abc123",
          updated_at: now
        }, {
          user_id: "abc1234",
          updated_at: moment().subtract(1, "minute").format("X")
        }, {
          email: "skip@it.com",
          user_id: "abc12345",
          updated_at: moment().subtract(25, "hour").format("X")
        }]
      });
    });
    minihull.on("incoming.request@/api/v1/firehose", (req) => {
      expect(req.body.batch[0].type).to.be.eql("traits");
      expect(req.body.batch[0].body).to.be.eql({
        email: {
          operation: "setIfNull",
          value: "foo@bar.com"
        },
        "intercom/updated_at": {
          operation: "setIfNull",
          value: now,
        },
        "intercom/is_lead": true,
        "intercom/lead_user_id": "abc123"
      });
      done();
    });

    minihull.on("incoming.request#6", (req) => {
      expect(req.body.private_settings.leads_last_fetched_at).to.be.eql(moment(now, "X").format());
    });

    minihull.callFirstShip("/fetch-leads")
    .then((res) => {});
  });

  it("should skip the fetch operation in case of rate limit error", (done) => {
    const now = moment().format("X");
    const contactsStub = miniintercom.stubGet("/contacts")
    .onFirstCall().callsFake((req, res) => {
      res.status(429).end();
    });

    minihull.callFirstShip("/fetch-leads")
    .then((res) => {
      expect(contactsStub.callCount).to.equal(1);
      done();
    });
  });

  afterEach(() => {
    minihull.close();
    miniintercom.close();
    server.close();
  });
});
