const authService = require("./auth.service");
const prisma = require("../../config/prisma");
const { asyncHandler } = require("../../middlewares/errorHandler");

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await authService.login(username, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    throw error;
  }
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.userId);
  res.json({ success: true, message: "Logged out successfully" });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res
      .status(400)
      .json({ success: false, message: "Refresh token is required" });
  }
  const result = await authService.refreshAccessToken(refreshToken);
  res.json({
    success: true,
    message: "Token refreshed successfully",
    data: result,
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      name: true,
      username: true,
      roleId: true,
      branchId: true,
      isBlocked: true,
      isActive: true,
      role: true,
      branch: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.json({
    success: true,
    data: user,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(
    req.user.userId,
    currentPassword,
    newPassword,
  );
  res.json({
    success: true,
    message: "Password changed successfully",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const targetUserId = parseInt(req.params.userId);

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, branchId: true },
  });

  if (!targetUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // RBAC: Managers can only reset passwords for users in their own branch
  if (
    req.user.role === "MANAGER" &&
    targetUser.branchId !== req.user.branchId
  ) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to reset this user's password",
      errors: [],
    });
  }

  await authService.resetPassword(targetUserId, newPassword);
  res.json({
    success: true,
    message: "Password reset successfully",
  });
});

module.exports = {
  login,
  logout,
  refresh,
  me,
  changePassword,
  resetPassword,
};
