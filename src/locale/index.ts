import { createI18n } from 'vue-i18n';
import { messages as admin9UiMessages } from '@admin9-labs/admin9-ui/locale';
import en from './en-US';
import cn from './zh-CN';

export const LOCALE_OPTIONS = [
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
];
const defaultLocale = localStorage.getItem('arco-locale') || 'zh-CN';

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: 'en-US',
  legacy: false,
  messages: {
    'en-US': { ...en, ...admin9UiMessages['en-US'] },
    'zh-CN': { ...cn, ...admin9UiMessages['zh-CN'] },
  },
});

export default i18n;
