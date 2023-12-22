import { expect } from "chai";
import { setup, waitFor } from "./util.js";

describe("user state", () => {
  let context, aliceSocket1, aliceSocket2, bobSocket;

  before(async () => {
    context = await setup();

    aliceSocket1 = context.aliceSocket1;
    aliceSocket2 = context.aliceSocket2;
    bobSocket = context.bobSocket;
  });

  afterEach(() => {
    aliceSocket1.off();
    aliceSocket1.disconnect().connect();

    bobSocket.off();
    bobSocket.disconnect().connect();
  });

  after(() => {
    context.cleanup();
  });

  it("should work", async () => {
    await aliceSocket1.emitWithAck("user:get", {
      userId: context.bobUserId,
    });

    bobSocket.disconnect();

    const userId = await waitFor(aliceSocket1, "user:disconnected");

    expect(userId).to.eql(context.bobUserId);

    bobSocket.connect();

    const userId2 = await waitFor(aliceSocket1, "user:connected");

    expect(userId2).to.eql(context.bobUserId);
  });

  it("should be ignored if the requester has not subscribed to the user state", async () => {
    return new Promise((resolve, reject) => {
      aliceSocket1.on("user:disconnected", () =>
        reject(new Error("should not happen")),
      );
      aliceSocket1.on("user:connected", () =>
        reject(new Error("should not happen")),
      );

      bobSocket.disconnect().connect();

      setTimeout(resolve, 100);
    });
  });

  it("should be ignored if user has multiple connections", async () => {
    await bobSocket.emitWithAck("user:get", {
      userId: context.aliceUserId,
    });

    return new Promise((resolve, reject) => {
      bobSocket.on("user:disconnected", () =>
        reject(new Error("should not happen")),
      );
      bobSocket.on("user:connected", () =>
        reject(new Error("should not happen")),
      );

      aliceSocket1.disconnect().connect();

      setTimeout(resolve, 100);
    });
  });
});
