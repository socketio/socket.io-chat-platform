import pg from "pg";
import { migrate } from "postgres-migrations";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/postgres-adapter";
import bodyParser from "body-parser";
import { DB } from "./db.js";
import { createChannel } from "./channel/create.js";
import { joinChannel } from "./channel/join.js";
import { listChannels } from "./channel/list.js";
import { searchChannels } from "./channel/search.js";
import { ackMessage } from "./message/ack.js";
import { listMessages } from "./message/list.js";
import { sendMessage } from "./message/send.js";
import { typingMessage } from "./message/typing.js";
import { getUser } from "./user/get.js";
import { initAuth } from "./auth/index.js";
import { reachUser } from "./user/reach.js";
import { searchUsers } from "./user/search.js";
import {
  channelRoom,
  userRoom,
  userStateRoom,
  logger,
  sessionRoom,
} from "./util.js";

const CLEANUP_ZOMBIE_USERS_INTERVAL_IN_MS = 60_000;

export async function createApp(httpServer, config) {
  const pgPool = new pg.Pool(config.postgres);

  logger.info("applying migration scripts...");
  const migrations = await migrate({ client: pgPool }, "sql");
  logger.info("%d migration scripts were applied", migrations.length);

  const app = createExpressApp();
  httpServer.on("request", app);

  if (config.cors) {
    app.use(cors(config.cors));
  }

  const io = new Server(httpServer, {
    cors: config.cors,
    adapter: createAdapter(pgPool),
  });

  const db = new DB(pgPool);

  initAuth({ app, io, db, config });
  initEventHandlers({ io, db, config });

  const timerId = scheduleZombieUsersCleanup({ io, db });

  return {
    logger,
    pgPool,
    async close() {
      io.close();
      await io.of("/").adapter.close();
      await pgPool.end();
      clearInterval(timerId);
    },
  };
}

function createExpressApp() {
  const app = express();

  app.set("etag", false);
  app.set("x-powered-by", false);

  app.use(bodyParser.json());

  return app;
}

function initEventHandlers({ io, db, config }) {
  io.use(async (socket, next) => {
    socket.userId = socket.request.user.id;

    let channels;

    try {
      channels = await db.fetchUserChannels(socket.userId);
    } catch (e) {
      return next(new Error("something went wrong"));
    }

    channels.forEach((channelId) => {
      socket.join(channelRoom(channelId));
    });

    socket.join(userRoom(socket.userId));
    socket.join(sessionRoom(socket.request.session.id));

    next();
  });

  io.on("connection", async (socket) => {
    socket.on("channel:create", createChannel({ io, socket, db }));
    socket.on("channel:join", joinChannel({ io, socket, db }));
    socket.on("channel:list", listChannels({ io, socket, db }));
    socket.on("channel:search", searchChannels({ io, socket, db }));

    socket.on("user:get", getUser({ io, socket, db }));
    socket.on("user:reach", reachUser({ io, socket, db }));
    socket.on("user:search", searchUsers({ io, socket, db }));

    socket.on("message:send", sendMessage({ io, socket, db }));
    socket.on("message:list", listMessages({ io, socket, db }));
    socket.on("message:ack", ackMessage({ io, socket, db }));
    socket.on("message:typing", typingMessage({ io, socket, db }));

    socket.on("disconnect", async () => {
      // the other users are not notified of the disconnection right away
      setTimeout(async () => {
        const sockets = await io.in(userRoom(socket.userId)).fetchSockets();
        const hasReconnected = sockets.length > 0;

        if (!hasReconnected) {
          await db.setUserIsDisconnected(socket.userId);

          io.to(userStateRoom(socket.userId)).emit(
            "user:disconnected",
            socket.userId,
          );
        }
      }, config.disconnectionGraceDelay ?? 10_000);

      const channels = await db.fetchUserChannels(socket.userId);

      channels.forEach((channelId) => {
        io.to(channelRoom(channelId)).emit("message:typing", {
          channelId,
          userId: socket.userId,
          isTyping: false,
        });
      });
    });

    const wasOnline = await db.setUserIsConnected(socket.userId);

    if (!wasOnline) {
      socket
        .to(userStateRoom(socket.userId))
        .emit("user:connected", socket.userId);
    }
  });
}

function scheduleZombieUsersCleanup({ io, db }) {
  // if the logic of the "disconnect" event was not executed (for example, if the server was abruptly stopped), then
  // in some rare cases a user might be considered as online without being actually connected
  async function cleanupZombieUsers() {
    const userIds = await db.cleanupZombieUsers();

    if (userIds.length) {
      userIds.forEach((userId) => {
        io.to(userStateRoom(userId)).emit("user:disconnected", userId);
      });
    }
  }

  cleanupZombieUsers();
  return setInterval(cleanupZombieUsers, CLEANUP_ZOMBIE_USERS_INTERVAL_IN_MS);
}

export { logger };
