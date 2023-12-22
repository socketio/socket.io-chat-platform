import { ajv } from "../util.js";

const validate = ajv.compile({
  type: "object",
  properties: {
    channelId: { type: "string", format: "uuid" },
    after: { type: "string" },
    size: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    orderBy: { type: "string", enum: ["id:asc", "id:desc"], default: "id:asc" },
  },
  required: [],
  additionalProperties: false,
});

export function listMessages({ socket, db }) {
  return async (query, callback) => {
    if (typeof callback !== "function") {
      return;
    }

    if (!validate(query)) {
      return callback({
        status: "ERROR",
        errors: validate.errors,
      });
    }

    if (!(await db.isUserInChannel(socket.userId, query.channelId))) {
      return callback({
        status: "ERROR",
      });
    }

    const { data, hasMore } = await db.listMessages(query);

    callback({
      status: "OK",
      data,
      hasMore,
    });
  };
}
