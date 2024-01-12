<script setup>
import { computed, ref } from "vue";
import { useMainStore } from "@/stores/main";
import Username from "@/components/Username.vue";
import { socket } from "@/BackendService";
import VBtn from "@/components/common/VBtn.vue";
import PublicChannelLabel from "@/components/ChannelView/PublicChannelLabel.vue";
import PrivateChannelLabel from "@/components/ChannelView/PrivateChannelLabel.vue";

const store = useMainStore();
const isLoading = ref(false);
const isTyping = ref(false);

function submit() {
  const content = store.selectedChannel.messageInput;

  if (!content) {
    return;
  }

  store.sendMessage(content);

  store.selectedChannel.messageInput = "";

  onInput();
}

function onInput() {
  if (isTyping.value && store.selectedChannel.messageInput.length === 0) {
    isTyping.value = false;
    socket.emit("message:typing", {
      channelId: store.selectedChannelId,
      isTyping: false,
    });
  } else if (!isTyping.value && store.selectedChannel.messageInput.length > 0) {
    isTyping.value = true;
    socket.emit("message:typing", {
      channelId: store.selectedChannelId,
      isTyping: true,
    });
  }
}

async function loadMore() {
  isLoading.value = true;

  await store.loadMessagesForSelectedChannel("backward", true);

  setTimeout(() => {
    isLoading.value = false;
  }, 200);
}

function shouldPrintHeader(message, index) {
  return index === 0 || store.messages[index - 1].from !== message.from;
}

const someoneIsTyping = computed(() => {
  if (store.selectedChannel?.typingUsers.size) {
    const usernames = [];

    store.selectedChannel?.typingUsers.forEach(({ username }) => {
      usernames.push(username);
    });

    return usernames.join(", ") + " is typing";
  }
});
</script>

<template>
  <div
    v-if="store.isInitialized && store.selectedChannel"
    class="d-flex flex-column w-100 p-3"
  >
    <div class="mb-3">
      <PublicChannelLabel
        v-if="store.selectedChannel.type === 'public'"
        :channel="store.selectedChannel"
      ></PublicChannelLabel>

      <PrivateChannelLabel
        v-else
        :channel="store.selectedChannel"
      ></PrivateChannelLabel>
    </div>

    <div class="mb-auto overflow-auto">
      <div class="text-center" v-if="store.selectedChannel.hasMore">
        <v-btn
          color="primary"
          outlined
          :loading="isLoading"
          @click="loadMore"
          icon="arrow-up"
        >
          Load more
        </v-btn>
      </div>

      <p v-if="!store.messages.length">No message yet</p>

      <ol class="list-unstyled">
        <template v-for="(message, i) in store.messages" :key="message.id">
          <li class="mt-3" v-if="shouldPrintHeader(message, i)">
            <Username :id="message.from" class="fw-bold" />
          </li>
          <li>
            {{ message.content }}
          </li>
        </template>
      </ol>
    </div>

    <div>
      <span v-if="someoneIsTyping" class="blinking">{{ someoneIsTyping }}</span>

      <form @submit.prevent="submit" class="d-flex mt-1">
        <div class="w-100">
          <textarea
            class="form-control"
            v-model="store.selectedChannel.messageInput"
            @keydown.exact.enter.prevent="submit"
            @input="onInput"
            rows="5"
          ></textarea>

          <v-btn
            color="primary"
            outlined
            class="submit-btn"
            type="submit"
            icon="send"
            :disabled="store.selectedChannel.messageInput === ''"
          >
          </v-btn>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
textarea {
  resize: none;
}

.submit-btn {
  position: absolute;
  right: 20px;
  bottom: 20px;
  padding: 4px 8px;
}

.blinking {
  animation: blink-frames 2s infinite;
}

@keyframes blink-frames {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.2;
  }
  100% {
    opacity: 1;
  }
}
</style>
