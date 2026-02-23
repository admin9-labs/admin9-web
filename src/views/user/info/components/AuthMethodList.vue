<template>
  <a-card v-bind="{ ...attrs }">
    <a-row v-for="(item, index) in loginTypes" :key="index" :gutter="[16, 54]" align="center">
      <a-col :xs="19" :sm="22" class="flex">
        <img v-if="item.status === 1" :src="item.icon" :alt="item.name" />
        <img v-if="item.status === 0" :src="item.unbind_icon" :alt="item.name" />
        <div class="ml-4">
          <div class="flex items-center">
            <span class="mr-2 font-medium">{{ item.name }}</span>
            <template v-if="item.type === 'password'">
              <a-badge
                v-if="item.status === 1"
                status="success"
                :text="t('common.status.set')"
                style="--color-text-1: rgb(var(--success-6))"
              />
              <a-badge
                v-if="item.status === 0"
                status="warning"
                :text="t('common.status.notSet')"
                style="--color-text-1: rgb(var(--warning-6))"
              />
            </template>
            <template v-else>
              <a-badge
                v-if="item.status === 1"
                status="success"
                :text="t('common.status.bound')"
                style="--color-text-1: rgb(var(--success-6))"
              />
              <a-badge
                v-if="item.status === 0"
                status="warning"
                :text="t('common.status.notBound')"
                style="--color-text-1: rgb(var(--warning-6))"
              />
            </template>
          </div>
          <div class="text-sm mt-2">{{ item.description }}</div>
        </div>
      </a-col>
      <a-col :xs="5" :sm="2" class="flex justify-end items-center">
        <template v-if="item.type === 'password'">
          <a-button type="primary" status="normal" size="small" @click="onAction(item)">{{
            t('common.action.modify')
          }}</a-button>
        </template>
        <template v-else>
          <a-button v-if="item.status === 0" type="primary" status="normal" size="small" @click="onAction(item)">{{
            t('common.action.bind')
          }}</a-button>
          <a-button v-if="item.status === 1" status="normal" size="small" @click="onAction(item)">{{
            t('common.action.unbind')
          }}</a-button>
        </template>
      </a-col>
    </a-row>

    <EditPasswordModal ref="EditPasswordModalRef" />
    <EditPhoneModal ref="EditPhoneModalRef" />
    <EditEmailModal ref="EditEmailModalRef" />
  </a-card>
</template>

<script setup lang="ts">
  import { ref, useAttrs } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import UserIcon from '../icons/user.svg?url';
  import UnbindUserIcon from '../icons/user-unbind.svg?url';
  import MailIcon from '../icons/mail.svg?url';
  import MailIconUnbind from '../icons/mail-unbind.svg?url';
  import PhoneIcon from '../icons/tel.svg?url';
  import PhoneIconUnbind from '../icons/tel-unbind.svg?url';
  import WechatIcon from '../icons/wechat.svg?url';
  import WechatIconUnbind from '../icons/wechat-unbind.svg?url';
  import GoogleIcon from '../icons/google.svg?url';
  import GoogleIconUnbind from '../icons/google-unbind.svg?url';
  import EditPasswordModal from './EditPasswordModal.vue';
  import EditPhoneModal from './EditPhoneModal.vue';
  import EditEmailModal from './EditEmailModal.vue';

  const { t } = useI18n();
  const attrs = useAttrs();

  const loginTypes = ref([
    {
      type: 'password',
      icon: UserIcon,
      unbind_icon: UnbindUserIcon,
      status: 0,
      name: t('userInfo.auth.password.name'),
      description: t('userInfo.auth.password.desc'),
    },
    {
      type: 'phone',
      icon: PhoneIcon,
      unbind_icon: PhoneIconUnbind,
      status: 1,
      name: t('userInfo.auth.phone.name'),
      description: t('userInfo.auth.phone.desc'),
    },
    {
      type: 'email',
      icon: MailIcon,
      unbind_icon: MailIconUnbind,
      status: 0,
      name: t('userInfo.auth.email.name'),
      description: t('userInfo.auth.email.desc'),
    },
    {
      type: 'google',
      icon: GoogleIcon,
      unbind_icon: GoogleIconUnbind,
      status: 0,
      name: t('userInfo.auth.google.name'),
      description: t('userInfo.auth.google.desc'),
    },
    {
      type: 'wechat',
      icon: WechatIcon,
      unbind_icon: WechatIconUnbind,
      status: 1,
      name: t('userInfo.auth.wechat.name'),
      description: t('userInfo.auth.wechat.desc'),
    },
  ]);

  const EditPasswordModalRef = ref();
  const EditPhoneModalRef = ref();
  const EditEmailModalRef = ref();

  const onAction = (item: any) => {
    if (item.type === 'password') {
      EditPasswordModalRef.value?.onEdit();
    } else if (item.type === 'phone') {
      EditPhoneModalRef.value?.onEdit();
    } else if (item.type === 'email') {
      EditEmailModalRef.value?.onEdit();
    } else {
      Message.info(t('userInfo.auth.redirectAuth'));
    }
  };
</script>
