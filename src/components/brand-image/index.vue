<template>
  <img :src="renderedSource" v-bind="$attrs" @error="handleError" />
</template>

<script lang="ts" setup>
  import { ref, watch } from 'vue';

  defineOptions({ name: 'BrandImage', inheritAttrs: false });

  const props = defineProps<{
    src: string;
    fallback: string;
  }>();

  const renderedSource = ref(props.src || props.fallback);

  watch(
    () => props.src,
    (source) => {
      renderedSource.value = source || props.fallback;
    }
  );

  const handleError = () => {
    if (renderedSource.value !== props.fallback) renderedSource.value = props.fallback;
  };
</script>
