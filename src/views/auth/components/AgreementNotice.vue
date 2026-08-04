<template>
  <div class="text-sm">
    <template v-if="type === 'register'">
      <a-space size="mini" wrap fill>
        <a-checkbox :model-value="modelValue" class="text-sm" @change="handleChange">
          {{ $t('auth.agreement.registerPrefix') }}
        </a-checkbox>
        <a href="/terms-service" class="text-link" target="_blank">{{ $t('auth.agreement.termsOfService') }}</a>
        <a href="/privacy-policy" class="text-link" target="_blank">{{ $t('auth.agreement.privacyPolicy') }}</a>
      </a-space>
    </template>
    <template v-else>
      <span>{{ $t('auth.agreement.loginPrefix') }}</span>
      <a href="/terms-service" class="text-link" target="_blank">{{ $t('auth.agreement.termsOfService') }}</a>
      <a href="/privacy-policy" class="text-link" target="_blank">{{ $t('auth.agreement.privacyPolicy') }}</a>
    </template>
  </div>
</template>

<script lang="ts" setup>
  defineProps<{
    type: 'login' | 'register';
    modelValue?: boolean;
  }>();

  type CheckboxValue = boolean | (string | number | boolean)[];

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
  }>();

  const handleChange = (value: CheckboxValue) => {
    if (typeof value === 'boolean') emit('update:modelValue', value);
  };
</script>
