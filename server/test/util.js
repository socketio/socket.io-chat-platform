import { createApp, logger } from "../src/index.js";
import argon2 from "argon2";
import { io as ioc } from "socket.io-client";
import { createServer } from "node:http";
import { format, transports } from "winston";

logger.add(
  new transports.Console({
    format: format.combine(format.colorize(), format.splat(), format.simple()),
  }),
);

logger.level = process.env.CI === undefined ? "debug" : "error";

function listen(httpServer, ...args) {
  return new Promise((resolve) => {
    httpServer.listen(...args, () => {
      resolve(httpServer.address().port);
    });
  });
}

export function waitFor(socket, event) {
  return new Promise((resolve) => {
    socket.on(event, resolve);
  });
}

export async function queryAndReturnId(pgPool, query, args) {
  const queryResult = await pgPool.query(query, args);
  return queryResult.rows[0].id;
}

export async function login(port, payload) {
  const res = await fetch(`http://localhost:${port}/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const cookieHeader = res.headers.get("set-cookie");
  return cookieHeader.substring("sid=".length, cookieHeader.indexOf(";"));
}

export async function setup() {
  const httpServer = createServer();

  const { pgPool, close } = await createApp(httpServer, {
    postgres: {
      user: "postgres",
      password: "changeit",
    },
    sessionSecrets: ["changeit"],
    disconnectionGraceDelay: 0,
  });

  const hashedPassword = await argon2.hash("adm!n");

  await pgPool.query(`
    DELETE FROM user_channels;
    DELETE FROM messages;
    DELETE FROM users;
    DELETE FROM channels WHERE name <> 'General';
  `);

  const aliceUserId = await queryAndReturnId(
    pgPool,
    "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
    ["alice", hashedPassword],
  );

  const bobUserId = await queryAndReturnId(
    pgPool,
    "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
    ["bob", hashedPassword],
  );

  const generalChannelId = await queryAndReturnId(
    pgPool,
    "SELECT id FROM channels WHERE name = 'General'",
  );

  const privateChannelId = await queryAndReturnId(
    pgPool,
    "INSERT INTO channels (type) VALUES ('private') RETURNING id",
  );

  await pgPool.query(
    "INSERT INTO user_channels (user_id, channel_id) VALUES ($1, $3), ($2, $3), ($1, $4), ($2, $4)",
    [aliceUserId, bobUserId, generalChannelId, privateChannelId],
  );

  const port = await listen(httpServer);

  const sid = await login(port, {
    username: "alice",
    password: "adm!n",
  });

  const aliceSocket1 = ioc(`http://localhost:${port}`, {
    extraHeaders: {
      cookie: `sid=${sid}`,
    },
  });

  aliceSocket1.onAny((...args) => {
    logger.debug("aliceSocket1 in: %j", args);
  });

  aliceSocket1.onAnyOutgoing((...args) => {
    logger.debug("aliceSocket1 out: %j", args);
  });

  await waitFor(aliceSocket1, "connect");

  const aliceSocket2 = ioc(`http://localhost:${port}`, {
    extraHeaders: {
      cookie: `sid=${sid}`,
    },
  });

  aliceSocket2.onAny((...args) => {
    logger.debug("aliceSocket2 in: %j", args);
  });

  aliceSocket2.onAnyOutgoing((...args) => {
    logger.debug("aliceSocket2 out: %j", args);
  });

  await waitFor(aliceSocket2, "connect");

  const bobSid = await login(port, {
    username: "bob",
    password: "adm!n",
  });

  const bobSocket = ioc(`http://localhost:${port}`, {
    extraHeaders: {
      cookie: `sid=${bobSid}`,
    },
  });

  bobSocket.onAny((...args) => {
    logger.debug("bobSocket in: %j", args);
  });

  bobSocket.onAnyOutgoing((...args) => {
    logger.debug("bobSocket out: %j", args);
  });

  await waitFor(bobSocket, "connect");

  return {
    port,
    pgPool,
    aliceSocket1,
    aliceSocket2,
    aliceUserId,
    bobSocket,
    bobUserId,
    generalChannelId,
    privateChannelId,
    async resetDatabase() {
      await pgPool.query(
        "DELETE FROM user_channels WHERE channel_id <> ALL ($1) OR user_id <> ALL ($2)",
        [
          [generalChannelId, privateChannelId],
          [aliceUserId, bobUserId],
        ],
      );
      await pgPool.query("UPDATE user_channels SET client_offset = NULL");
      await pgPool.query("DELETE FROM messages");
      await pgPool.query("DELETE FROM channels WHERE id <> ALL ($1)", [
        [generalChannelId, privateChannelId],
      ]);
      await pgPool.query("DELETE FROM users WHERE id <> ALL ($1)", [
        [aliceUserId, bobUserId],
      ]);
    },
    cleanup() {
      aliceSocket1.disconnect();
      aliceSocket2.disconnect();
      bobSocket.disconnect();
      close();
    },
  };
}
