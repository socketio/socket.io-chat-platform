import { expect } from "chai";
import { setup } from "./../util.js";

describe("user:get", () => {
  let context, aliceSocket1, aliceSocket2, bobSocket;

  before(async () => {
    context = await setup();

    aliceSocket1 = context.aliceSocket1;
    aliceSocket2 = context.aliceSocket2;
    bobSocket = context.bobSocket;
  });

  after(() => {
    context.cleanup();
  });

  it("should work", async () => {
    const result = await aliceSocket1.emitWithAck("user:get", {
      userId: context.bobUserId,
    });

    expect(result.status).to.eql("OK");
    expect(result.data.id).to.eql(context.bobUserId);
    expect(result.data.username).to.eql("bob");
    expect(result.data.isOnline).to.eql(true);
  });
});
