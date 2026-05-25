import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import api from "../api/axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkDoctorAuth = useCallback(async () => {
    try {
      const response = await api.get("/doctor/me");
      if (response.data.success) {
        const doctorData = response.data.doctor;
        try {
          const logoResponse = await api.get(
            `/doctor/logo/${doctorData.id || doctorData.doctorId}`,
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
  }, []);

  const checkAdminAuth = useCallback(async () => {
    try {
      const response = await api.get("/admin/verify");
      if (response.data.success) {
        setAdmin(response.data.admin);
      }
    } catch (error) {
      console.log("Admin not authenticated");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const path = window.location.pathname;
    if (path === "/doctor" || path === "/doctor-dashboard") {
      await checkDoctorAuth();
    } else if (path === "/admin" || path === "/admin-dashboard") {
      await checkAdminAuth();
    } else {
      setLoading(false);
    }
  }, [checkDoctorAuth, checkAdminAuth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const doctorLogin = useCallback(async (email, password) => {
    try {
      const response = await api.post(
        "/doctor/login",
        { email, password },
        { withCredentials: true },
      );
      if (response.data.success) {
        const doctorData = response.data.doctor;
        try {
          const logoResponse = await api.get(
            `/doctor/logo/${doctorData.id || doctorData.doctorId}`,
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
  }, []);

  const doctorLogout = useCallback(async () => {
    try {
      await api.post("/doctor/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    setDoctor(null);
  }, []);

  const adminLogin = useCallback(async (username, password) => {
    try {
      const response = await api.post(
        "/admin/login",
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
  }, []);

  const adminLogout = useCallback(async () => {
    try {
      await api.post("/admin/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    setAdmin(null);
  }, []);

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
