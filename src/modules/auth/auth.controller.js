const authService = require('./auth.service');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { incrementLoginAttempts } = require('../../middlewares/rateLimit.middleware');

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await authService.login(username, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    incrementLoginAttempts(req.ip);
    throw error;
  }
});

const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.userId, currentPassword, newPassword);
  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

module.exports = {
  login,
  logout,
  me,
  changePassword,
};