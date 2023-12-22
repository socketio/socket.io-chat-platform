import { ajv } from "../util.js";

const validate = ajv.compile({
  type: "object",
  properties: {
    q: { type: "string", default: "" },
    size: { type: "integer", minimum: 1, maximum: 100, default: 10 },
  },
  required: [],
  additionalProperties: false,
});

export function searchChannels({ io, socket, db }) {
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

    const channels = await db.searchChannels(socket.userId, query);

    callback({
      status: "OK",
      data: channels,
    });
  };
}
