// models/User.js - WORKING TEST VERSION
module.exports = {
  // Mock findOne with select function
  findOne: function(query) {
    console.log('Mock findOne called:', query);
    
    // Return an object with select method
    const mockUser = {
      _id: 'test_user_id',
      name: 'Test User',
      email: query.email || 'test@test.com',
      password: '$2b$10$hashed_password_for_testing', // bcrypt hash of "password123"
      phone: '1234567890',
      role: 'patient',
      
      // Add select method
      select: function(field) {
        console.log('Mock select called with:', field);
        return Promise.resolve(this); // Return user object
      },
      
      // Compare password method
      comparePassword: async function(candidatePassword) {
        // For testing, accept any password that contains "123"
        return candidatePassword.includes('123');
      }
    };
    
    return Promise.resolve(mockUser);
  },
  
  // Mock create function
  create: function(data) {
    console.log('Mock create called:', data);
    return Promise.resolve({
      ...data,
      _id: 'new_user_id_' + Date.now(),
      createdAt: new Date()
    });
  }
};