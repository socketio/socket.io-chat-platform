import { expect } from "chai";
import { login, setup, waitFor } from "./util.js";
import { io } from "socket.io-client";

describe("auth", () => {
  let context;

  before(async () => {
    context = await setup();
  });

  after(() => {
    context.cleanup();
  });

  describe("signup", () => {
    it("should work", async () => {
      await context.resetDatabase();

      const res = await fetch(`http://localhost:${context.port}/signup`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "carol",
          password: "changeit",
        }),
      });

      expect(res.status).to.eql(200);

      const cookieHeader = res.headers.get("set-cookie");
      const sid = cookieHeader.substring(
        "sid=".length,
        cookieHeader.indexOf(";"),
      );

      expect(sid).to.be.a("string");
    });

    it("should fail with an invalid username", async () => {
      await context.resetDatabase();

      const res = await fetch(`http://localhost:${context.port}/signup`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "c",
          password: "changeit",
        }),
      });

      expect(res.status).to.eql(400);
    });

    it("should fail with an invalid password", async () => {
      await context.resetDatabase();

      const res = await fetch(`http://localhost:${context.port}/signup`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "carol",
          password: "c",
        }),
      });

      expect(res.status).to.eql(400);
    });

    it("should fail with an already taken username", async () => {
      await context.resetDatabase();

      const res = await fetch(`http://localhost:${context.port}/signup`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "alice",
          password: "changeit",
        }),
      });

      expect(res.status).to.eql(400);
    });
  });

  describe("login", () => {
    it("should work", async () => {
      const res = await fetch(`http://localhost:${context.port}/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "alice",
          password: "adm!n",
        }),
      });

      expect(res.status).to.eql(200);

      const cookieHeader = res.headers.get("set-cookie");
      const sid = cookieHeader.substring(
        "sid=".length,
        cookieHeader.indexOf(";"),
      );

      expect(sid).to.be.a("string");

      const socket = io(`http://localhost:${context.port}`, {
        extraHeaders: {
          cookie: `sid=${sid}`,
        },
      });

      await waitFor(socket, "connect");

      socket.disconnect();
    });

    it("should fail with an invalid username", async () => {
      const res = await fetch(`http://localhost:${context.port}/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "kevin",
          password: "adm!n",
        }),
      });

      expect(res.status).to.eql(400);
      expect(await res.json()).to.eql({ message: "invalid credentials" });
    });

    it("should fail with an invalid password", async () => {
      const res = await fetch(`http://localhost:${context.port}/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "alice",
          password: "alice",
        }),
      });

      expect(res.status).to.eql(400);
      expect(await res.json()).to.eql({ message: "invalid credentials" });
    });

    it("should fail with an invalid session id", async () => {
      const socket = io(`http://localhost:${context.port}`, {
        extraHeaders: {
          cookie: `sid=1234`,
        },
      });

      await waitFor(socket, "connect_error");

      socket.disconnect();
    });
  });

  describe("logout", () => {
    it("should work", async () => {
      const sid = await login(context.port, {
        username: "alice",
        password: "adm!n",
      });

      const socket = io(`http://localhost:${context.port}`, {
        extraHeaders: {
          cookie: `sid=${sid}`,
        },
      });

      await waitFor(socket, "connect");

      const [res] = await Promise.all([
        fetch(`http://localhost:${context.port}/logout`, {
          method: "POST",
          headers: {
            cookie: `sid=${sid}`,
          },
        }),
        waitFor(socket, "disconnect"),
      ]);

      expect(res.status).to.eql(204);
    });
  });

  describe("self", () => {
    it("should work", async () => {
      const sid = await login(context.port, {
        username: "alice",
        password: "adm!n",
      });

      const res = await fetch(`http://localhost:${context.port}/self`, {
        headers: {
          cookie: `sid=${sid}`,
        },
      });

      expect(res.status).to.eql(200);
      expect(await res.json()).to.eql({
        id: context.aliceUserId,
        username: "alice",
      });
    });

    it("should fail when anonymous", async () => {
      const res = await fetch(`http://localhost:${context.port}/self`);

      expect(res.status).to.eql(401);
    });
  });
});
