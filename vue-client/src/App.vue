<script setup>
import { onBeforeMount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMainStore } from "@/stores/main";
import BackendService, { socket } from "@/BackendService";
import JoinOrCreateChannelModal from "@/components/JoinOrCreateChannelModal.vue";
import SearchUserModal from "@/components/SearchUserModal.vue";

const router = useRouter();
const route = useRoute();
const store = useMainStore();

store.bindEvents();

socket.on("connect_error", (err) => {
  if (err.context?.status === 401) {
    socket.disconnect();
    router.push({
      name: "login",
    });
  }
});

socket.on("disconnect", (reason) => {
  if (reason === "io server disconnect") {
    router.push({
      name: "login",
    });
  }
});

const unauthenticatedRoutes = ["login", "signup"];

onBeforeMount(async () => {
  try {
    const res = await BackendService.self();

    if (res.status === 200) {
      const user = await res.json();
      store.setCurrentUser(user);

      const channelId = await store.init();

      if (
        unauthenticatedRoutes.includes(route.name) ||
        !store.selectedChannel
      ) {
        await router.push({ name: "channel", params: { channelId } });
      }

      return;
    }
  } catch (e) {}

  if (!unauthenticatedRoutes.includes(route.name)) {
    const query = {};
    if (route.path !== "/") {
      query.returnTo = route.path;
    }
    await router.push({
      name: "login",
      query,
    });
  }
});
</script>

<template>
  <RouterView />

  <JoinOrCreateChannelModal />
  <SearchUserModal />
</template>

<style scoped></style>
