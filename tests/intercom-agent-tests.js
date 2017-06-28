/* global describe, it */
import { expect } from "chai";
import sinon from "sinon";
import { Cache } from "hull/lib/infra";

import IntercomAgent from "../server/lib/intercom-agent";


describe("IntercomAgent", () => {
  const cache = new Cache();

  const ctxStub = {
    client: {
      logger: {
        debug: () => {}
      },
      configuration: () => {
        return {
          organization: "hull.rocks",
          id: "1234",
          secret: "1234"
        };
      }
    }
  };
  cache.contextMiddleware()({ hull: ctxStub }, {}, () => {});

  const intercomClientStub = {
    get: () => {}
  };

  it("should cache the getTags results", (done) => {
    const getStub = sinon.stub(intercomClientStub, "get").resolves({
      body: {
        tags: [{ name: "foo" }]
      }
    });

    const intercomAgent = new IntercomAgent(intercomClientStub, ctxStub);

    intercomAgent.getTags()
      .then((tags) => {
        expect(tags).to.eql([{ name: "foo" }]);
        return intercomAgent.getTags();
      })
      .then(tags => {
        expect(tags).to.eql([{ name: "foo" }]);
        expect(getStub.callCount).to.equal(1);
        done();
      });
  });
});
