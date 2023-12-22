import { acceptHMRUpdate, defineStore } from "pinia";
import { socket } from "@/BackendService";

function insertAtRightOffset(messages, message) {
  // note: this won't work with id bigger than Number.MAX_SAFE_INTEGER
  message.mid = message.id ? parseInt(message.id, 10) : Infinity;

  for (let i = 0; i < messages.length; i++) {
    if (messages[i].id === message.id) {
      return false;
    }
    if (messages[i].mid > message.mid) {
      messages.splice(i, 0, message);
      return true;
    }
  }

  messages.push(message);
  return true;
}

export const useMainStore = defineStore("main", {
  state: () => ({
    isInitialized: false,
    currentUser: {},
    channels: new Map(),
    users: new Map(),
    pendingUsers: new Map(),
    selectedChannelId: undefined,
    showJoinOrCreateChannelModel: false,
    showSearchUserModal: false,
  }),

  actions: {
    bindEvents() {
      if (process.env.NODE_ENV !== "production") {
        socket.onAny((...args) => {
          console.log("incoming", args);
        });

        socket.onAnyOutgoing((...args) => {
          console.log("outgoing", args);
        });
      }

      socket.on("connect", async () => {
        if (this.isInitialized) {
          const res = await socket.emitWithAck("channel:list", {
            size: 100,
          });

          if (res.status === "OK") {
            res.data.forEach((channel) => this.addChannel(channel));
          }

          await this.loadMessagesForSelectedChannel("forward");
        }
      });

      socket.on("channel:created", (channel) => this.addChannel(channel));
      socket.on("channel:joined", (channel) => this.addChannel(channel));

      socket.on("message:sent", (message) => {
        this.addMessage(message, true);
      });

      socket.on("user:connected", (userId) => {
        if (this.users.has(userId)) {
          this.users.get(userId).isOnline = true;
        }
      });

      socket.on("user:disconnected", (userId) => {
        if (this.users.has(userId)) {
          this.users.get(userId).isOnline = false;
        }
      });

      socket.on("message:typing", async ({ channelId, userId, isTyping }) => {
        const channel = this.channels.get(channelId);

        if (!channel) {
          return;
        }

        if (isTyping) {
          const user = await this.getUser(userId);

          if (!user) {
            return;
          }

          channel.typingUsers.set(userId, user);
        } else {
          channel.typingUsers.delete(userId);
        }
      });
    },

    async init() {
      socket.connect();

      const res = await socket.emitWithAck("channel:list", {
        size: 100,
      });

      res.data.forEach((channel) => this.addChannel(channel));

      await this.loadMessagesForSelectedChannel();

      this.isInitialized = true;

      return this.publicChannels[0].id;
    },

    clear() {
      this.isInitialized = false;
      this.currentUser = {};
      this.channels.clear();
      this.users.clear();
      this.selectedChannelId = undefined;
    },

    setCurrentUser(user) {
      this.currentUser = user;
    },

    addChannel(channel) {
      if (this.channels.has(channel.id)) {
        const existingChannel = this.channels.get(channel.id);

        Object.keys(channel).forEach((key) => {
          existingChannel[key] = channel[key];
        });

        existingChannel.isLoaded = false;
        existingChannel.typingUsers.clear();
      } else {
        channel.messageInput = "";
        channel.messages = [];
        channel.hasMore = false;
        channel.isLoaded = false;
        channel.typingUsers = new Map();

        this.channels.set(channel.id, channel);
      }
    },

    async selectChannel(channelId) {
      this.selectedChannelId = channelId;

      await this.loadMessagesForSelectedChannel();
      await this.ackLastMessageIfNecessary();
    },

    async loadMessagesForSelectedChannel(order = "backward", force = false) {
      const channel = this.selectedChannel;

      if (!channel || (channel.isLoaded && !force)) {
        return;
      }

      const query = {
        size: 20,
        channelId: this.selectedChannelId,
      };

      if (order === "backward") {
        query.orderBy = "id:desc";
        if (channel.messages.length) {
          query.after = channel.messages[0].id;
        }
      } else {
        query.orderBy = "id:asc";
        if (channel.messages.length) {
          query.after = channel.messages[channel.messages.length - 1].id;
        }
      }

      const res = await socket.emitWithAck("message:list", query);

      if (res.status !== "OK") {
        return;
      }

      res.data.forEach((message) => this.addMessage(message));

      if (order === "forward" && res.hasMore) {
        return this.loadMessagesForSelectedChannel("forward");
      }

      channel.isLoaded = true;
      channel.hasMore = res.hasMore;

      await this.ackLastMessageIfNecessary();
    },

    addMessage(message, countAsUnread = false) {
      const channel = this.channels.get(message.channelId);

      if (!channel) {
        return;
      }

      const inserted = insertAtRightOffset(channel.messages, message);

      if (inserted && countAsUnread && message.from !== this.currentUser.id) {
        channel.unreadCount++;
        this.ackLastMessageIfNecessary();
      }
    },

    async ackLastMessageIfNecessary() {
      if (this.selectedChannel?.unreadCount > 0) {
        await socket.emitWithAck("message:ack", {
          channelId: this.selectedChannel.id,
          messageId: this.selectedChannel.messages.at(-1).id,
        });

        this.selectedChannel.unreadCount = 0;
      }
    },

    async sendMessage(content) {
      const message = {
        id: undefined,
        from: this.currentUser.id,
        channelId: this.selectedChannelId,
        content,
      };

      this.addMessage(message);

      const payload = {
        channelId: this.selectedChannelId,
        content,
      };

      const res = await socket.emitWithAck("message:send", payload);

      if (res.status === "OK") {
        message.id = res.data.id;
        message.mid = parseInt(message.id, 10);
      }
    },

    async getUser(userId) {
      if (this.currentUser?.id === userId) {
        return this.currentUser;
      }

      if (this.users.has(userId)) {
        return this.users.get(userId);
      }

      // only load a given user once
      if (this.pendingUsers.has(userId)) {
        return this.pendingUsers.get(userId);
      }

      const promise = socket
        .emitWithAck("user:get", { userId })
        .then((res) => {
          if (res.status === "OK") {
            const user = res.data;

            this.users.set(userId, res.data);
            return user;
          }
        })
        .finally(() => {
          this.pendingUsers.delete(userId);
        });

      this.pendingUsers.set(userId, promise);

      return promise;
    },
  },

  getters: {
    publicChannels() {
      const publicChannels = [];

      this.channels.forEach((channel) => {
        if (channel.type === "public") {
          publicChannels.push(channel);
        }
      });

      publicChannels.sort((a, b) => {
        // always put the 'General' channel first
        if (a.name === "General") {
          return -1;
        } else if (b.name === "General") {
          return 1;
        }
        return b.name < a.name ? 1 : -1;
      });

      return publicChannels;
    },

    privateChannels() {
      const privateChannels = [];

      this.channels.forEach((channel) => {
        if (channel.type === "private") {
          privateChannels.push(channel);
        }
      });

      return privateChannels;
    },

    selectedChannel() {
      return this.channels.get(this.selectedChannelId);
    },

    isChannelSelected() {
      return (channelId) => {
        return this.selectedChannelId === channelId;
      };
    },

    messages() {
      return this.selectedChannel?.messages || [];
    },
  },
});

// reference: https://pinia.vuejs.org/cookbook/hot-module-replacement.html
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMainStore, import.meta.hot));
}
