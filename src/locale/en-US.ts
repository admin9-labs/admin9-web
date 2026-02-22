import localeMessageBox from '@/components/message-box/locale/en-US';
import localeLogin from '@/views/auth/locale/en-US';

import localeWorkplace from '@/views/dashboard/workplace/locale/en-US';
import localeUserInfo from '@/views/user/info/locale/en-US';
import localeUserAuthentication from '@/views/user/authentication/locale/en-US';

import localeSystem from '@/views/system/locale/en-US';
import localeSystemUser from '@/views/system/user/locale/en-US';
import localeSystemRole from '@/views/system/role/locale/en-US';
import localeSystemMenu from '@/views/system/menu/locale/en-US';

import localeSettings from './en-US/settings';

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
  'menu.system.dict': 'Dictionary',
  'menu.system.dictItem': 'Dictionary Items',
  'menu.log': 'Logs',
  'menu.log.login': 'Login Logs',
  'menu.log.operation': 'Operation Logs',
  'menu.arcoWebsite': 'Arco Design',
  'menu.faq': 'FAQ',
  'navbar.docs': 'Docs',
  'navbar.action.locale': 'Switch to English',
  'menu.form.tiptap': 'Rich Text',
  ...localeSettings,
  ...localeMessageBox,
  ...localeLogin,
  ...localeWorkplace,
  ...localeUserInfo,
  ...localeUserAuthentication,
  ...localeSystem,
  ...localeSystemUser,
  ...localeSystemRole,
  ...localeSystemMenu,
};
