import { expect } from "chai";
import { setup } from "./../util.js";

describe("channel:list", () => {
  let context, aliceSocket1, aliceSocket2;

  before(async () => {
    context = await setup();

    aliceSocket1 = context.aliceSocket1;
    aliceSocket2 = context.aliceSocket2;
  });

  after(() => {
    context.cleanup();
  });

  it("should work", async () => {
    await context.resetDatabase();

    const result = await aliceSocket1.emitWithAck("channel:list", {});

    expect(result.status).to.eql("OK");
    expect(result.data).to.eql([
      {
        id: context.generalChannelId,
        name: "General",
        type: "public",
        users: [],
        userCount: 2,
        unreadCount: 0,
      },
      {
        id: context.privateChannelId,
        name: null,
        type: "private",
        users: [context.bobUserId],
        userCount: 2,
        unreadCount: 0,
      },
    ]);
  });
});
