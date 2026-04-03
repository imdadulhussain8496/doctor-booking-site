// middleware/authMiddleware.js - TEST VERSION (NO AUTH CHECK)
exports.protect = async (req, res, next) => {
  console.log('🟡 Auth bypassed for testing');
  
  // Create a mock user object
  req.user = {
    id: 'user_id_123',
    name: 'Test Patient',
    email: 'test@test.com',
    role: 'patient'
  };
  
  next(); // Always continue
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('🟡 Role check bypassed');
    next(); // Always allow
  };
};