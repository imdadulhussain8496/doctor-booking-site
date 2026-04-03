// D:\Projects\DoctorBooking\frontend\src\pages\AdminLogin.js
import React, { useState } from 'react';
import axios from 'axios';
import './Admin.css';

function AdminLogin({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:5000/api/admin/login', {
                username,
                password
            });

            if (response.data.success) {
                onLogin(response.data.admin);
            }
        } catch (error) {
            setError('Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-card">
                <div className="admin-login-header">
                    <span className="admin-icon">👨‍💼</span>
                    <h1>Doctor Online</h1>
                    <p>Healthcare Center Portal</p>
                </div>

                <form onSubmit={handleSubmit} className="admin-login-form">
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button 
                        type="submit" 
                        className="admin-login-btn"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login to Dashboard'}
                    </button>

                    <div className="demo-credentials">
                        <p><strong>Demo Credentials:</strong></p>
                        <p>Username: <code>admin</code></p>
                        <p>Password: <code>doctor2026</code></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminLogin;
