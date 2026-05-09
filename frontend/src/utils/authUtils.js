export const AUTH_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  ROLE: 'role',
};

export const getToken = () => localStorage.getItem(AUTH_KEYS.TOKEN);

export const getUser = () => {
  const userStr = localStorage.getItem(AUTH_KEYS.USER);
  return userStr ? JSON.parse(userStr) : null;
};

export const getUserRole = () => localStorage.getItem(AUTH_KEYS.ROLE);

export const setAuth = (token, user, role) => {
  localStorage.setItem(AUTH_KEYS.TOKEN, token);
  localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(user));
  if (role) localStorage.setItem(AUTH_KEYS.ROLE, role);
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEYS.TOKEN);
  localStorage.removeItem(AUTH_KEYS.USER);
  localStorage.removeItem(AUTH_KEYS.ROLE);
};

export const isAuthenticated = () => !!getToken();