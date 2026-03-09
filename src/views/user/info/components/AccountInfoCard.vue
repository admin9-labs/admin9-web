<template>
  <a-card v-bind="{ ...attrs }">
    <div class="flex flex-col md:flex-row items-center gap-4">
      <div class="w-32 text-center">
        <a-upload
          :file-list="[file]"
          :show-file-list="false"
          :action="uploadAction"
          :headers="{ Authorization: `Bearer ${token}` }"
          list-type="picture-card"
          @change="onChange"
          @success="onSuccess"
          @progress="onProgress"
        >
          <template #upload-button>
            <a-avatar :size="84" class="info-avatar" object-fit="cover">
              <template #trigger-icon>
                <icon-camera />
              </template>
              <img v-if="file.length" :src="file.url" />
            </a-avatar>
          </template>
        </a-upload>
      </div>
      <div class="flex-1">
        <a-descriptions :column="1" class="pt-[8px]">
          <a-descriptions-item :label="t('userInfo.account.nickname')">
            {{ userInfo.nickname || t('userInfo.account.nickname.empty') }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('userInfo.account.introduction')">
            {{ userInfo.introduction || t('userInfo.account.introduction.empty') }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('userInfo.account.id')">
            <a-typography-paragraph class="!m-0" copyable> {{ userInfo.id }} </a-typography-paragraph>
          </a-descriptions-item>
        </a-descriptions>
      </div>
      <a-button type="outline" @click="onEditAccountInfo">{{ t('userInfo.account.editProfile') }}</a-button>
    </div>

    <EditAccountInfoModal ref="EditAccountInfoModalRef" />
  </a-card>
</template>

<script lang="ts" setup>
  import { computed, ref, useAttrs } from 'vue';
  import { FileItem, Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useUserStore } from '@/store';
  import { getToken } from '@/utils/auth';
  import EditAccountInfoModal from './EditAccountInfoModal.vue';

  const { t } = useI18n();
  const attrs = useAttrs();

  const token = getToken();
  const uploadAction = `${import.meta.env.VITE_API_BASE_URL}/api/user/upload-avatar`;
  const userStore = useUserStore();
  const userInfo = computed(() => userStore.userInfo);
  const file = ref<FileItem>({ uid: '-2', name: 'avatar.png', url: userInfo.value.avatar });

  const onChange = (fileItemList: FileItem[], fileItem: FileItem) => {
    file.value.url = fileItem.url;
  };

  const onProgress = (currentFile: File) => {
    file.value = currentFile;
  };

  const onSuccess = async (response?: any) => {
    const { code, message, data } = JSON.parse(response.response);
    if (code === 0) {
      file.value.url = data.url;
      userStore.info();
      Message.success(t('userInfo.account.avatarSuccess'));
    } else {
      Message.error(message);
    }
  };

  // 修改昵称
  const EditAccountInfoModalRef = ref<InstanceType<typeof EditAccountInfoModal>>();
  const onEditAccountInfo = () => {
    EditAccountInfoModalRef.value?.onEdit();
  };
</script>
