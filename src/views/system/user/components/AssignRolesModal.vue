<template>
  <a-modal
    v-model:visible="visible"
    :title="$t('system.user.rolesModal.title')"
    :ok-loading="submitLoading"
    :mask-closable="!submitLoading"
    unmount-on-close
    @before-ok="onSave"
    @close="onReset"
  >
    <a-spin :loading="detailLoading" class="form-spin">
      <a-form ref="formRef" :model="formData" layout="vertical">
        <a-form-item :label="$t('system.user.rolesModal.roles')" field="roles">
          <a-select v-model="formData.roles" :placeholder="$t('system.user.rolesModal.roles.placeholder')" allow-clear multiple>
            <a-option v-for="role in roleOptions" :key="role.id" :value="role.name">
              {{ role.name }}
            </a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
  import { reactive, ref } from 'vue';
  import { Message, type FormInstance } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useVisible } from '@/hooks';
  import { queryRoleList, type RoleRecord } from '@/api/system/role';
  import { queryUserDetail, syncUserRoles } from '@/api/system/user';

  const emit = defineEmits<{ success: [userId: number] }>();

  const { t } = useI18n();
  const { visible, setVisible } = useVisible(false);
  const formRef = ref<FormInstance>();
  const editingId = ref<number>();
  const roleOptions = ref<RoleRecord[]>([]);
  const reservedRoleNames = new Set(['super-admin', 'system-admin']);
  const detailLoading = ref(false);
  const submitLoading = ref(false);
  const formData = reactive({ roles: [] as string[] });

  const onReset = () => {
    editingId.value = undefined;
    roleOptions.value = [];
    formData.roles = [];
    detailLoading.value = false;
    formRef.value?.resetFields();
  };

  const onEdit = async (userId: number, allowReservedRoles: boolean) => {
    onReset();
    editingId.value = userId;
    setVisible(true);
    detailLoading.value = true;
    try {
      const [userRes, roleRes] = await Promise.all([queryUserDetail(userId), queryRoleList()]);
      roleOptions.value = allowReservedRoles ? roleRes.data : roleRes.data.filter((role) => !reservedRoleNames.has(role.name));
      formData.roles = (userRes.data.user.roles ?? []).map((role) => role.name);
    } catch {
      setVisible(false);
    } finally {
      detailLoading.value = false;
    }
  };

  const onSave = async (done: (closed: boolean) => void) => {
    if (detailLoading.value || editingId.value === undefined) {
      done(false);
      return;
    }

    submitLoading.value = true;
    try {
      const userId = editingId.value;
      await syncUserRoles(userId, { roles: formData.roles });
      Message.success(t('system.user.rolesModal.success'));
      emit('success', userId);
      done(true);
    } catch {
      done(false);
    } finally {
      submitLoading.value = false;
    }
  };

  defineExpose({ onEdit });
</script>

<style scoped lang="less">
  .form-spin {
    width: 100%;
  }
</style>
