import localeMessageBox from '@/components/message-box/locale/en-US';
import localeLogin from '@/views/auth/locale/en-US';

import localeWorkplace from '@/views/dashboard/workplace/locale/en-US';
import localeUserInfo from '@/views/user/info/locale/en-US';
import localeSystemRole from '@/views/system/roles/locale/en-US';
import localeSystemPermission from '@/views/system/permissions/locale/en-US';
import localeSystemUser from '@/views/system/users/locale/en-US';
import localeSystemMember from '@/views/system/members/locale/en-US';
import localeSystemMedia from '@/views/system/media/locale/en-US';
import localeSystemMenu from '@/views/system/menus/locale/en-US';
import localeSystemDict from '@/views/system/dictionaries/locale/en-US';
import localeSystemConfig from '@/views/system/configs/locale/en-US';
import localeSystemLog from '@/views/system/log/locale/en-US';

import localeSettings from './en-US/settings';
import localeCommon from './en-US/common';

export default {
  'menu.dashboard': 'Dashboard',
  'menu.server.dashboard': 'Dashboard-Server',
  'menu.server.workplace': 'Workplace-Server',
  'menu.server.monitor': 'Monitor-Server',
  'menu.list': 'List',
  'menu.result': 'Result',
  'menu.exception': 'Exception',
  'menu.form': 'Form',
  'menu.profile': 'Profile',
  'menu.visualization': 'Data Visualization',
  'menu.user': 'Account Management',
  'menu.system': 'System',
  'menu.arcoWebsite': 'Arco Design',
  'menu.faq': 'FAQ',
  'navbar.docs': 'Docs',
  'navbar.action.locale': 'Switch to English',
  'menu.form.tiptap': 'Rich Text',

  ...localeSettings,
  ...localeCommon,
  ...localeMessageBox,
  ...localeLogin,
  ...localeWorkplace,
  ...localeUserInfo,
  ...localeSystemRole,
  ...localeSystemPermission,
  ...localeSystemUser,
  ...localeSystemMember,
  ...localeSystemMedia,
  ...localeSystemMenu,
  ...localeSystemDict,
  ...localeSystemConfig,
  ...localeSystemLog,
};
