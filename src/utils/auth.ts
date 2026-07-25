const TOKEN_KEY = 'token';

const isLogin = () => {
  return !!localStorage.getItem(TOKEN_KEY);
};

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const listenForTokenChanges = () => {
  window.addEventListener('storage', (event) => {
    if (event.storageArea === localStorage && event.key === TOKEN_KEY && event.oldValue !== event.newValue) {
      window.location.reload();
    }
  });
};

export { isLogin, getToken, setToken, clearToken, listenForTokenChanges };
