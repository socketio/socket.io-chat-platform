<script setup>
defineProps({
  channel: Object,
});
</script>

<template>
  <div class="d-flex align-items-center overflow-hidden">
    <svg class="bi pe-none me-1" width="16" height="16">
      <use xlink:href="#hash" />
    </svg>
    <span class="mw-80 overflow-hidden">
      {{ channel.name }}
    </span>
  </div>
</template>

<style scoped></style>
