import { ajv, channelRoom } from "../util.js";

const validate = ajv.compile({
  type: "object",
  properties: {
    channelId: { type: "string", format: "uuid" },
    isTyping: { type: "boolean" },
  },
  required: ["channelId", "isTyping"],
  additionalProperties: false,
});

export function typingMessage({ socket, db }) {
  return async (payload) => {
    if (!validate(payload)) {
      return;
    }

    const isInChannel = await db.isUserInChannel(
      socket.userId,
      payload.channelId,
    );

    if (!isInChannel) {
      return;
    }

    socket.to(channelRoom(payload.channelId)).emit("message:typing", {
      userId: socket.userId,
      channelId: payload.channelId,
      isTyping: payload.isTyping,
    });
  };
}
