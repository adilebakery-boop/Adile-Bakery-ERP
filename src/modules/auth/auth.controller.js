const authService = require('./auth.service');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
        errors: [],
      });
    }
    
    const result = await authService.login(username, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    
    if (error.code === 'VALIDATION') {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: [],
      });
    }
    
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid credentials',
      errors: [],
    });
  }
};

module.exports = {
  login,
};