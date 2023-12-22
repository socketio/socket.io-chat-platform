import { ajv } from "../util.js";

const validate = ajv.compile({
  type: "object",
  properties: {
    size: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    orderBy: { type: "string", enum: ["name:asc"], default: "name:asc" },
  },
  additionalProperties: false,
});

export function listChannels({ socket, db }) {
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

    const { data, hasMore } = await db.listChannels(socket.userId, query);

    callback({
      status: "OK",
      data,
      hasMore,
    });
  };
}
