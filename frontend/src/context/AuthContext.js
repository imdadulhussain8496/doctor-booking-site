import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const response = await api.get("/api/doctor/me");
      if (response.data.success) {
        const doctorData = response.data.doctor;

        try {
          const logoResponse = await api.get(
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

  // ✅ UPDATED: Check Admin Auth
  const checkAdminAuth = async () => {
    try {
      const response = await api.get("/api/admin/verify");
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
      const response = await api.post(
        "/api/doctor/login",
        { email, password },
        { withCredentials: true },
      );
      if (response.data.success) {
        const doctorData = response.data.doctor;

        try {
          const logoResponse = await api.get(
            `/api/doctor/logo/${doctorData.id || doctorData.doctorId}`,
            { withCredentials: true },
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
      await api.post("/api/doctor/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    setDoctor(null);
  };

  // ✅ UPDATED: Admin Login
  const adminLogin = async (username, password) => {
    try {
      const response = await api.post(
        "/api/admin/login",
        { username, password },
        { withCredentials: true },
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

  // Admin Logout
  const adminLogout = async () => {
    try {
      await api.post("/api/admin/logout");
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