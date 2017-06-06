import Minihull from "minihull";
import { Connector } from "hull";
import express from "express";
import { expect } from "chai";
import moment from "moment";

import Miniintercom from "./miniintercom";
import bootstrap from "./bootstrap";

process.env.OVERRIDE_INTERCOM_URL = "http://localhost:8002";

describe("fetchLeads", function test() {
  let minihull, miniintercom, server;
  before((done) => {
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
    miniintercom.app.get("/contacts", (req, res) => {
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
    minihull.on("incoming.request.5", (req) => {
      expect(req.body.batch[0].type).to.be.eql("traits");
      expect(req.body.batch[0].body).to.be.eql({ "intercom/type": "lead" });
      done();
    });

    minihull.on("incoming.request.4", (req) => {
      expect(req.body.private_settings.leads_last_fetched_at).to.be.eql(moment(now, "X").format());
    });

    minihull.callFirstShip("/fetch-leads")
    .then((res) => {});
  });

  after(() => {
    minihull.resetDbState();
    minihull.close();
    miniintercom.resetDbState();
    miniintercom.close();
    server.close();
  });
});
