/* global describe, it */
import { expect } from "chai";
import sinon from "sinon";

import saveLeads from "../server/jobs/save-leads";
import getLeadIdent from "../server/lib/get-lead-ident";
import getClientMock from "./mocks/client-mock";

describe("saveLeads", () => {
  it("should call asUser and traits methods for each lead and return Promise", () => {
    const clientMock = getClientMock();
    const asUserSpy = sinon.spy(clientMock, "asUser");
    const traitsSpy = sinon.spy(clientMock, "traits");
    const result = saveLeads({
      client: clientMock
    }, [{ user_id: "123" }]);
    expect(asUserSpy.callCount).to.be.equal(1);
    expect(traitsSpy.callCount).to.be.equal(1);
    expect(result).to.be.a("promise");
  });
});

describe("getLeadIdent", () => {
  it("should set user_id as anonymous_id", () => {
    const ident = getLeadIdent({}, { user_id: "abc" });
    expect(ident.anonymous_id).to.equal("intercom:abc");
  });
});
