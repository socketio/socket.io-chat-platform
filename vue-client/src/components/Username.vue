<script setup>
import { onMounted, ref, watch } from "vue";
import { useMainStore } from "@/stores/main";

const store = useMainStore();
const props = defineProps(["id"]);

const isLoading = ref(false);
const username = ref("");

async function loadUsername() {
  isLoading.value = true;

  const user = await store.getUser(props.id);

  username.value = user?.username || "ghost";

  isLoading.value = false;
}

onMounted(loadUsername);
watch(() => props.id, loadUsername);
</script>

<template>
  <span v-if="isLoading" class="placeholder-glow ms-2" aria-hidden="true">
    <span class="placeholder" />
  </span>

  <span v-else>{{ username }}</span>
</template>

<style scoped>
.placeholder {
  width: 60px;
}
</style>
