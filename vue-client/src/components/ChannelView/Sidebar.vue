<script setup>
import { useMainStore } from "@/stores/main";
import BackendService from "@/BackendService";
import { useRouter } from "vue-router";
import VBtn from "@/components/common/VBtn.vue";
import PublicChannelLabel from "@/components/ChannelView/PublicChannelLabel.vue";
import PrivateChannelLabel from "@/components/ChannelView/PrivateChannelLabel.vue";

const store = useMainStore();
const router = useRouter();

async function logOut() {
  await BackendService.logOut();
  store.clear();
  await router.push({ name: "login" });
}
</script>

<template>
  <div class="d-flex flex-column flex-shrink-0 p-3" style="width: 280px">
    <a
      href="/"
      class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-black text-decoration-none"
    >
      <img
        class="bi pe-none me-2"
        src="@/assets/logo.svg"
        width="40"
        height="32"
      />
      <span class="fs-4">Socket.IO chat</span>
    </a>

    <h6 class="mt-4">CHANNELS</h6>

    <ul class="nav nav-pills d-block overflow-auto mh-40">
      <li v-if="!store.isInitialized" v-for="_ in 4" class="nav-item">
        <div class="placeholder-glow channel-placeholder">
          <span class="placeholder w-75"></span>
        </div>
      </li>

      <li
        class="nav-item"
        v-for="channel in store.publicChannels"
        :key="channel.id"
      >
        <router-link
          class="nav-link d-flex"
          :to="{ params: { channelId: channel.id } }"
          :class="store.isChannelSelected(channel.id) ? 'active' : 'text-black'"
        >
          <PublicChannelLabel :channel="channel" class="flex-grow-1" />

          <span class="badge text-bg-primary" v-if="channel.unreadCount > 0">{{
            channel.unreadCount
          }}</span>
        </router-link>
      </li>

      <li>
        <v-btn
          color="primary"
          outlined
          class="mt-1"
          icon="plus"
          :disabled="!store.isInitialized"
          @click="store.showJoinOrCreateChannelModel = true"
        >
          Add channel
        </v-btn>
      </li>
    </ul>

    <h6 class="mt-4">DIRECT MESSAGES</h6>

    <ul class="nav nav-pills d-block overflow-auto mh-40">
      <li v-if="!store.isInitialized" v-for="_ in 4" class="nav-item">
        <div class="placeholder-glow channel-placeholder">
          <span class="placeholder w-75"></span>
        </div>
      </li>

      <li
        class="nav-item"
        v-for="channel in store.privateChannels"
        :key="channel.id"
      >
        <router-link
          class="nav-link d-flex"
          :to="{ params: { channelId: channel.id } }"
          :class="store.isChannelSelected(channel.id) ? 'active' : 'text-black'"
        >
          <PrivateChannelLabel :channel="channel" class="flex-grow-1" />

          <span class="badge text-bg-primary" v-if="channel.unreadCount > 0">{{
            channel.unreadCount
          }}</span>
        </router-link>
      </li>

      <li>
        <v-btn
          color="primary"
          outlined
          class="mt-1"
          icon="plus"
          @click="store.showSearchUserModal = true"
          :disabled="!store.isInitialized"
        >
          Add user
        </v-btn>
      </li>
    </ul>

    <hr class="mt-auto" />

    <div>
      <v-btn
        color="primary"
        outlined
        icon="box-arrow-right"
        @click="logOut"
        :disabled="!store.isInitialized"
      >
        Log out
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.mh-40 {
  max-height: 40%;
}

.channel-placeholder {
  height: 40px;
  padding-top: 8px;
}
</style>
