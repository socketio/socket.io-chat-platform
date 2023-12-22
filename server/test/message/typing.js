import { expect } from "chai";
import { setup, waitFor } from "./../util.js";

describe("message:typing", () => {
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
    aliceSocket1.emit("message:typing", {
      channelId: context.generalChannelId,
      isTyping: true,
    });

    const event = await waitFor(bobSocket, "message:typing");

    expect(event.userId).to.eql(context.aliceUserId);
    expect(event.channelId).to.eql(context.generalChannelId);
    expect(event.isTyping).to.eql(true);

    aliceSocket1.emit("message:typing", {
      channelId: context.generalChannelId,
      isTyping: false,
    });

    const event2 = await waitFor(bobSocket, "message:typing");

    expect(event2.userId).to.eql(context.aliceUserId);
    expect(event2.channelId).to.eql(context.generalChannelId);
    expect(event2.isTyping).to.eql(false);
  });
});
