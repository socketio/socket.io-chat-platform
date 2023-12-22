import { expect } from "chai";
import { setup } from "./../util.js";
import sql from "sql-bricks-postgres";

const { insert } = sql;

describe("message:list", () => {
  let context, aliceSocket1, aliceSocket2, bobSocket, messageIds;

  before(async () => {
    context = await setup();

    aliceSocket1 = context.aliceSocket1;
    aliceSocket2 = context.aliceSocket2;
    bobSocket = context.bobSocket;

    await context.resetDatabase();

    const { text, values } = insert("messages", [
      {
        from_user: context.aliceUserId,
        channel_id: context.generalChannelId,
        content: "1",
      },
      {
        from_user: context.bobUserId,
        channel_id: context.generalChannelId,
        content: "2",
      },
      {
        from_user: context.aliceUserId,
        channel_id: context.generalChannelId,
        content: "3",
      },
      {
        from_user: context.bobUserId,
        channel_id: context.privateChannelId,
        content: "4",
      },
      {
        from_user: context.aliceUserId,
        channel_id: context.privateChannelId,
        content: "5",
      },
      {
        from_user: context.bobUserId,
        channel_id: context.privateChannelId,
        content: "6",
      },
    ])
      .returning("id")
      .toParams();

    const queryResult = await context.pgPool.query(text, values);

    messageIds = queryResult.rows.map((row) => row.id);
  });

  after(() => {
    context.cleanup();
  });

  it("should list all messages in a public channel", async () => {
    const result = await aliceSocket1.emitWithAck("message:list", {
      channelId: context.generalChannelId,
    });

    expect(result.status).to.eql("OK");

    expect(result.data.length).to.eql(3);

    expect(result.data[0].from).to.eql(context.aliceUserId);
    expect(result.data[0].channelId).to.eql(context.generalChannelId);
    expect(result.data[0].content).to.eql("1");

    expect(result.data[1].content).to.eql("2");
    expect(result.data[2].content).to.eql("3");

    expect(result.hasMore).to.eql(false);
  });

  it("should list all messages in a public channel (size)", async () => {
    const result = await aliceSocket1.emitWithAck("message:list", {
      channelId: context.generalChannelId,
      size: 2,
    });

    expect(result.data.length).to.eql(2);
    expect(result.data[0].content).to.eql("1");
    expect(result.data[1].content).to.eql("2");
    expect(result.hasMore).to.eql(true);
  });

  it("should list all messages in a public channel (after)", async () => {
    const result = await aliceSocket1.emitWithAck("message:list", {
      channelId: context.generalChannelId,
      after: messageIds[0],
    });

    expect(result.data.length).to.eql(2);
    expect(result.data[0].content).to.eql("2");
    expect(result.data[1].content).to.eql("3");
    expect(result.hasMore).to.eql(false);
  });

  it("should list all messages in a public channel (orderBy)", async () => {
    const result = await aliceSocket1.emitWithAck("message:list", {
      channelId: context.generalChannelId,
      orderBy: "id:desc",
    });

    expect(result.data.length).to.eql(3);
    expect(result.data[0].content).to.eql("3");
    expect(result.data[1].content).to.eql("2");
    expect(result.data[2].content).to.eql("1");
    expect(result.hasMore).to.eql(false);
  });

  it("should list all messages in a public channel (after & orderBy)", async () => {
    const result = await aliceSocket1.emitWithAck("message:list", {
      channelId: context.generalChannelId,
      after: messageIds[2],
      orderBy: "id:desc",
    });

    expect(result.data.length).to.eql(2);
    expect(result.data[0].content).to.eql("2");
    expect(result.data[1].content).to.eql("1");
    expect(result.hasMore).to.eql(false);
  });

  it("should list all messages in a private channel", async () => {
    const result = await aliceSocket1.emitWithAck("message:list", {
      channelId: context.privateChannelId,
    });

    expect(result.status).to.eql("OK");

    expect(result.data.length).to.eql(3);

    expect(result.data[0].from).to.eql(context.bobUserId);
    expect(result.data[0].content).to.eql("4");

    expect(result.data[1].content).to.eql("5");
    expect(result.data[2].content).to.eql("6");

    expect(result.hasMore).to.eql(false);

    const reverseResult = await bobSocket.emitWithAck("message:list", {
      channelId: context.privateChannelId,
    });

    expect(reverseResult.data.length).to.eql(3);
  });
});
