import { io } from "socket.io-client";

const BASE_URL =
  process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3000";

class BackendService {
  self() {
    return fetch(BASE_URL + "/self", {
      credentials: "include",
    });
  }

  signUp(payload) {
    return fetch(BASE_URL + "/signup", {
      credentials: "include",
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  logIn(payload) {
    return fetch(BASE_URL + "/login", {
      credentials: "include",
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  logOut() {
    return fetch(BASE_URL + "/logout", {
      credentials: "include",
      method: "POST",
    });
  }
}

export default new BackendService();

const BASE_URL2 =
  process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000";

export const socket = io(BASE_URL2, {
  autoConnect: false,
  withCredentials: true,
  path:
    process.env.NODE_ENV === "production" ? "/api/socket.io/" : "/socket.io/",
});
