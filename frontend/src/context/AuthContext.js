import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set axios defaults
  axios.defaults.withCredentials = true;
  axios.defaults.baseURL = "https://doctorbooking-djbq.onrender.com";

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const path = window.location.pathname;

    if (path === "/doctor" || path === "/doctor-dashboard") {
      await checkDoctorAuth();
    } else if (path === "/admin" || path === "/admin-dashboard") {
      await checkAdminAuth();
    } else {
      setLoading(false);
    }
  };

  const checkDoctorAuth = async () => {
    try {
      const response = await axios.get("/api/doctor/me");
      if (response.data.success) {
        // 🆕 NEW: Fetch logo and clinic name separately
        const doctorData = response.data.doctor;

        // Fetch logo and clinic name
        try {
          const logoResponse = await axios.get(
            `/api/doctor/logo/${doctorData.id || doctorData.doctorId}`,
          );
          if (logoResponse.data.success) {
            doctorData.logoUrl = logoResponse.data.logoUrl;
            doctorData.clinicName = logoResponse.data.clinicName;
          }
        } catch (logoError) {
          console.log("Could not fetch logo:", logoError);
        }

        setDoctor(doctorData);
      }
    } catch (error) {
      console.log("Doctor not authenticated");
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Check Admin Auth using HttpOnly cookie (no localStorage)
  const checkAdminAuth = async () => {
    try {
      const response = await axios.get("/api/admin/verify");
      if (response.data.success) {
        setAdmin(response.data.admin);
      }
    } catch (error) {
      console.log("Admin not authenticated");
    } finally {
      setLoading(false);
    }
  };

  // Doctor Login
  const doctorLogin = async (email, password) => {
    try {
      const response = await axios.post(
        "/api/doctor/login",
        { email, password },
        { withCredentials: true }, // ← ADD THIS
      );
      if (response.data.success) {
        const doctorData = response.data.doctor;

        // Fetch logo and clinic name after login
        try {
          const logoResponse = await axios.get(
            `/api/doctor/logo/${doctorData.id || doctorData.doctorId}`,
            { withCredentials: true }, // ← ADD THIS
          );
          if (logoResponse.data.success) {
            doctorData.logoUrl = logoResponse.data.logoUrl;
            doctorData.clinicName = logoResponse.data.clinicName;
          }
        } catch (logoError) {
          console.log("Could not fetch logo:", logoError);
        }

        setDoctor(doctorData);
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  // Doctor Logout
  const doctorLogout = async () => {
    try {
      await axios.post("/api/doctor/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    setDoctor(null);
  };

  // ✅ UPDATED: Admin Login - No localStorage, cookie is set by backend
  const adminLogin = async (username, password) => {
    try {
      const response = await axios.post(
        "/api/admin/login",
        { username, password },
        { withCredentials: true }, // ← ADD THIS
      );
      if (response.data.success) {
        setAdmin(response.data.admin);
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  // ✅ UPDATED: Admin Logout - Clear cookie via backend
  const adminLogout = async () => {
    try {
      await axios.post("/api/admin/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        doctor,
        admin,
        loading,
        doctorLogin,
        doctorLogout,
        adminLogin,
        adminLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
