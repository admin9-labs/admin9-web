import localeMessageBox from '@/components/message-box/locale/zh-CN';
import localeLogin from '@/views/auth/locale/zh-CN';

import localeWorkplace from '@/views/dashboard/workplace/locale/zh-CN';
import localeUserInfo from '@/views/user/info/locale/zh-CN';
import localeSystemRole from '@/views/system/roles/locale/zh-CN';
import localeSystemPermission from '@/views/system/permissions/locale/zh-CN';
import localeSystemUser from '@/views/system/users/locale/zh-CN';
import localeSystemMember from '@/views/system/members/locale/zh-CN';
import localeSystemFiles from '@/views/system/files/locale/zh-CN';
import localeSystemMenu from '@/views/system/menus/locale/zh-CN';
import localeSystemDict from '@/views/system/dictionaries/locale/zh-CN';
import localeSystemConfig from '@/views/system/configs/locale/zh-CN';
import localeSystemLog from '@/views/system/log/locale/zh-CN';

import localeSettings from './zh-CN/settings';
import localeCommon from './zh-CN/common';

export default {
  'menu.dashboard': '仪表盘',
  'menu.server.dashboard': '仪表盘-服务端',
  'menu.server.workplace': '工作台-服务端',
  'menu.server.monitor': '实时监控-服务端',
  'menu.list': '列表页',
  'menu.result': '结果页',
  'menu.exception': '异常页',
  'menu.form': '表单页',
  'menu.profile': '详情页',
  'menu.visualization': '数据可视化',
  'menu.user': '账号管理',
  'menu.system': '系统管理',
  'menu.arcoWebsite': 'Arco Design',
  'menu.faq': '常见问题',
  'navbar.docs': '文档中心',
  'navbar.action.locale': '切换为中文',
  'menu.form.tiptap': '富文本',

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
  ...localeSystemFiles,
  ...localeSystemMenu,
  ...localeSystemDict,
  ...localeSystemConfig,
  ...localeSystemLog,
};
