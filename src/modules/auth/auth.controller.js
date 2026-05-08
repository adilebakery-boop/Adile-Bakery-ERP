const authService = require('./auth.service');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid credentials',
    });
  }
};

module.exports = {
  login,
};