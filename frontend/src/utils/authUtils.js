export const AUTH_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  ROLE: 'role',
};

export const getToken = () => localStorage.getItem(AUTH_KEYS.TOKEN);
export const getRefreshToken = () => localStorage.getItem(AUTH_KEYS.REFRESH_TOKEN);

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
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

export const formatOperationalDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

export const setAuth = (token, user, role, refreshToken) => {
  localStorage.setItem(AUTH_KEYS.TOKEN, token);
  localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(user));
  if (role) localStorage.setItem(AUTH_KEYS.ROLE, role);
  if (refreshToken) localStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, refreshToken);
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEYS.TOKEN);
  localStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(AUTH_KEYS.USER);
  localStorage.removeItem(AUTH_KEYS.ROLE);
};

export const isAuthenticated = () => !!getToken();