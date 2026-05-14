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

export const getUserId = () => {
  const user = getUser();
  return user?.id || null;
};

export const getUserBranchId = () => {
  const user = getUser();
  return user?.branchId || null;
};

export const isManagerOrAdmin = () => {
  const role = getUserRole();
  return role === 'ADMIN' || role === 'MANAGER';
};

export const getOperationalDate = () => {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }));
  const hours = et.getHours();
  if (hours < 7) {
    const d = new Date(et);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }
  return et.toISOString().split('T')[0];
};

export const formatOperationalDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

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