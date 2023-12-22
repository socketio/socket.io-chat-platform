<script setup>
import { nextTick, ref } from "vue";
import { useMainStore } from "@/stores/main";
import { debounce } from "@/util";
import { socket } from "@/BackendService";
import VBtn from "@/components/common/VBtn.vue";
import VModal from "@/components/common/VModal.vue";

const store = useMainStore();

const isLoading = ref(false);
const username = ref("");
const users = ref([]);
const input = ref(null);

const onInput = debounce(searchUsers, 300);

async function searchUsers() {
  if (isLoading.value) {
    // no way to cancel the current search
    return;
  }

  isLoading.value = true;
  users.value = [];

  const res = await socket.emitWithAck("user:search", {
    q: username.value,
  });

  if (res.status === "OK") {
    users.value = res.data;
  }

  isLoading.value = false;
}

async function startChatWithUser(user) {
  isLoading.value = true;

  const res = await socket.emitWithAck("user:reach", {
    userIds: [user.id],
  });

  if (res.status === "OK") {
    const channel = {
      id: res.data.id,
      type: "private",
      users: [user.id],
    };
    store.addChannel(channel);
    store.selectChannel(channel.id);
    store.showSearchUserModal = false;
  }

  isLoading.value = false;
}

async function onShow() {
  await nextTick();
  input.value.focus();

  await searchUsers();
}

function onHide() {
  username.value = "";
  users.value = [];
  isLoading.value = false;
}
</script>

<template>
  <v-modal v-model="store.showSearchUserModal" @show="onShow" @hide="onHide">
    <template #header>Search for a user</template>

    <input
      ref="input"
      class="form-control mb-3"
      v-model="username"
      @input="onInput"
    />

    <p v-if="!isLoading && !users.length">No user found.</p>

    <ul class="list-unstyled">
      <li v-if="isLoading" v-for="_ in 3" class="nav-item">
        <div class="placeholder-container mb-3">
          <div class="placeholder-glow">
            <span class="placeholder w-50 my-auto"></span>
          </div>
        </div>
      </li>

      <li v-for="user in users" :key="user.id">
        <div class="d-flex mb-3 align-items-center">
          <span class="flex-grow-1">{{ user.username }}</span>

          <v-btn
            color="primary"
            :loading="isLoading"
            @click="startChatWithUser(user)"
          >
            Start chat
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
