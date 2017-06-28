/* global describe, it */
import { expect } from "chai";
import sinon from "sinon";
import moment from "moment";

import handleRateLimitError from "../server/lib/handle-rate-limit-error";

describe("handleRateLimitError", () => {
  const ctxStub = {
    client: {
      logger: {
        warn: () => {}
      }
    },
    enqueue: () => {}
  };

  it("should requeue the job with a delay in case of 429 error", () => {
    const loggerStub = sinon.stub(ctxStub.client.logger, "warn");
    const enqueueStub = sinon.stub(ctxStub, "enqueue");
    const seconds = 1000;
    const minutes = 60000;

    for (let i = 100; i >= 0; i--) {
      handleRateLimitError(ctxStub, "fooJob", { fooPayload: "bar" }, { statusCode: 429 });
      expect(enqueueStub.firstCall.args[2].delay).to.be.within(10 * seconds, 10 * minutes);
    }
    loggerStub.restore();
    enqueueStub.restore();
  });

  it("should requeue the job with a delay in case of 429 error taking reset time header", () => {
    const loggerStub = sinon.stub(ctxStub.client.logger, "warn");
    const enqueueStub = sinon.stub(ctxStub, "enqueue");
    const seconds = 1000;
    const minutes = 60000;

    for (let i = 100; i >= 0; i--) {
      const resetAt = moment().add(10, "seconds").format("X");
      handleRateLimitError(ctxStub, "fooJob", { fooPayload: "bar" }, {
        statusCode: 429,
        response: {
          header: {
            "x-ratelimit-reset": resetAt
          }
        }
      });
      expect(enqueueStub.firstCall.args[2].delay).to.be.within(20 * seconds, 10 * minutes + 10 * seconds);
    }
    loggerStub.restore();
    enqueueStub.restore();
  });
});
