export function normalizeResponse(response) {
  return {
    success: true,
    data: response.data?.data,
    message: response.data?.message,
    count: response.data?.count,
    status: response.status,
  };
}

export function normalizeError(error) {
  if (error.response) {
    return {
      success: false,
      message: error.response.data?.message || 'Server error occurred',
      errors: error.response.data?.errors || [],
      status: error.response.status,
    };
  }
  if (error.request) {
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      errors: [],
      status: 0,
    };
  }
  return {
    success: false,
    message: error.message || 'An unexpected error occurred',
    errors: [],
    status: 0,
  };
}

export async function safeCall(apiCall) {
  try {
    const response = await apiCall;
    return normalizeResponse(response);
  } catch (error) {
    return normalizeError(error);
  }
}