export const EXCEPTION_500_ROUTE_NAME = 'Exception500';
export const EXCEPTION_RETRY_MODE_DOCUMENT = 'document';

export const WHITE_LIST = [
  { name: 'notFound', children: [] },
  { name: EXCEPTION_500_ROUTE_NAME, children: [] },
  { name: 'login', children: [] },
  { name: 'register', children: [] },
  { name: 'forgot-password', children: [] },
  { name: 'reset-password', children: [] },
];

export const NOT_FOUND = {
  name: 'notFound',
};

export const REDIRECT_ROUTE_NAME = 'Redirect';

export const DEFAULT_ROUTE_NAME = 'DashboardWorkplace';

export const DEFAULT_ROUTE = {
  title: 'menu.dashboard.workplace',
  name: DEFAULT_ROUTE_NAME,
  fullPath: '/dashboard/workplace',
};
