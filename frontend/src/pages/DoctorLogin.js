// D:\Projects\DoctorBooking\frontend\src\pages\DoctorLogin.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Doctor.css";

function DoctorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { doctorLogin } = useAuth(); // ← FIXED: Changed from "login" to "doctorLogin"
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cleanedPassword = password.trim();

      console.log("🔐 Doctor login attempt:", email);
      console.log("Password length:", cleanedPassword.length);
      console.log("doctorLogin function:", doctorLogin);

      const result = await doctorLogin(email.trim(), cleanedPassword);

      console.log("Login result:", result);

      if (result.success) {
        console.log("✅ Success! Navigating to dashboard...");
        window.location.href = "/doctor-dashboard";
      } else {
        console.log("❌ Failed:", result.message);
        setError(result.message || "Invalid email or password");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="doctor-login-container">
      <div className="doctor-login-card">
        <div className="doctor-login-header">
          <span className="doctor-icon">👨‍⚕️</span>
          <h1>Doctor Online</h1>
          <p>Doctor Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="doctor-login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@example.com"
              required
            />
          </div>

          <div className="form-group password-field">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            <small className="password-hint">
              Password is case sensitive • {password.length} characters
            </small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="doctor-login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Access Dashboard"}
          </button>
        </form>

        <div className="back-to-home">
          <a href="/">← Back to Patient Booking</a>
        </div>
      </div>
    </div>
  );
}

export default DoctorLogin;
