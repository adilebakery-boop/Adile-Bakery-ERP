const unauthorizedResponse = (message = 'Unauthorized') => ({
  success: false,
  message: message,
  errors: []
});

const forbiddenResponse = (message = 'Forbidden') => ({
  success: false,
  message: message,
  errors: []
});

const invalidCredentialsResponse = () => ({
  success: false,
  message: 'Invalid username or password',
  errors: []
});

const accountBlockedResponse = () => ({
  success: false,
  message: 'Account is blocked. Contact administrator.',
  errors: []
});

const tokenExpiredResponse = () => ({
  success: false,
  message: 'Token has expired. Please login again.',
  errors: []
});

const invalidTokenResponse = () => ({
  success: false,
  message: 'Invalid or malformed token',
  errors: []
});

const noTokenResponse = () => ({
  success: false,
  message: 'Authentication token is required',
  errors: []
});

module.exports = {
  unauthorizedResponse,
  forbiddenResponse,
  invalidCredentialsResponse,
  accountBlockedResponse,
  tokenExpiredResponse,
  invalidTokenResponse,
  noTokenResponse
};