<script setup>
import { ref, watch } from "vue";

const props = defineProps(["modelValue"]);
const emit = defineEmits(["update:modelValue", "show", "hide"]);

const content = ref(null);

function onClick($event) {
  const isOutside = !content.value.contains($event.target);
  if (isOutside) {
    emit("update:modelValue", false);
  }
}

watch(
  () => props.modelValue,
  () => {
    emit(props.modelValue ? "show" : "hide");
  },
);
</script>

<template>
  <div
    class="modal fade"
    :class="modelValue ? 'd-block show' : 'd-none'"
    @click="onClick"
  >
    <div class="modal-dialog">
      <div ref="content" class="modal-content">
        <div class="modal-header">
          <slot name="header"></slot>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
        <footer>
          <slot name="footer"></slot>
        </footer>
      </div>
    </div>
  </div>
  <div
    class="modal-backdrop fade"
    :class="modelValue ? 'show' : 'd-none'"
  ></div>
</template>

<style scoped></style>
