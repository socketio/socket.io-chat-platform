<script setup>
import { computed, nextTick, ref } from "vue";
import { useMainStore } from "@/stores/main";
import { debounce } from "@/util";
import { socket } from "@/BackendService";
import VBtn from "@/components/common/VBtn.vue";
import VModal from "@/components/common/VModal.vue";

const store = useMainStore();

const channelName = ref("");
const isLoading = ref(false);
const channels = ref([]);
const input = ref(null);

const isValid = computed(() => {
  return channelName.value.length > 2;
});

async function onSubmit() {
  isLoading.value = true;

  const value = channelName.value;

  const res = await socket.emitWithAck("channel:create", {
    name: value,
  });

  if (res.status === "OK") {
    onSuccess(res.data);
  } else {
    isLoading.value = false;
  }
}

const onInput = debounce(searchChannels, 300);

async function searchChannels() {
  if (isLoading.value) {
    // no way to cancel the current search
    return;
  }

  isLoading.value = true;
  channels.value = [];

  const res = await socket.emitWithAck("channel:search", {
    q: channelName.value,
  });

  if (res.status === "OK") {
    channels.value = res.data;
  }

  isLoading.value = false;
}

async function joinChannel(channel) {
  isLoading.value = true;

  const res = await socket.emitWithAck("channel:join", {
    channelId: channel.id,
  });

  if (res.status === "OK") {
    onSuccess(res.data);
  }

  isLoading.value = false;
}

function onSuccess(channel) {
  store.addChannel(channel);
  store.selectChannel(channel.id);
  store.showJoinOrCreateChannelModel = false;
}

async function onShow() {
  await nextTick();
  input.value.focus();

  await searchChannels();
}

function onHide() {
  channelName.value = "";
  channels.value = [];
  isLoading.value = false;
}
</script>

<template>
  <v-modal
    v-model="store.showJoinOrCreateChannelModel"
    @show="onShow"
    @hide="onHide"
  >
    <template #header>Join or create a channel</template>

    <form @submit.prevent="onSubmit">
      <div class="d-flex mb-3">
        <input
          ref="input"
          class="form-control me-2"
          v-model="channelName"
          @input="onInput"
        />

        <v-btn
          color="primary"
          type="submit"
          :loading="isLoading"
          :disabled="!isValid"
        >
          Create
        </v-btn>
      </div>
    </form>

    <p v-if="!isLoading && !channels.length">No channel found.</p>

    <ul class="list-unstyled">
      <li v-if="isLoading" v-for="_ in 3" class="nav-item">
        <div class="placeholder-container mb-3">
          <div class="placeholder-glow">
            <span class="placeholder w-50 my-auto"></span>
          </div>
        </div>
      </li>

      <li v-for="channel in channels" :key="channel.id">
        <div class="d-flex mb-3 align-items-center">
          <svg class="bi pe-none" width="16" height="16">
            <use xlink:href="#hash" />
          </svg>
          <span class="flex-grow-1">{{ channel.name }}</span>

          <v-btn
            color="primary"
            :loading="isLoading"
            @click="joinChannel(channel)"
          >
            Join
          </v-btn>
        </div>
      </li>
    </ul>
  </v-modal>
</template>

<style scoped>
.placeholder-container {
  height: 38px;
}
</style>
