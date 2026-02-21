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
          <a-descriptions-item label="昵称">
            {{ userInfo.nickname || '未设定昵称' }}
          </a-descriptions-item>
          <a-descriptions-item label="个人签名">
            {{ userInfo.introduction || '未设定签名' }}
          </a-descriptions-item>
          <a-descriptions-item label="账号ID">
            <a-typography-paragraph class="!m-0" copyable> {{ userInfo.id }} </a-typography-paragraph>
          </a-descriptions-item>
        </a-descriptions>
      </div>
      <a-button type="primary" @click="$router.push({ name: 'Authentication' })">实名认证</a-button>
      <a-button type="outline" @click="onEditAccountInfo">编辑资料</a-button>
    </div>

    <EditAccountInfoModal ref="EditAccountInfoModalRef" />
  </a-card>
</template>

<script lang="ts" setup>
  import { computed, ref, useAttrs } from 'vue';
  import { FileItem, Message } from '@arco-design/web-vue';
  import { useUserStore } from '@/store';
  import { getToken } from '@/utils/auth';
  import EditAccountInfoModal from './EditAccountInfoModal.vue';

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
      Message.success('头像上传成功');
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
