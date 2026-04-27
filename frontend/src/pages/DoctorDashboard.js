// D:\Projects\DoctorBooking\frontend\src\pages\DoctorDashboard.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Doctor.css";

function DoctorDashboard() {
  const { doctor, logout, loading } = useAuth(); // ← ADD THIS LINE (MOST IMPORTANT)
  const navigate = useNavigate(); // ← ADD THIS LINE
  const doctorId = doctor?.id || doctor?.doctorId || doctor?._id;

  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    pendingVerification: 0,
    totalEarnings: 0,
    todayAppointments: 0,
    upcomingCount: 0,
  });
  const [upiId, setUpiId] = useState(doctor?.upiId || "");
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showPayCommissionModal, setShowPayCommissionModal] = useState(false);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [commissionData, setCommissionData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [patients, setPatients] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showNotification, setShowNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  // Logo upload states
  const [doctorLogo, setDoctorLogo] = useState(doctor?.logoUrl || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Settings Menu states
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Individual Modals
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showUpiSettingsModal, setShowUpiSettingsModal] = useState(false);
  const [tempUpiId, setTempUpiId] = useState(doctor?.upiId || "");
  const [updatingUpi, setUpdatingUpi] = useState(false);

  // Commission Payment States
  const [paymentTransactionId, setPaymentTransactionId] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientEmail, setSelectedPatientEmail] = useState(null);
  const [selectedPatientName, setSelectedPatientName] = useState(null);

  // Availability State
  const [availability, setAvailability] = useState({
    monday: { start: "09:00", end: "17:00", enabled: true },
    tuesday: { start: "09:00", end: "17:00", enabled: true },
    wednesday: { start: "09:00", end: "17:00", enabled: true },
    thursday: { start: "09:00", end: "17:00", enabled: true },
    friday: { start: "09:00", end: "17:00", enabled: true },
    saturday: { start: "09:00", end: "17:00", enabled: true },
    sunday: { start: "09:00", end: "17:00", enabled: false },
  });

  // Lunch Break State
  const [lunchBreak, setLunchBreak] = useState({
    enabled: false,
    start: "13:00",
    end: "14:00",
  });

  // 🆕 Status Toggle States
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isActive, setIsActive] = useState(doctor?.isActive ?? true);

  // Set axios defaults for cookies
  axios.defaults.withCredentials = true;
  axios.defaults.baseURL = "https://doctorbooking-djbq.onrender.com";
  console.log(
    "✅ DoctorDashboard API Base URL set to:",
    axios.defaults.baseURL,
  );

  useEffect(() => {
    if (!loading && !doctor) {
      navigate("/doctor-login");
    }
  }, [doctor, loading, navigate]);

  useEffect(() => {
    if (doctor && doctorId) {
      console.log("🔍 Doctor from context:", doctor);
      console.log("🔍 doctor.isActive value:", doctor?.isActive);

      fetchAllData();
      fetchAvailability();
      fetchPaymentHistory();
      fetchDoctorLogo();
      fetchMedicalRecords();
      setTempUpiId(doctor?.upiId || "");
      setUpiId(doctor?.upiId || "");
      setIsActive(doctor?.isActive ?? true);
    }
  }, [doctor, doctorId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSettingsMenu && !e.target.closest(".settings-menu-container")) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showSettingsMenu]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/doctor-login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Save doctor active status (saves whatever is selected in modal)
  const saveDoctorStatus = async () => {
    setProcessingPayment(true);

    try {
      console.log(`💾 Saving status: ${isActive ? "Active" : "Inactive"}`);

      const response = await axios.patch(
        `/api/doctor/toggle-status/${doctorId}`,
        { isActive: isActive },
      );

      if (response.data.success) {
        if (doctor) doctor.isActive = isActive;

        localStorage.setItem("statusChanged", Date.now().toString());

        showNotificationMsg(
          isActive
            ? "✅ You are now Active - Patients can book appointments"
            : "🔴 You are now Inactive - Patients cannot book appointments",
          "success",
        );
        setShowStatusModal(false);
      } else {
        showNotificationMsg("❌ Failed to update status", "error");
      }
    } catch (error) {
      console.error("Error saving status:", error);
      showNotificationMsg("❌ Failed to update status", "error");
    } finally {
      setProcessingPayment(false);
    }
  };

  // ✅ FIXED: Fetch doctor logo - NO localhost prefix
  const fetchDoctorLogo = async () => {
    if (!doctorId) return;
    try {
      const response = await axios.get(`/api/doctor/logo/${doctorId}`);
      if (response.data.success && response.data.logoUrl) {
        setDoctorLogo(response.data.logoUrl + "?t=" + Date.now());
      }
    } catch (error) {
      console.error("Error fetching logo:", error);
    }
  };

  // ✅ FIXED: Upload doctor logo - NO localhost prefix
  const uploadDoctorLogo = async () => {
    console.log("🚀 Upload function called");
    console.log("Selected file:", selectedLogoFile);

    if (!selectedLogoFile) {
      showNotificationMsg("Please select an image file", "error");
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("logo", selectedLogoFile);

    try {
      console.log(
        "📤 Sending upload request to:",
        `/api/doctor/upload-logo/${doctorId}`,
      );
      const response = await axios.post(
        `/api/doctor/upload-logo/${doctorId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      console.log("📥 Upload response:", response.data);

      if (response.data.success) {
        setDoctorLogo(response.data.logoUrl + "?t=" + Date.now());
        showNotificationMsg("✅ Logo updated successfully!", "success");
        setShowLogoModal(false);
        setSelectedLogoFile(null);
        setLogoPreview(null);
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      showNotificationMsg(
        error.response?.data?.message || "❌ Failed to upload logo",
        "error",
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  // ✅ FIXED: Helper function to get logo source
  const getLogoSrc = () => {
    const logo = doctorLogo || doctor?.logoUrl;
    if (logo && logo.startsWith("https://res.cloudinary.com")) {
      return logo;
    }
    return "https://img.icons8.com/color/96/000000/doctor-male.png";
  };

  const updateUpiId = async () => {
    console.log("🚀 Update UPI called");
    if (!tempUpiId) {
      showNotificationMsg("Please enter UPI ID", "error");
      return;
    }
    setUpdatingUpi(true);
    try {
      const response = await axios.patch(`/api/doctor/${doctorId}/upi`, {
        upiId: tempUpiId,
      });
      if (response.data.success) {
        doctor.upiId = tempUpiId;
        setUpiId(tempUpiId);
        showNotificationMsg("✅ UPI ID updated successfully!", "success");
        setShowUpiSettingsModal(false);
      }
    } catch (error) {
      console.error("Update error:", error);
      showNotificationMsg("❌ Failed to update UPI ID", "error");
    } finally {
      setUpdatingUpi(false);
    }
  };

  const fetchAllData = async () => {
    setDataLoading(true);
    await Promise.all([
      fetchAppointments(),
      fetchStats(),
      fetchCommission(),
      fetchPatients(),
      fetchMedicalRecords(),
    ]);
    setDataLoading(false);
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get(
        `/api/doctor/payment-history/${doctorId}`,
      );
      if (response.data.success) {
        setPaymentHistory(response.data.payments || []);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`/api/doctor/appointments/${doctorId}`);
      if (response.data.success) {
        setAppointments(response.data.appointments);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`/api/doctor/dashboard/${doctorId}`);
      if (response.data.success) {
        setStats({
          totalAppointments: response.data.stats.totalAppointments || 0,
          completedAppointments: response.data.stats.completedAppointments || 0,
          pendingVerification: response.data.stats.pendingVerification || 0,
          totalEarnings: response.data.stats.totalEarnings || 0,
          todayAppointments: response.data.stats.todayAppointments || 0,
          upcomingCount: response.data.stats.upcomingCount || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchCommission = async () => {
    try {
      const response = await axios.get(`/api/doctor/${doctorId}/commission`);
      if (response.data.success) {
        setCommissionData(response.data);
      }
    } catch (error) {
      console.error("Error fetching commission:", error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`/api/doctor/patients/${doctorId}`);
      if (response.data.success) {
        setPatients(response.data.patients);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const response = await axios.get(`/api/upload/doctor/${doctorId}`);
      if (response.data.success) {
        setMedicalRecords(response.data.records);
      }
    } catch (error) {
      console.error("Error fetching medical records:", error);
    }
  };

  const uploadMedicalRecord = async () => {
    let patientEmail, patientName, patientPhone;

    // Check if patient is already selected from Patients tab
    if (selectedPatientEmail) {
      // Use selected patient from state
      patientEmail = selectedPatientEmail;
      patientName = selectedPatientName;
      patientPhone = "";
    } else {
      // Get from dropdown
      const patientSelect = document.getElementById("patientSelect");
      const patientValue = patientSelect?.value;

      if (!patientValue) {
        showNotificationMsg("Please select a patient", "error");
        return;
      }

      let patientData;
      try {
        patientData = JSON.parse(patientValue);
      } catch (e) {
        showNotificationMsg("Invalid patient selection", "error");
        return;
      }

      patientEmail = patientData.email;
      patientName = patientData.name;
      patientPhone = patientData.phone || "";
    }

    const title = document.getElementById("recordTitle")?.value;
    const fileType = document.getElementById("fileType")?.value;
    const description = document.getElementById("recordDesc")?.value;
    const file = document.getElementById("recordFile")?.files[0];

    if (!title) {
      showNotificationMsg("Please enter record title", "error");
      return;
    }
    if (!file) {
      showNotificationMsg("Please select a file", "error");
      return;
    }

    const formData = new FormData();
    formData.append("patientEmail", patientEmail);
    formData.append("patientName", patientName);
    formData.append("patientPhone", patientPhone);
    formData.append("doctorName", doctor?.name || "");
    formData.append("doctorId", doctorId);
    formData.append("doctorEmail", doctor?.email || "");
    formData.append("fileType", fileType);
    formData.append("title", title);
    formData.append("description", description || "");
    formData.append("file", file);

    try {
      const response = await axios.post("/api/upload/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        showNotificationMsg(
          "✅ Medical record uploaded successfully!",
          "success",
        );

        // Clear form fields
        if (!selectedPatientEmail) {
          document.getElementById("patientSelect").value = "";
        }
        document.getElementById("recordTitle").value = "";
        document.getElementById("recordDesc").value = "";
        document.getElementById("recordFile").value = "";

        fetchMedicalRecords();
      }
    } catch (error) {
      console.error("Upload error:", error);
      showNotificationMsg(
        error.response?.data?.message || "❌ Failed to upload record",
        "error",
      );
    }
  };

  // ============================================
  // ✅ DELETE MEDICAL RECORD FUNCTION
  // ============================================
  const deleteRecord = async (recordId) => {
    if (
      !window.confirm(
        "⚠️ Are you sure you want to delete this medical record?\n\nThis action cannot be undone!",
      )
    ) {
      return;
    }

    try {
      const response = await axios.delete(`/api/upload/record/${recordId}`);
      if (response.data.success) {
        showNotificationMsg(
          "✅ Medical record deleted successfully",
          "success",
        );
        fetchMedicalRecords(); // Refresh the list
      }
    } catch (error) {
      console.error("Delete error:", error);
      showNotificationMsg("❌ Failed to delete record", "error");
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await axios.get(`/api/availability/${doctorId}`);
      if (response.data.success) {
        const apiAvailability = response.data.availability;
        if (apiAvailability && apiAvailability.weeklySchedule) {
          const newAvailability = {
            monday: { start: "09:00", end: "17:00", enabled: false },
            tuesday: { start: "09:00", end: "17:00", enabled: false },
            wednesday: { start: "09:00", end: "17:00", enabled: false },
            thursday: { start: "09:00", end: "17:00", enabled: false },
            friday: { start: "09:00", end: "17:00", enabled: false },
            saturday: { start: "09:00", end: "17:00", enabled: false },
            sunday: { start: "09:00", end: "17:00", enabled: false },
          };
          apiAvailability.weeklySchedule.forEach((schedule) => {
            const days = [
              "sunday",
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
            ];
            const dayName = days[schedule.day];
            if (dayName && schedule.timeRanges && schedule.timeRanges[0]) {
              newAvailability[dayName] = {
                start: schedule.timeRanges[0].start,
                end: schedule.timeRanges[0].end,
                enabled: schedule.isAvailable,
              };
            }
          });
          setAvailability(newAvailability);
        }
      }
    } catch (error) {
      console.log("Availability API not ready, using default schedule");
    }
  };

  const updateAvailability = async () => {
    try {
      const daysMap = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const weeklySchedule = [];

      for (const [dayName, data] of Object.entries(availability)) {
        const day = daysMap[dayName];
        if (day !== undefined) {
          // Create breaks array if lunch is enabled
          const breaks = [];
          if (lunchBreak.enabled && data.enabled) {
            breaks.push({
              start: lunchBreak.start,
              end: lunchBreak.end,
              reason: "Lunch",
            });
          }

          weeklySchedule.push({
            day,
            isAvailable: data.enabled,
            timeRanges: data.enabled
              ? [{ start: data.start, end: data.end }]
              : [],
            breaks: breaks, // ← Sending breaks to backend
          });
        }
      }

      console.log("📤 Saving schedule with breaks:", weeklySchedule);

      const response = await axios.put(`/api/availability/${doctorId}/weekly`, {
        weeklySchedule,
      });

      if (response.data.success) {
        showNotificationMsg(
          "✅ Availability updated with lunch break!",
          "success",
        );
      }
    } catch (error) {
      console.error("Error saving availability:", error);
      showNotificationMsg("❌ Failed to save availability", "error");
    }
  };

  const verifyPayment = async (appointmentId) => {
    try {
      const response = await axios.post(`/api/doctor/verify/${appointmentId}`, {
        doctorId: doctorId,
      });
      if (response.data.success) {
        showNotificationMsg("✅ Payment verified successfully!", "success");
        fetchAppointments();
        fetchStats();
        setLastUpdated(new Date());
      } else {
        showNotificationMsg(
          response.data.message || "❌ Verification failed",
          "error",
        );
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      showNotificationMsg(
        error.response?.data?.message || "❌ Failed to verify payment",
        "error",
      );
    }
  };

  const completeAppointment = async (appointmentId) => {
    try {
      const response = await axios.patch(
        `/api/doctor/appointments/${appointmentId}`,
        { status: "completed" },
      );
      if (response.data.success) {
        showNotificationMsg("✅ Appointment marked as completed!", "success");
        fetchAppointments();
        fetchStats();
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error completing appointment:", error);
      showNotificationMsg("❌ Failed to complete appointment", "error");
    }
  };

  const rejectAppointment = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to reject this appointment?"))
      return;
    try {
      const response = await axios.patch(`/api/doctor/reject/${appointmentId}`);
      if (response.data.success) {
        showNotificationMsg("❌ Appointment rejected!", "error");
        fetchAppointments();
        fetchStats();
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error rejecting appointment:", error);
      showNotificationMsg("❌ Failed to reject appointment", "error");
    }
  };

  const payCommission = async () => {
    if (!paymentTransactionId) {
      showNotificationMsg("Please enter transaction ID", "error");
      return;
    }
    setProcessingPayment(true);
    try {
      const response = await axios.post(`/api/doctor/pay-commission`, {
        doctorId: doctorId,
        amount: commissionData?.due || 0,
        transactionId: paymentTransactionId,
      });
      if (response.data.success) {
        showNotificationMsg(
          "✅ Payment successful! Commission paid.",
          "success",
        );
        setPaymentTransactionId("");
        setShowPayCommissionModal(false);
        fetchCommission();
        fetchPaymentHistory();
        setLastUpdated(new Date());
      } else {
        showNotificationMsg(
          response.data.message || "❌ Payment failed",
          "error",
        );
      }
    } catch (error) {
      console.error("Payment error:", error);
      showNotificationMsg(
        error.response?.data?.message || "❌ Payment failed",
        "error",
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleFilter = async () => {
    setDataLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== "all")
        params.append("status", filterStatus);
      if (filterDate) params.append("date", filterDate);
      const response = await axios.get(
        `/api/doctor/appointments/${doctorId}?${params}`,
      );
      if (response.data.success) {
        setAppointments(response.data.appointments);
        showNotificationMsg("Filters applied!", "success");
      }
    } catch (error) {
      console.error("Error filtering appointments:", error);
      showNotificationMsg("Failed to apply filters", "error");
    } finally {
      setDataLoading(false);
    }
  };

  const showNotificationMsg = (message, type) => {
    setShowNotification({ show: true, message, type });
    setTimeout(
      () => setShowNotification({ show: false, message: "", type: "" }),
      3000,
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments.filter(
    (apt) => apt.appointmentDate === today,
  );
  const upcomingAppointments = appointments.filter(
    (apt) => apt.appointmentDate > today && apt.status !== "cancelled",
  );
  const pendingAppointments = appointments.filter(
    (apt) => apt.status === "pending_verification",
  );
  const filteredAppointments = appointments.filter((apt) => {
    if (filterStatus !== "all" && apt.status !== filterStatus) return false;
    if (filterDate && apt.appointmentDate !== filterDate) return false;
    return true;
  });

  // Filter patients based on search query
  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true; // ← add .trim() here
    const query = searchQuery.trim().toLowerCase(); // ← add .trim() here
    return (
      patient.name?.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.phone?.includes(query)
    );
  });

  // Filter records based on selected patient
  const filteredRecords = selectedPatientEmail
    ? medicalRecords.filter(
        (record) => record.patientEmail === selectedPatientEmail,
      )
    : medicalRecords;

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    {
      id: "verify",
      label: "Verify Payment",
      icon: "✅",
      badge: pendingAppointments.length,
    },
    { id: "appointments", label: "Appointments", icon: "📅" },
    { id: "patients", label: "My Patients", icon: "👥" },
    { id: "availability", label: "Availability", icon: "⏰" },
    { id: "records", label: "Medical Records", icon: "📄" },
    { id: "earnings", label: "Earnings", icon: "💰" },
    { id: "paymentHistory", label: "Payment History", icon: "📜" },
    { id: "commissionReport", label: "Commission Report", icon: "💰" },
  ];

  return (
    <div className="doctor-dashboard">
      {showNotification.show && (
        <div className={`notification ${showNotification.type}`}>
          {showNotification.message}
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="mobile-top-header">
        <div className="mobile-top-header-content">
          <div className="mobile-logo">
            <img
              src={getLogoSrc()}
              alt="Clinic Logo"
              className="mobile-logo-img"
              style={{ cursor: "pointer" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://img.icons8.com/color/96/000000/doctor-male.png";
              }}
            />
          </div>
          <button
            className="mobile-menu-icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>
      </div>

      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        ☰
      </button>

      {/* LEFT SIDEBAR */}
      <div className={`doctor-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <img
            src={getLogoSrc()}
            alt="Clinic Logo"
            className="sidebar-logo-img"
            style={{ cursor: "pointer" }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "https://img.icons8.com/color/96/000000/doctor-male.png";
            }}
          />
        </div>

        <div className="sidebar-profile">
          <div className="sidebar-profile-inline">
            <img
              src={
                doctor?.imageUrl ||
                "https://img.icons8.com/color/96/000000/doctor-male.png"
              }
              alt={doctor?.name}
              className="sidebar-avatar-small"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://img.icons8.com/color/96/000000/doctor-male.png";
              }}
            />
            <div className="sidebar-doctor-name">{doctor?.name}</div>
          </div>
        </div>

        <div className="sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`sidebar-nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab.id);
                setMobileMenuOpen(false);
              }}
            >
              <span className="sidebar-nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="sidebar-nav-badge">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Footer - Settings Menu and Logout */}
        <div className="sidebar-footer">
          {commissionData?.due > 0 && (
            <button
              className="sidebar-btn sidebar-btn-pay"
              onClick={() => setShowPayCommissionModal(true)}
            >
              💰 Pay Commission (₹{commissionData.due})
            </button>
          )}

          {/* Settings Menu Container */}
          <div className="settings-menu-container">
            <button
              className="sidebar-btn sidebar-btn-settings"
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsMenu(!showSettingsMenu);
              }}
            >
              ⚙️ Settings
            </button>

            {/* Settings Dropdown Menu */}
            {showSettingsMenu && (
              <div className="settings-dropdown-menu">
                <div
                  className="settings-menu-item"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    setShowLogoModal(true);
                  }}
                >
                  <span className="menu-icon">📷</span>
                  <span>Change Logo</span>
                </div>
                <div
                  className="settings-menu-item"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    setShowUpiSettingsModal(true);
                  }}
                >
                  <span className="menu-icon">💳</span>
                  <span>UPI Payment Settings</span>
                </div>
                {/* 🆕 Status Toggle Menu Item */}
                <div
                  className="settings-menu-item"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    setShowStatusModal(true);
                  }}
                >
                  <span className="menu-icon">{isActive ? "🟢" : "🔴"}</span>
                  <span>Status: {isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
            )}
          </div>

          <button
            className="sidebar-btn sidebar-btn-danger"
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      <div
        className={`sidebar-overlay ${mobileMenuOpen ? "active" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      {/* MAIN CONTENT */}
      <div className="doctor-main-content">
        {/* LOGO UPLOAD MODAL */}
        {showLogoModal && (
          <div
            className="modal-overlay"
            onClick={() => {
              setShowLogoModal(false);
              setSelectedLogoFile(null);
              setLogoPreview(null);
            }}
          >
            <div
              className="modal-content logo-upload-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "500px" }}
            >
              <div className="modal-header">
                <h2>📷 Change Clinic Logo</h2>
                <button
                  className="close-btn"
                  onClick={() => {
                    setShowLogoModal(false);
                    setSelectedLogoFile(null);
                    setLogoPreview(null);
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <h3>Current Logo</h3>
                  <img
                    src={getLogoSrc()}
                    alt="Current logo"
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "3px solid #4CAF50",
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://img.icons8.com/color/96/000000/doctor-male.png";
                    }}
                  />
                </div>

                <div className="upload-section">
                  <h3>Upload New Logo</h3>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // ✅ SIZE VALIDATION
                        const MAX_SIZE = 200 * 1024; // 200KB
                        const MIN_SIZE = 5 * 1024; // 5KB

                        if (file.size > MAX_SIZE) {
                          showNotificationMsg(
                            `Logo too large! Maximum ${MAX_SIZE / 1024}KB. Your file: ${(file.size / 1024).toFixed(0)}KB`,
                            "error",
                          );
                          e.target.value = "";
                          return;
                        }

                        if (file.size < MIN_SIZE) {
                          showNotificationMsg(
                            `File too small! Minimum ${MIN_SIZE / 1024}KB. Your file: ${(file.size / 1024).toFixed(0)}KB`,
                            "error",
                          );
                          e.target.value = "";
                          return;
                        }

                        setSelectedLogoFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setLogoPreview(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "2px dashed #e2e8f0",
                      borderRadius: "12px",
                      cursor: "pointer",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "8px",
                    }}
                  >
                    Recommended: Square image, max 200KB (JPG, PNG, GIF, WebP)
                  </p>
                </div>

                {logoPreview && (
                  <div style={{ textAlign: "center", marginTop: "15px" }}>
                    <p>
                      <strong>Preview:</strong>
                    </p>
                    <img
                      src={logoPreview}
                      alt="Preview"
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}

                <button
                  className="upload-logo-btn"
                  onClick={uploadDoctorLogo}
                  disabled={!selectedLogoFile || uploadingLogo}
                  style={{
                    background: "#4CAF50",
                    color: "white",
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "8px",
                    cursor: uploadingLogo ? "not-allowed" : "pointer",
                    marginTop: "15px",
                    width: "100%",
                    fontWeight: "600",
                  }}
                >
                  {uploadingLogo ? "Uploading..." : "📤 Upload New Logo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UPI SETTINGS MODAL */}
        {showUpiSettingsModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowUpiSettingsModal(false)}
          >
            <div
              className="modal-content upi-settings-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "450px" }}
            >
              <div className="modal-header">
                <h2>💳 UPI Payment Settings</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowUpiSettingsModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="upi-current-settings">
                  <label className="settings-label">Current UPI ID:</label>
                  <div className="current-upi-display">
                    {doctor?.upiId || "Not Set"}
                  </div>
                </div>

                <div className="upi-update-settings">
                  <label className="settings-label">New UPI ID:</label>
                  <input
                    type="text"
                    value={tempUpiId}
                    onChange={(e) => setTempUpiId(e.target.value)}
                    placeholder="Enter UPI ID (e.g., name@okhdfcbank)"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      marginBottom: "10px",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#666",
                      marginBottom: "15px",
                    }}
                  >
                    This UPI ID will be used to receive payments from patients
                  </p>
                  <button
                    className="update-upi-btn"
                    onClick={updateUpiId}
                    disabled={updatingUpi}
                    style={{
                      background: "#3b82f6",
                      color: "white",
                      padding: "12px 20px",
                      border: "none",
                      borderRadius: "8px",
                      cursor: updatingUpi ? "not-allowed" : "pointer",
                      width: "100%",
                      fontWeight: "600",
                    }}
                  >
                    {updatingUpi ? "Updating..." : "💳 Update UPI ID"}
                  </button>
                </div>

                {/* QR Code Preview */}
                <div
                  className="qr-preview-section"
                  style={{ marginTop: "20px", textAlign: "center" }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "10px",
                    }}
                  >
                    Your Payment QR Code
                  </p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${doctor?.upiId || tempUpiId || "doctor@okhdfcbank"}&pn=Doctor&cu=INR`}
                    alt="QR Code"
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 STATUS MODAL */}
        {showStatusModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowStatusModal(false)}
          >
            <div
              className="modal-content status-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>📋 Practice Status</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowStatusModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="status-options">
                  <div
                    className={`status-option ${isActive === true ? "active" : ""}`}
                    onClick={() => setIsActive(true)} // ← ADD THIS LINE
                  >
                    <div className="status-option-icon">🟢</div>
                    <div className="status-option-content">
                      <h4>Active</h4>
                      <p>
                        Accepting new appointments - Patients can book online
                      </p>
                    </div>
                    {isActive === true && <div className="status-check">✓</div>}
                  </div>

                  <div
                    className={`status-option ${isActive === false ? "active" : ""}`}
                    onClick={() => setIsActive(false)} // ← ADD THIS LINE
                  >
                    <div className="status-option-icon">🔴</div>
                    <div className="status-option-content">
                      <h4>Inactive</h4>
                      <p>Clinic closed - Patients cannot book appointments</p>
                    </div>
                    {isActive === false && (
                      <div className="status-check">✓</div>
                    )}
                  </div>
                </div>

                <div className="status-note">
                  <p>ℹ️ When Inactive:</p>
                  <ul>
                    <li>Your profile will show "Currently Unavailable"</li>
                    <li>Patients cannot book new appointments</li>
                    <li>Existing appointments remain active</li>
                  </ul>
                </div>

                <button className="save-status-btn" onClick={saveDoctorStatus}>
                  Save Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pay Commission Modal */}
        {showPayCommissionModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowPayCommissionModal(false)}
          >
            <div
              className="modal-content pay-commission-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>💰 Pay Commission</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowPayCommissionModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="due-amount-card">
                  <span>Amount Due:</span>
                  <strong>₹{commissionData?.due || 0}</strong>
                </div>
                <div className="platform-upi">
                  <span>Platform UPI ID:</span>
                  <code>
                    {commissionData?.platformUpiId || "platform@okhdfcbank"}
                  </code>
                  <button
                    className="copy-upi-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        commissionData?.platformUpiId || "platform@okhdfcbank",
                      );
                      showNotificationMsg("UPI ID copied!", "success");
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="payment-steps">
                  <h4>Payment Instructions:</h4>
                  <ol>
                    <li>Copy UPI ID above or scan QR code</li>
                    <li>Pay ₹{commissionData?.due || 0} to the platform UPI</li>
                    <li>Enter transaction ID below</li>
                    <li>Click "Confirm Payment"</li>
                  </ol>
                  <button
                    className="show-qr-btn"
                    onClick={() => setShowPaymentQR(!showPaymentQR)}
                  >
                    {showPaymentQR ? "Hide QR Code" : "Show QR Code"}
                  </button>
                </div>
                {showPaymentQR && (
                  <div className="qr-code-section">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${commissionData?.platformUpiId || "platform@okhdfcbank"}&am=${commissionData?.due || 0}&pn=Doctor%20Online&cu=INR`}
                      alt="Payment QR Code"
                    />
                    <p>Scan to pay ₹{commissionData?.due || 0}</p>
                  </div>
                )}
                <div className="payment-form">
                  <input
                    type="text"
                    placeholder="Enter UPI Transaction ID"
                    value={paymentTransactionId}
                    onChange={(e) => setPaymentTransactionId(e.target.value)}
                  />
                  <button
                    className="pay-commission-btn"
                    onClick={payCommission}
                    disabled={!paymentTransactionId || processingPayment}
                  >
                    {processingPayment ? "Processing..." : "✓ Confirm Payment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment History Modal */}
        {showPaymentHistoryModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowPaymentHistoryModal(false)}
          >
            <div
              className="modal-content payment-history-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>📜 Payment History</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowPaymentHistoryModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                {paymentHistory.length === 0 ? (
                  <div
                    className="no-data"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                      💰
                    </div>
                    <h3>No Payment History</h3>
                    <p>You haven't made any commission payments yet.</p>
                  </div>
                ) : (
                  <div className="payment-history-list">
                    {paymentHistory.map((payment, index) => (
                      <div
                        key={payment._id || index}
                        className="payment-history-item"
                      >
                        <div className="payment-date">
                          {formatDateTime(payment.paidAt)}
                        </div>
                        <div className="payment-amount">₹{payment.amount}</div>
                        <div className="payment-txn">
                          Transaction: {payment.transactionId}
                        </div>
                        <div className="payment-status">
                          Status: {payment.status || "Completed"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="dashboard-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div>
                  <h3>Total Appointment</h3>
                  <p className="stat-number">{stats.totalAppointments}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div>
                  <h3>Completed</h3>
                  <p className="stat-number">{stats.completedAppointments}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <div>
                  <h3>Pending Verification</h3>
                  <p className="stat-number">{stats.pendingVerification}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div>
                  <h3>Total Earnings</h3>
                  <p className="stat-number">₹{stats.totalEarnings}</p>
                </div>
              </div>
            </div>
            {commissionData?.due > 0 && (
              <div className="commission-due-widget">
                <div className="due-header">
                  <span className="due-label">💰 Commission Due</span>
                  <span className="due-amount">₹{commissionData.due}</span>
                </div>
                <div className="due-details">
                  <p>Total Commission: ₹{commissionData.total || 0}</p>
                  <p>Paid: ₹{commissionData.paid || 0}</p>
                </div>
                <button
                  className="view-due-btn"
                  onClick={() => setActiveTab("commissionReport")}
                >
                  View Details →
                </button>
              </div>
            )}
            <div className="today-schedule">
              <h2>Today's Schedule</h2>
              <div className="today-summary">
                <div className="today-stat">
                  <span className="label">Today's Appointments</span>
                  <span className="value">{stats.todayAppointments}</span>
                </div>
                <div className="today-stat">
                  <span className="label">Upcoming</span>
                  <span className="value">{stats.upcomingCount}</span>
                </div>
              </div>
            </div>
            <div className="upcoming-section">
              <h2>Upcoming Appointment</h2>
              {upcomingAppointments.length === 0 ? (
                <div className="no-data">No upcoming appointments</div>
              ) : (
                <div className="upcoming-list">
                  {upcomingAppointments.slice(0, 5).map((apt) => (
                    <div key={apt._id} className="upcoming-card">
                      <div className="upcoming-time">
                        <span className="date">
                          {formatDate(apt.appointmentDate)}
                        </span>
                        <span className="time">{apt.appointmentTime}</span>
                      </div>
                      <div className="upcoming-patient">
                        <span className="patient-name">
                          {apt.patient?.name}
                        </span>
                        <span className="patient-phone">
                          {apt.patient?.phone}
                        </span>
                      </div>
                      <button
                        className="complete-btn"
                        onClick={() => verifyPayment(apt._id)}
                      >
                        Complete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VERIFY PAYMENT TAB */}
        {activeTab === "verify" && (
          <div className="verification-tab">
            <div className="verification-stats">
              <div className="stat-chip total-pending">
                <span className="stat-label">Total Pending:</span>
                <span className="stat-value">{pendingAppointments.length}</span>
              </div>
            </div>
            <p className="tab-description">
              Verify patient payments to confirm appointments.
            </p>
            {pendingAppointments.length === 0 ? (
              <div className="doctor-empty-state">
                <div className="doctor-empty-icon">✅</div>
                <h3>No Pending Verifications</h3>
                <p>All appointments are verified.</p>
              </div>
            ) : (
              <div className="verification-grid">
                {pendingAppointments.map((apt) => (
                  <div key={apt._id} className="verification-card">
                    <div className="patient-info-header">
                      <h3>{apt.patient?.name}</h3>
                      <span className="amount">₹{apt.amount}</span>
                    </div>
                    <div className="card-details">
                      <div className="detail-row">
                        <span className="detail-label">📅 Date:</span>
                        <span className="detail-value">
                          {formatDate(apt.appointmentDate)} at{" "}
                          {apt.appointmentTime}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">📞 Phone:</span>
                        <span className="detail-value">
                          {apt.patient?.phone}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">📧 Email:</span>
                        <span className="detail-value">
                          {apt.patient?.email}
                        </span>
                      </div>
                    </div>
                    <div className="verification-section">
                      <button
                        className="verify-btn"
                        onClick={() => verifyPayment(apt._id)}
                      >
                        ✓ Verify Payment
                      </button>
                      <p className="commission-hint">
                        Commission (1%): ₹{Math.floor(apt.amount * 0.01)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS TAB */}
        {activeTab === "appointments" && (
          <div className="appointments-tab">
            <div className="tab-header">
              <h2>All Appointments</h2>
              <div className="filter-section">
                <select
                  className="filter-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending_verification">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <input
                  type="date"
                  className="filter-input"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
                <button className="filter-btn" onClick={handleFilter}>
                  🔍 Apply Filters
                </button>
              </div>
            </div>
            {dataLoading ? (
              <div className="doctor-loading">
                <div className="spinner"></div>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="no-data">No appointments found</div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="appointments-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Patient</th>
                        <th>Contact</th>
                        <th>Symptoms</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.map((apt) => {
                        let statusText = "",
                          statusClass = "";
                        if (apt.status === "pending_verification") {
                          statusText = "⏳ Pending";
                          statusClass = "pending_verification";
                        } else if (apt.status === "confirmed") {
                          statusText = "✅ Confirmed";
                          statusClass = "confirmed";
                        } else if (apt.status === "completed") {
                          statusText = "✓ Completed";
                          statusClass = "completed";
                        } else if (apt.status === "cancelled") {
                          statusText = "✗ Cancelled";
                          statusClass = "cancelled";
                        } else {
                          statusText = apt.status;
                          statusClass = "";
                        }
                        return (
                          <tr key={apt._id}>
                            <td className="date-cell">
                              {formatDate(apt.appointmentDate)}
                              <br />
                              {apt.appointmentTime}
                            </td>
                            <td className="patient-cell">
                              {apt.patient?.name}
                            </td>
                            <td className="contact-cell">
                              {apt.patient?.phone}
                            </td>
                            <td className="symptoms-cell">
                              {apt.patient?.symptoms || "—"}
                            </td>
                            <td className="amount-cell">₹{apt.amount}</td>
                            <td className="payment-cell">
                              <span className="payment-method-badge">
                                {apt.paymentMethod === "upi" && "💳 UPI"}
                                {apt.paymentMethod === "cash" && "💵 Cash"}
                                {apt.paymentMethod === "card" && "💳 Card"}
                                {!apt.paymentMethod && "💳 UPI"}
                              </span>
                              <br />
                              <span
                                className={`payment-status-badge ${apt.paymentStatus === "verified" ? "verified" : "pending"}`}
                              >
                                {apt.paymentStatus === "verified"
                                  ? "✓ Verified"
                                  : "⏳ Pending"}
                              </span>
                            </td>
                            <td className="status-cell">
                              <div className={`status-badge ${statusClass}`}>
                                {statusText}
                              </div>
                            </td>
                            <td className="action-cell">
                              {apt.status === "pending_verification" && (
                                <div className="action-buttons-group">
                                  <button
                                    className="verify-btn"
                                    onClick={() => verifyPayment(apt._id)}
                                  >
                                    ✓ Verify
                                  </button>
                                  <button
                                    className="reject-btn"
                                    onClick={() => rejectAppointment(apt._id)}
                                  >
                                    ✗ Reject
                                  </button>
                                </div>
                              )}
                              {apt.status === "confirmed" && (
                                <select
                                  className="status-select"
                                  onChange={(e) => {
                                    if (e.target.value === "complete")
                                      completeAppointment(apt._id);
                                    else if (e.target.value === "cancel")
                                      rejectAppointment(apt._id);
                                    e.target.value = "";
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>
                                    Select Action
                                  </option>
                                  <option value="complete">
                                    ✓ Mark Completed
                                  </option>
                                  <option value="cancel">
                                    ✗ Cancel Appointment
                                  </option>
                                </select>
                              )}
                              {apt.status === "completed" && (
                                <span className="action-completed">
                                  ✓ Completed
                                </span>
                              )}
                              {apt.status === "cancelled" && (
                                <span className="action-cancelled">
                                  ✗ Cancelled
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="appointments-cards">
                  {filteredAppointments.map((apt) => {
                    let statusClass = "",
                      statusText = "";
                    if (apt.status === "pending_verification") {
                      statusClass = "pending_verification";
                      statusText = "⏳ Pending";
                    } else if (apt.status === "confirmed") {
                      statusClass = "confirmed";
                      statusText = "✅ Confirmed";
                    } else if (apt.status === "completed") {
                      statusClass = "completed";
                      statusText = "✓ Completed";
                    } else if (apt.status === "cancelled") {
                      statusClass = "cancelled";
                      statusText = "✗ Cancelled";
                    }
                    return (
                      <div key={apt._id} className="appointment-card">
                        <div className="appointment-card-header">
                          <span className="appointment-id">
                            #{apt.appointmentId?.slice(-6)}
                          </span>
                          <span
                            className={`appointment-status-mobile ${statusClass}`}
                          >
                            {statusText}
                          </span>
                        </div>
                        <div className="appointment-card-body">
                          <div className="appointment-info-item">
                            <span className="info-label">📅 Date & Time</span>
                            <span className="info-value">
                              {formatDate(apt.appointmentDate)} |{" "}
                              {apt.appointmentTime}
                            </span>
                          </div>
                          <div className="appointment-info-item">
                            <span className="info-label">👤 Patient</span>
                            <span className="info-value">
                              {apt.patient?.name}
                            </span>
                          </div>
                          <div className="appointment-info-item">
                            <span className="info-label">📞 Contact</span>
                            <span className="info-value">
                              {apt.patient?.phone}
                            </span>
                          </div>
                          <div className="appointment-info-item">
                            <span className="info-label">💊 Symptoms</span>
                            <span className="info-value">
                              {apt.patient?.symptoms || "—"}
                            </span>
                          </div>
                        </div>
                        <div className="appointment-card-footer">
                          <div className="appointment-amount">
                            ₹{apt.amount}
                          </div>
                          <div className="appointment-commission">
                            Commission:{" "}
                            <span>₹{(apt.amount * 0.01).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* PATIENTS TAB */}
        {activeTab === "patients" && (
          <div className="patients-tab">
            <h2>My Patients</h2>

            {/* Search Bar */}
            <div className="patient-search-section">
              <input
                type="text"
                placeholder="🔍 Search by name, email, or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="patient-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="clear-search-btn"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Patients List */}
            {filteredPatients.length === 0 ? (
              <div className="no-data">
                {searchQuery ? "No patients found" : "No patients yet"}
              </div>
            ) : (
              <div className="patients-grid">
                {filteredPatients.map((patient) => (
                  <div key={patient.email} className="patient-card">
                    <div className="patient-header">
                      <div className="patient-avatar">👤</div>
                      <div>
                        <h3>{patient.name}</h3>
                        <p className="patient-contact">{patient.phone}</p>
                        <p className="patient-email">{patient.email}</p>
                      </div>
                    </div>
                    <div className="patient-stats">
                      <div className="stat">
                        <span>Total Visits</span>
                        <strong>{patient.visitCount || 0}</strong>
                      </div>
                      <div className="stat">
                        <span>Last Visit</span>
                        <strong>
                          {patient.lastVisit
                            ? formatDate(patient.lastVisit)
                            : "N/A"}
                        </strong>
                      </div>
                    </div>
                    <button
                      className="view-details-btn"
                      onClick={() => {
                        setSelectedPatientEmail(patient.email);
                        setSelectedPatientName(patient.name);
                        setActiveTab("records");
                      }}
                    >
                      📄 View Medical Records
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AVAILABILITY TAB */}
        {activeTab === "availability" && (
          <div className="availability-tab">
            <h2>Availability Schedule</h2>
            <div className="availability-grid">
              {Object.keys(availability).map((day) => (
                <div key={day} className="availability-day">
                  <div className="day-header">
                    <label>
                      <input
                        type="checkbox"
                        checked={availability[day].enabled}
                        onChange={(e) =>
                          setAvailability({
                            ...availability,
                            [day]: {
                              ...availability[day],
                              enabled: e.target.checked,
                            },
                          })
                        }
                      />
                      <span className="day-name">
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </span>
                    </label>
                  </div>
                  {availability[day].enabled && (
                    <div className="time-slots">
                      <input
                        type="time"
                        value={availability[day].start}
                        onChange={(e) =>
                          setAvailability({
                            ...availability,
                            [day]: {
                              ...availability[day],
                              start: e.target.value,
                            },
                          })
                        }
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={availability[day].end}
                        onChange={(e) =>
                          setAvailability({
                            ...availability,
                            [day]: {
                              ...availability[day],
                              end: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 🆕 LUNCH BREAK SECTION */}
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                backgroundColor: "#fefce8",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={lunchBreak.enabled}
                  onChange={(e) =>
                    setLunchBreak({ ...lunchBreak, enabled: e.target.checked })
                  }
                />
                <strong>
                  🍽️ Add Lunch Break (Clinic closed during this time)
                </strong>
              </label>
              {lunchBreak.enabled && (
                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    gap: "15px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span>Break Time:</span>
                  <input
                    type="time"
                    value={lunchBreak.start}
                    onChange={(e) =>
                      setLunchBreak({ ...lunchBreak, start: e.target.value })
                    }
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                    }}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={lunchBreak.end}
                    onChange={(e) =>
                      setLunchBreak({ ...lunchBreak, end: e.target.value })
                    }
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
              )}
            </div>

            <button
              className="save-availability-btn"
              onClick={updateAvailability}
            >
              Save Availability Schedule
            </button>
          </div>
        )}

        {/* MEDICAL RECORDS TAB */}
        {activeTab === "records" && (
          <div className="records-tab">
            {/* Selected Patient Banner */}
            {selectedPatientEmail && (
              <div className="selected-patient-banner">
                <span>
                  📋 Showing records for: <strong>{selectedPatientName}</strong>
                </span>
                <button
                  onClick={() => {
                    setSelectedPatientEmail(null);
                    setSelectedPatientName(null);
                  }}
                  className="show-all-btn"
                >
                  ← Show All Records
                </button>
              </div>
            )}

            <h2>📁 Medical Records</h2>

            {/* Upload Form Section */}
            <div className="upload-record-section">
              <h3>📤 Upload New Medical Record</h3>
              <div className="upload-form-grid">
                {/* Patient Selection - CONDITIONAL */}
                {selectedPatientEmail ? (
                  // Case 1: Patient already selected from Patients tab
                  <div className="form-group">
                    <label>Patient *</label>
                    <input
                      type="text"
                      value={selectedPatientName}
                      disabled
                      className="selected-patient-input"
                    />
                    <small className="upload-note">
                      📋 Uploading records for:{" "}
                      <strong>{selectedPatientName}</strong>
                    </small>
                  </div>
                ) : (
                  // Case 2: No patient selected - show dropdown
                  <div className="form-group">
                    <label>Select Patient *</label>
                    <select id="patientSelect" className="patient-select">
                      <option value="">-- Select Patient --</option>
                      {patients.map((patient) => (
                        <option
                          key={patient.email}
                          value={JSON.stringify({
                            email: patient.email,
                            name: patient.name,
                            phone: patient.phone,
                          })}
                        >
                          {patient.name} ({patient.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Record Title *</label>
                  <input
                    type="text"
                    id="recordTitle"
                    placeholder="e.g., Blood Report, Chest X-Ray"
                  />
                </div>

                <div className="form-group">
                  <label>File Type *</label>
                  <select id="fileType">
                    <option value="xray">🩻 X-Ray</option>
                    <option value="mri">🧬 MRI</option>
                    <option value="ct">🫀 CT Scan</option>
                    <option value="ultrasound">👶 Ultrasound</option>
                    <option value="ecg">💓 ECG / EKG</option>
                    <option value="prescription">📝 Prescription</option>
                    <option value="lab_report">🔬 Lab Report</option>
                    <option value="vaccination">💉 Vaccination Record</option>
                    <option value="discharge_summary">
                      📋 Discharge Summary
                    </option>
                    <option value="other">📄 Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    id="recordDesc"
                    rows="2"
                    placeholder="Additional notes about this record..."
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Upload File *</label>
                  <input
                    type="file"
                    id="recordFile"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      const sizeInfo = document.getElementById("fileSizeInfo");
                      if (file && sizeInfo) {
                        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                        if (file.size > 10 * 1024 * 1024) {
                          sizeInfo.innerHTML = `⚠️ File too large: ${sizeMB}MB (Will be compressed)`;
                          sizeInfo.className = "file-size-limit warning";
                        } else {
                          sizeInfo.innerHTML = `📄 Selected: ${file.name} (${sizeMB}MB) - Will be compressed`;
                          sizeInfo.className = "file-size-limit";
                        }
                      }
                    }}
                  />
                  <span id="fileSizeInfo" className="file-size-limit">
                    ✅ Allowed: JPEG, PNG, GIF, WebP, PDF
                  </span>
                </div>

                <button
                  className="upload-record-btn"
                  onClick={uploadMedicalRecord}
                >
                  📤 Upload Record
                </button>
              </div>
            </div>

            {/* Existing Records List */}
            <h3>📁 Existing Records ({filteredRecords.length})</h3>
            {filteredRecords.length === 0 ? (
              <div className="no-data">
                {selectedPatientEmail
                  ? "No records found for this patient"
                  : "No medical records uploaded yet"}
              </div>
            ) : (
              <div className="records-grid">
                {filteredRecords.map((record) => (
                  <div key={record._id} className="record-card">
                    {/* Header with Icon and Title */}
                    <div className="record-header">
                      <div className="record-icon">
                        {record.fileType === "xray" && "🩻"}
                        {record.fileType === "mri" && "🧬"}
                        {record.fileType === "ct" && "🫀"}
                        {record.fileType === "ultrasound" && "👶"}
                        {record.fileType === "ecg" && "💓"}
                        {record.fileType === "prescription" && "📝"}
                        {record.fileType === "lab_report" && "🔬"}
                        {record.fileType === "vaccination" && "💉"}
                        {record.fileType === "discharge_summary" && "📋"}
                        {record.fileType === "other" && "📄"}
                        {!record.fileType && "📄"}
                      </div>
                      <div className="record-title-section">
                        <div className="record-title">
                          {record.title || record.filename}
                        </div>
                        <span
                          className={`file-type-badge ${record.fileType || "other"}`}
                        >
                          {record.fileType?.toUpperCase() || "DOCUMENT"}
                        </span>
                      </div>
                    </div>

                    {/* Record Info */}
                    <div className="record-info">
                      <div className="record-patient">
                        <span className="label">👤 Patient:</span>
                        <span className="value">{record.patientName}</span>
                      </div>
                      <div className="record-date">
                        <span className="label">📅 Uploaded:</span>
                        <span className="value">
                          {formatDate(record.uploadedAt)}
                        </span>
                      </div>
                      <div className="record-size">
                        <span className="label">💾 Size:</span>
                        <span className="value">
                          {record.fileSize
                            ? (record.fileSize / 1024).toFixed(0)
                            : "0"}{" "}
                          KB
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="record-actions">
                      <a
                        href={record.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-btn"
                      >
                        👁️ View
                      </a>
                      <button
                        onClick={() => deleteRecord(record.recordId)}
                        className="delete-btn"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EARNINGS TAB */}
        {activeTab === "earnings" && (
          <div className="earnings-tab">
            <h2>Earnings & Commission</h2>
            <div className="earnings-card">
              <div className="total-earnings">
                <span>Total Earnings</span>
                <h1>₹{stats.totalEarnings}</h1>
              </div>
              <div className="commission-breakdown">
                <div className="commission-item">
                  <span>Platform Fee (1%):</span>
                  <span className="commission-amount">
                    ₹{Math.floor(stats.totalEarnings * 0.01)}
                  </span>
                </div>
                <div className="commission-item net">
                  <span>Net Earnings:</span>
                  <span className="net-amount">
                    ₹
                    {stats.totalEarnings -
                      Math.floor(stats.totalEarnings * 0.01)}
                  </span>
                </div>
              </div>
              <div className="earnings-breakdown">
                <div className="breakdown-item">
                  <span>Commission Due</span>
                  <strong>₹{commissionData?.due || 0}</strong>
                </div>
                <div className="breakdown-item">
                  <span>Commission Paid</span>
                  <strong>₹{commissionData?.paid || 0}</strong>
                </div>
                <div className="breakdown-item">
                  <span>Total Commission</span>
                  <strong>₹{commissionData?.total || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT HISTORY PAGE */}
        {activeTab === "paymentHistory" && (
          <div className="payment-history-tab">
            <h2>📜 Payment History</h2>
            {paymentHistory.length === 0 ? (
              <div
                className="no-data"
                style={{ textAlign: "center", padding: "40px" }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>💰</div>
                <h3>No Payment History</h3>
                <p>You haven't made any commission payments yet.</p>
              </div>
            ) : (
              <div className="payment-history-list">
                {paymentHistory.map((payment, index) => (
                  <div
                    key={payment._id || index}
                    className="payment-history-item"
                  >
                    <div className="payment-date">
                      {formatDateTime(payment.paidAt)}
                    </div>
                    <div className="payment-amount">₹{payment.amount}</div>
                    <div className="payment-txn">
                      Transaction: {payment.transactionId}
                    </div>
                    <div className="payment-status">
                      Status: {payment.status || "Completed"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMMISSION REPORT PAGE */}
        {activeTab === "commissionReport" && commissionData && (
          <div className="commission-report-tab">
            <h2>💰 Commission Report</h2>
            <div className="commission-report-card">
              <div className="amount-due-card">
                <span className="amount-label">Total Due</span>
                <div className="amount-value">₹{commissionData.due || 0}</div>
                <span className="amount-note">Amount pending to be paid</span>
              </div>
              <div className="commission-stats-grid">
                <div className="stat-item">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <span className="stat-label">Total Commission</span>
                    <span className="stat-number">
                      ₹
                      {commissionData.totalCommission ||
                        commissionData.total ||
                        0}
                    </span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <span className="stat-label">Commission Paid</span>
                    <span className="stat-number">
                      ₹{commissionData.paid || 0}
                    </span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-info">
                    <span className="stat-label">Commission Due</span>
                    <span className="stat-number">
                      ₹{commissionData.due || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="commission-details">
                <h3>Summary</h3>
                <div>
                  <span>Total Earnings:</span>
                  <strong>₹{commissionData.totalEarnings || 0}</strong>
                </div>
                <div>
                  <span>Commission Rate:</span>
                  <strong>{commissionData.commissionPercentage || 1}%</strong>
                </div>
                <div>
                  <span>Net Earnings:</span>
                  <strong>
                    ₹
                    {(commissionData.totalEarnings || 0) -
                      (commissionData.totalCommission || 0)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboard;
