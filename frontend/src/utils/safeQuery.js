// Adapter: unwraps safeCall response for React Query.
// Services return { success, data, message } via safeCall.
// React Query expects promises to resolve with data or reject with error.

export async function unwrap(serviceCall) {
  const result = await serviceCall;
  if (!result.success) {
    const error = new Error(result.message || 'Request failed');
    error.status = result.status;
    error.errors = result.errors || [];
    throw error;
  }
  return result.data;
}
