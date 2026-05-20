const ERROR_MESSAGES = {
  0: 'Network error. Please check your connection.',
  400: 'Invalid request. Please check your input.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  422: 'Validation failed. Please check your input.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable.',
  503: 'Service temporarily unavailable.',
  504: 'Request timeout. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT: 'Request timed out. Please try again.',
};

export function formatError(error) {
  if (!error) {
    return {
      success: false,
      message: 'An unexpected error occurred',
      status: 0,
      type: 'unknown',
    };
  }

  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    return {
      success: false,
      message: data?.message || ERROR_MESSAGES[status] || 'An error occurred',
      status,
      type: getErrorType(status),
      errors: data?.errors || [],
    };
  }

  if (error.request) {
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        message: ERROR_MESSAGES.TIMEOUT,
        status: 0,
        type: 'timeout',
      };
    }
    return {
      success: false,
      message: ERROR_MESSAGES.NETWORK_ERROR,
      status: 0,
      type: 'network',
    };
  }

  return {
    success: false,
    message: error.message || 'An unexpected error occurred',
    status: 0,
    type: 'unknown',
  };
}

function getErrorType(status) {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status >= 500) return 'serverError';
  if (status >= 400) return 'clientError';
  return 'unknown';
}

export function shouldRedirectToLogin(error) {
  return error?.status === 401 || error?.type === 'unauthorized';
}

export function shouldShowRetryButton(error) {
  if (!error) return true;
  const retryableTypes = ['network', 'timeout', 'serverError'];
  return retryableTypes.includes(error.type) || error.status >= 500;
}

export function isNetworkError(error) {
  return error?.type === 'network' || error?.status === 0;
}

export function isAuthError(error) {
  return error?.status === 401 || error?.status === 403;
}

export function logError(context, error) {
  console.error(`[Error] ${context}:`, error);
  if (import.meta.env.DEV) {
    console.trace();
  }
}