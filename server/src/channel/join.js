import { ajv, logger, userRoom } from "../util.js";

const validate = ajv.compile({
  type: "object",
  properties: {
    channelId: { type: "string", format: "uuid" },
  },
  required: ["channelId"],
  additionalProperties: false,
});

export function joinChannel({ io, socket, db }) {
  return async (payload, callback) => {
    if (typeof callback !== "function") {
      return;
    }

    if (!validate(payload)) {
      return callback({
        status: "ERROR",
        errors: validate.errors,
      });
    }

    let channel;

    try {
      channel = await db.joinChannel(socket.userId, payload.channelId);
    } catch (e) {
      return callback({
        status: "ERROR",
      });
    }

    logger.info("user [%s] has joined channel [%s]", socket.userId, channel.id);

    // broadcast to the other tabs of the same user
    socket.to(userRoom(socket.userId)).emit("channel:joined", channel);

    io.in(userRoom(socket.userId)).socketsJoin(`channel:${channel.id}`);

    callback({
      status: "OK",
      data: channel,
    });
  };
}
