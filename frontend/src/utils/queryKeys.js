// Query Key Registry — v2.0 (Phase 5)
// ALL query keys must be defined here. No inline keys allowed.

export const queryKeys = {
  branches: {
    all: ['branches'],
    byId: (id) => ['branches', id],
    active: (filters = {}) => ['branches', 'active', filters],
  },
  products: {
    all: ['products'],
    byId: (id) => ['products', id],
    list: (filters = {}) => ['products', 'list', filters],
    deleted: (filters = {}) => ['products', 'deleted', filters],
    categories: (filters = {}) => ['products', 'categories', filters],
  },
  dashboard: {
    overview: (branchId, date) => ['dashboard', 'overview', branchId, date],
    activity: (branchId, date, limit) => ['dashboard', 'activity', branchId, date, limit],
  },
  inventory: {
    production: {
      grouped: (branchId, filters = {}) => ['inventory', 'production', branchId, 'grouped', filters],
    },
    remaining: {
      entries: (branchId, date, filters = {}) => ['inventory', 'remaining', branchId, date, filters],
    },
  },
  reports: {
    daily: (branchId, date, filters = {}) => ['reports', 'daily', branchId, date, filters],
    weekly: (branchId, date, filters = {}) => ['reports', 'weekly', branchId, date, filters],
    monthly: (branchId, date, filters = {}) => ['reports', 'monthly', branchId, date, filters],
    yearly: (branchId, date, filters = {}) => ['reports', 'yearly', branchId, date, filters],
  },
  waste: {
    all: ['waste'],
    list: (filters = {}) => ['waste', 'list', filters],
    byId: (id) => ['waste', id],
  },
  users: {
    list: (filters = {}) => ['users', 'list', filters],
    byId: (id) => ['users', id],
  },
};
