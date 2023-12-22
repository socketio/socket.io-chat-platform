<script setup>
import { computed } from "vue";
import { useMainStore } from "@/stores/main";
import Username from "@/components/Username.vue";

const store = useMainStore();

const props = defineProps({
  channel: Object,
});

const userId = computed(() => {
  return props.channel.users[0];
});

const isOnline = computed(() => {
  return store.users.get(props.channel.users[0])?.isOnline;
});
</script>

<template>
  <div class="d-flex align-items-center">
    <svg
      class="bi pe-none me-1"
      width="16"
      height="16"
      :color="isOnline ? '#4b4' : '#b44'"
    >
      <use xlink:href="#circle-fill" />
    </svg>

    <Username :id="userId" class="mw-80 overflow-hidden" />
  </div>
</template>

<style scoped></style>
