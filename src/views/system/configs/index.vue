<template>
  <div v-permission="['system.config.view']" class="page-container">
    <Grid :title="$t('system.config.title')">
      <a-alert v-if="loadError" type="warning" class="settings-alert">
        {{ $t('system.config.loadError') }}
        <template #action>
          <a-button size="small" @click="loadSettings">{{ $t('system.config.retry') }}</a-button>
        </template>
      </a-alert>
      <a-alert v-else-if="!canUpdate" type="info" class="settings-alert">
        {{ $t('system.config.readonly') }}
      </a-alert>

      <a-spin :loading="loading" class="settings-loading">
        <a-tabs :active-key="activeTab" type="line" @change="handleTabChange">
          <a-tab-pane key="basic" :title="$t('system.config.tabs.basic')">
            <a-form
              ref="basicFormRef"
              :model="basicForm"
              :rules="basicRules"
              layout="vertical"
              class="settings-form basic-form"
            >
              <a-form-item :label="$t('system.config.fields.systemName')" field="systemName">
                <a-input
                  v-model="basicForm.systemName"
                  :disabled="!canEdit"
                  :max-length="100"
                  :placeholder="$t('system.config.placeholders.systemName')"
                  show-word-limit
                />
              </a-form-item>
              <a-form-item :label="$t('system.config.fields.copyright')" field="copyright">
                <a-input
                  v-model="basicForm.copyright"
                  :disabled="!canEdit"
                  :max-length="1000"
                  :placeholder="$t('system.config.placeholders.copyright')"
                  show-word-limit
                />
              </a-form-item>
              <a-form-item :label="$t('system.config.fields.icpFilingNumber')" field="icpFilingNumber">
                <a-input
                  v-model="basicForm.icpFilingNumber"
                  :disabled="!canEdit"
                  :max-length="100"
                  :placeholder="$t('system.config.placeholders.icpFilingNumber')"
                  show-word-limit
                />
              </a-form-item>
              <div v-if="canUpdate" class="form-actions">
                <a-button type="primary" :loading="basicSaving" :disabled="!canEdit || !basicDirty" @click="saveBasic">
                  <template #icon><icon-save /></template>
                  {{ $t('common.action.save') }}
                </a-button>
              </div>
            </a-form>
          </a-tab-pane>

          <a-tab-pane key="brand" :title="$t('system.config.tabs.brand')">
            <div class="settings-form brand-form">
              <BrandAssetField
                :asset="brandForm.navigationLogo"
                :fallback="DEFAULT_BRAND_SYSTEM_SETTINGS.navigationLogo.url || ''"
                :label="$t('system.config.fields.navigationLogo')"
                :description="$t('system.config.descriptions.navigationLogo')"
                :readonly="!canEdit"
                :can-browse="canBrowseMedia"
                :can-upload="canUploadMedia"
                @update:asset="brandForm.navigationLogo = $event"
              />
              <BrandAssetField
                :asset="brandForm.loginLogo"
                :fallback="DEFAULT_BRAND_SYSTEM_SETTINGS.loginLogo.url || ''"
                :label="$t('system.config.fields.loginLogo')"
                :description="$t('system.config.descriptions.loginLogo')"
                :readonly="!canEdit"
                :can-browse="canBrowseMedia"
                :can-upload="canUploadMedia"
                @update:asset="brandForm.loginLogo = $event"
              />
              <BrandAssetField
                :asset="brandForm.loginBackground"
                :fallback="DEFAULT_BRAND_SYSTEM_SETTINGS.loginBackground.url || ''"
                :label="$t('system.config.fields.loginBackground')"
                :description="$t('system.config.descriptions.loginBackground')"
                variant="background"
                :readonly="!canEdit"
                :can-browse="canBrowseMedia"
                :can-upload="canUploadMedia"
                @update:asset="brandForm.loginBackground = $event"
              />
              <BrandAssetField
                :asset="brandForm.favicon"
                :fallback="DEFAULT_BRAND_SYSTEM_SETTINGS.favicon.url || ''"
                :label="$t('system.config.fields.favicon')"
                :description="$t('system.config.descriptions.favicon')"
                variant="favicon"
                :readonly="!canEdit"
                :can-browse="canBrowseMedia"
                :can-upload="canUploadMedia"
                @update:asset="brandForm.favicon = $event"
              />
              <div v-if="canUpdate" class="form-actions">
                <a-button type="primary" :loading="brandSaving" :disabled="!canEdit || !brandDirty" @click="saveBrand">
                  <template #icon><icon-save /></template>
                  {{ $t('common.action.save') }}
                </a-button>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </a-spin>
    </Grid>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
  import { Modal, Message, type FormInstance } from '@arco-design/web-vue';
  import { onBeforeRouteLeave } from 'vue-router';
  import { useI18n } from 'vue-i18n';
  import { useSystemSettingsStore } from '@/store';
  import usePermission from '@/hooks/permission';
  import {
    mapSystemSettings,
    queryAdminSystemSettings,
    updateBasicSystemSettings,
    updateBrandingSystemSettings,
    type SystemSettingsResource,
  } from '@/api/system/settings';
  import { DEFAULT_BRAND_SYSTEM_SETTINGS, type BasicSystemSettings, type BrandSystemSettings } from '@/config/system-settings';
  import BrandAssetField from './components/BrandAssetField.vue';

  defineOptions({ name: 'SystemConfig' });

  type SettingsTab = 'basic' | 'brand';

  const { t } = useI18n();
  const { hasPermission } = usePermission();
  const systemSettingsStore = useSystemSettingsStore();
  const activeTab = ref<SettingsTab>('basic');
  const loading = ref(false);
  const loadError = ref(false);
  const settingsLoaded = ref(false);
  const basicSaving = ref(false);
  const brandSaving = ref(false);
  const basicFormRef = ref<FormInstance>();
  const canUpdate = computed(() => hasPermission('system.config.update'));
  const canEdit = computed(
    () => canUpdate.value && settingsLoaded.value && !loading.value && !basicSaving.value && !brandSaving.value
  );
  const canBrowseMedia = computed(() => hasPermission('system.media.view'));
  const canUploadMedia = computed(() => hasPermission('system.media.create'));
  let loadRequestId = 0;

  const cloneBasic = (settings: BasicSystemSettings): BasicSystemSettings => ({ ...settings });
  const cloneBrand = (settings: BrandSystemSettings): BrandSystemSettings => ({
    navigationLogo: { ...settings.navigationLogo },
    loginLogo: { ...settings.loginLogo },
    loginBackground: { ...settings.loginBackground },
    favicon: { ...settings.favicon },
  });

  const basicForm = reactive(cloneBasic(systemSettingsStore.basic));
  const brandForm = reactive(cloneBrand(systemSettingsStore.brand));
  const basicSnapshot = ref(JSON.stringify(basicForm));
  const brandSnapshot = ref(JSON.stringify(brandForm));
  const basicDirty = computed(() => JSON.stringify(basicForm) !== basicSnapshot.value);
  const brandDirty = computed(() => JSON.stringify(brandForm) !== brandSnapshot.value);
  const hasUnsavedChanges = computed(() => basicDirty.value || brandDirty.value);

  const basicRules = {
    systemName: [{ required: true, maxLength: 100, message: t('system.config.validation.systemName') }],
  };

  const applySettingsResource = (resource: SystemSettingsResource) => {
    const mapped = mapSystemSettings(resource);
    systemSettingsStore.applyResource(resource);
    Object.assign(basicForm, cloneBasic(mapped.basic));
    Object.assign(brandForm, cloneBrand(mapped.brand));
    basicSnapshot.value = JSON.stringify(basicForm);
    brandSnapshot.value = JSON.stringify(brandForm);
    settingsLoaded.value = true;
  };

  const confirmDiscard = () =>
    new Promise<boolean>((resolve) => {
      Modal.warning({
        title: t('system.config.unsaved.title'),
        content: t('system.config.unsaved.content'),
        okText: t('system.config.unsaved.discard'),
        cancelText: t('common.action.cancel'),
        hideCancel: false,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
        onClose: () => resolve(false),
      });
    });

  const loadSettings = async () => {
    loadRequestId += 1;
    const requestId = loadRequestId;
    loading.value = true;
    loadError.value = false;
    settingsLoaded.value = false;
    try {
      const response = await queryAdminSystemSettings();
      if (requestId !== loadRequestId) return;
      applySettingsResource(response.data);
    } catch {
      if (requestId === loadRequestId) loadError.value = true;
    } finally {
      if (requestId === loadRequestId) loading.value = false;
    }
  };

  const handleTabChange = async (key: string | number) => {
    const nextTab = key as SettingsTab;
    if (nextTab === activeTab.value) return;
    const currentDirty = activeTab.value === 'basic' ? basicDirty.value : brandDirty.value;
    if (currentDirty && !(await confirmDiscard())) return;
    if (activeTab.value === 'basic') {
      Object.assign(basicForm, JSON.parse(basicSnapshot.value) as BasicSystemSettings);
    } else {
      Object.assign(brandForm, JSON.parse(brandSnapshot.value) as BrandSystemSettings);
    }
    activeTab.value = nextTab;
  };

  const saveBasic = async () => {
    if (!canEdit.value) return;
    basicSaving.value = true;
    try {
      const errors = await basicFormRef.value?.validate();
      if (errors) return;
      const response = await updateBasicSystemSettings({
        system_name: basicForm.systemName,
        copyright: basicForm.copyright || null,
        icp_filing_number: basicForm.icpFilingNumber || null,
      });
      applySettingsResource(response.data);
      Message.success(t('system.config.saveSuccess'));
    } finally {
      basicSaving.value = false;
    }
  };

  const saveBrand = async () => {
    if (!canEdit.value) return;
    brandSaving.value = true;
    try {
      const response = await updateBrandingSystemSettings({
        navigation_logo_media_id: brandForm.navigationLogo.id,
        login_logo_media_id: brandForm.loginLogo.id,
        login_background_media_id: brandForm.loginBackground.id,
        favicon_media_id: brandForm.favicon.id,
      });
      applySettingsResource(response.data);
      Message.success(t('system.config.saveSuccess'));
    } finally {
      brandSaving.value = false;
    }
  };

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasUnsavedChanges.value) return;
    event.preventDefault();
    event.returnValue = '';
  };

  onBeforeRouteLeave(() => !hasUnsavedChanges.value || confirmDiscard());
  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    loadSettings();
  });
  onBeforeUnmount(() => {
    loadRequestId += 1;
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });
</script>

<style lang="less" scoped>
  .settings-alert {
    margin-bottom: 16px;
  }

  .settings-loading {
    display: block;
    min-height: 360px;
  }

  .settings-form {
    max-width: 760px;
    padding: 16px 0 4px;
  }

  .basic-form {
    max-width: 640px;
  }

  .brand-form {
    max-width: 860px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 20px;
  }
</style>
