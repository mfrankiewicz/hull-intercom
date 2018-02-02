const Minihull = require("minihull");
const expect = require("chai").expect;
const moment = require("moment");

const Miniintercom = require("./miniintercom");
const bootstrap = require("./bootstrap");

process.env.OVERRIDE_INTERCOM_URL = "http://localhost:8002";

describe("fetchLeads", function test() {
  let minihull;
  let miniintercom;
  let server;
  beforeEach((done) => {
    minihull = new Minihull();
    miniintercom = new Miniintercom();
    server = bootstrap();
    minihull.listen(8001);
    minihull.stubConnector({
      id: "123456789012345678901234",
      private_settings: {
        access_token: "intercomABC"
      }
    });
    miniintercom.listen(8002).then(done);
  });

  it("should fetch all leads", (done) => {
    this.timeout(10000);
    const now = moment().format("X");
    miniintercom.stubApp("/contacts")
    .callsFake((req, res) => {
      res.json({
        contacts: [{
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
    });
    minihull.on("incoming.request#4", (req) => {
      expect(req.body.private_settings.leads_last_fetched_at).to.be.eql(moment(now, "X").format());
      done();
    });
    minihull.postConnector("123456789012345678901234", "http://localhost:8000/fetch-leads").then(() => {});
  });

  it("should skip the fetch operation in case of rate limit error", (done) => {
    const contactsStub = miniintercom.stubApp("/contacts")
    .onFirstCall().callsFake((req, res) => {
      res.status(429).end();
    });

    minihull.postConnector("123456789012345678901234", "http://localhost:8000/fetch-leads")
    .then(() => {
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
