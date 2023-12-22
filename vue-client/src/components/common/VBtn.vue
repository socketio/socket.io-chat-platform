<script setup>
import { computed } from "vue";

const props = defineProps({
  loading: Boolean,
  disabled: Boolean,
  icon: String,
  color: String,
  outlined: Boolean,
});

defineEmits(["click"]);

const additionalClasses = computed(() => {
  const c = [];

  switch (props.color) {
    case "primary":
      c.push(props.outlined ? "btn-outline-primary" : "btn-primary");
  }

  return c;
});
</script>

<template>
  <button
    class="btn"
    :class="additionalClasses"
    @click="$emit('click')"
    :disabled="disabled || loading"
  >
    <span
      class="spinner-border spinner-border-sm me-1"
      aria-hidden="true"
      v-if="loading"
    ></span>

    <svg class="bi pe-none" width="16" height="16" v-if="icon">
      <use :href="'#' + icon" />
    </svg>

    <slot />
  </button>
</template>

<style scoped></style>
