import { expect } from "chai";
import { queryAndReturnId, setup, waitFor } from "./../util.js";

describe("message:send", () => {
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

  it("should send a message in a channel", async () => {
    const [result, aliceMessage, bobMessage] = await Promise.all([
      aliceSocket1.emitWithAck("message:send", {
        channelId: context.generalChannelId,
        content: "hello",
      }),
      waitFor(aliceSocket2, "message:sent"),
      waitFor(bobSocket, "message:sent"),
    ]);

    expect(result.status).to.eql("OK");
    expect(result.data.id).to.be.a("string");

    expect(aliceMessage.id).to.eql(result.data.id);
    expect(aliceMessage.from).to.eql(context.aliceUserId);
    expect(aliceMessage.channelId).to.eql(context.generalChannelId);
    expect(aliceMessage.content).to.eql("hello");

    expect(bobMessage.id).to.eql(result.data.id);
    expect(bobMessage.from).to.eql(context.aliceUserId);
    expect(bobMessage.channelId).to.eql(context.generalChannelId);
    expect(bobMessage.content).to.eql("hello");
  });

  it("should join a channel and send a message in it", async () => {
    await context.resetDatabase();
    const channelId = await queryAndReturnId(
      context.pgPool,
      "INSERT INTO channels(name, type) VALUES ($1, $2) RETURNING id",
      ["foo", "private"],
    );

    await aliceSocket1.emitWithAck("channel:join", {
      channelId,
    });

    const [result, message] = await Promise.all([
      aliceSocket1.emitWithAck("message:send", {
        channelId,
        content: "hello",
      }),
      waitFor(aliceSocket2, "message:sent"),
    ]);

    expect(result.status).to.eql("OK");
    expect(result.data.id).to.be.a("string");

    expect(message.id).to.eql(result.data.id);
    expect(message.from).to.eql(context.aliceUserId);
    expect(message.channelId).to.eql(channelId);
    expect(message.content).to.eql("hello");
  });

  it("should create a channel and send a message in it", async () => {
    await context.resetDatabase();

    const response = await aliceSocket1.emitWithAck("channel:create", {
      name: "foo",
    });

    const [response2, message] = await Promise.all([
      aliceSocket1.emitWithAck("message:send", {
        channelId: response.data.id,
        content: "hello",
      }),
      waitFor(aliceSocket2, "message:sent"),
    ]);

    expect(response2.status).to.eql("OK");
    expect(response2.data.id).to.be.a("string");

    expect(message.id).to.eql(response2.data.id);
    expect(message.from).to.eql(context.aliceUserId);
    expect(message.channelId).to.eql(response.data.id);
    expect(message.content).to.eql("hello");
  });

  it("should send a message to a user", async () => {
    const [result, aliceMessage, bobMessage] = await Promise.all([
      aliceSocket1.emitWithAck("message:send", {
        channelId: context.privateChannelId,
        content: "hello",
      }),
      waitFor(aliceSocket2, "message:sent"),
      waitFor(bobSocket, "message:sent"),
    ]);

    expect(result.status).to.eql("OK");
    expect(result.data.id).to.be.a("string");

    expect(aliceMessage.id).to.eql(result.data.id);
    expect(aliceMessage.from).to.eql(context.aliceUserId);
    expect(aliceMessage.content).to.eql("hello");

    expect(bobMessage.id).to.eql(result.data.id);
    expect(bobMessage.from).to.eql(context.aliceUserId);
    expect(bobMessage.content).to.eql("hello");
  });
});
