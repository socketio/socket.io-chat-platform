import { format, transports } from "winston";
import { createServer } from "node:http";
import { createApp, logger } from "./src/index.js";

logger.add(
  new transports.Console({
    format: format.combine(format.colorize(), format.splat(), format.simple()),
  }),
);

const httpServer = createServer();

await createApp(httpServer, {
  postgres: {
    user: "postgres",
    password: "changeit",
  },
  sessionSecrets: ["changeit"],
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

httpServer.listen(3000, () => {
  logger.info("server listening at http://localhost:3000");
});
