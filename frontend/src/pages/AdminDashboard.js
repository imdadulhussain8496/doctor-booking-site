// D:\Projects\DoctorBooking\frontend\src\pages\AdminDashboard.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getDoctorImage } from "../utils/doctorImages";
import "./Admin.css";

function AdminDashboard({ admin, onLogout }) {
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    doctor: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  // ✅ Commission Due State
  const [commissionDue, setCommissionDue] = useState([]);
  const [totalCommissionDue, setTotalCommissionDue] = useState(0);
  const [showCommissionDueModal, setShowCommissionDueModal] = useState(false);
  const [paymentTransactionId, setPaymentTransactionId] = useState({});
  const [processingPayment, setProcessingPayment] = useState(false);

  // ✅ Payment Enforcement State
  const [restrictedDoctors, setRestrictedDoctors] = useState([]);
  const [overdueDoctors, setOverdueDoctors] = useState([]);
  const [loadingRestricted, setLoadingRestricted] = useState(false);

  // ✅ NEW: Payment Enforcement Modal State
  const [showPaymentEnforcementModal, setShowPaymentEnforcementModal] =
    useState(false);

  // ✅ Auto-refresh state
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const [activeTab, setActiveTab] = useState("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ✅ Doctor Management State
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    qualification: "",
    experience: "",
    fee: "",
    upiId: "",
    imageUrl: "",
    paymentMethod: "both",
    commissionPercentage: 1,
  });

  // ✅ Image Preview State
  const [previewImage, setPreviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // ✅ Commission Tracking State
  const [commissionReport, setCommissionReport] = useState(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionPeriod, setCommissionPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // ✅ QR Code Modal State
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedDoctorQR, setSelectedDoctorQR] = useState(null);

  // ✅ Edit Doctor Modal State
  const [editDoctorData, setEditDoctorData] = useState(null);
  const [editPreviewImage, setEditPreviewImage] = useState(null);
  const [editUploading, setEditUploading] = useState(false);

  // ✅ Password Reset Modal State
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  // ✅ Notification State
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });

  // ✅ Show notification function
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "" }),
      3000,
    );
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // ✅ Auto-refresh function
  const refreshAllData = useCallback(async () => {
    console.log("🔄 Auto-refreshing admin data...");
    await Promise.all([
      fetchDashboardData(false),
      fetchCommissionReport(false),
      fetchAllDoctors(false),
      fetchCommissionDue(false),
      fetchRestrictedDoctors(false),
      fetchOverdueDoctors(false),
    ]);
    setLastRefresh(Date.now());
  }, []);

  // ✅ Auto-refresh every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshAllData();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [refreshAllData]);

  // ✅ Initial data fetch
  useEffect(() => {
    fetchDashboardData();
    fetchCommissionReport();
    fetchAllDoctors();
    fetchCommissionDue();
    fetchRestrictedDoctors();
    fetchOverdueDoctors();
  }, []);

  // ✅ Fetch restricted doctors
  const fetchRestrictedDoctors = async (showLoader = true) => {
    if (showLoader) setLoadingRestricted(true);
    try {
      const response = await axios.get(
        "http://localhost:5000/api/admin/restricted-doctors",
      );
      if (response.data.success) {
        setRestrictedDoctors(response.data.doctors);
      }
    } catch (error) {
      console.error("❌ Error fetching restricted doctors:", error);
    } finally {
      if (showLoader) setLoadingRestricted(false);
    }
  };

  // ✅ Fetch overdue doctors
  const fetchOverdueDoctors = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/admin/overdue-doctors",
      );
      if (response.data.success) {
        setOverdueDoctors(response.data.doctors);
      }
    } catch (error) {
      console.error("❌ Error fetching overdue doctors:", error);
    }
  };

  // ✅ Unblock doctor
  const handleUnblockDoctor = async (doctorId, doctorName) => {
    if (!window.confirm(`Are you sure you want to unblock ${doctorName}?`)) {
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/admin/doctors/unblock/${doctorId}`,
      );

      if (response.data.success) {
        showNotification(`✅ ${doctorName} unblocked successfully`, "success");
        fetchRestrictedDoctors();
        fetchAllDoctors();
        fetchDashboardData();
      }
    } catch (error) {
      console.error("❌ Error unblocking doctor:", error);
      showNotification("Failed to unblock doctor", "error");
    }
  };

  // ✅ Send manual reminder
  const handleSendReminder = async (doctorId, doctorName, type) => {
    const typeNames = {
      gentle: "⏳ Gentle Reminder",
      due: "⚠️ Due Date",
      urgent: "🔴 Urgent",
      final: "🚨 Final Warning",
    };

    if (!window.confirm(`Send ${typeNames[type]} to ${doctorName}?`)) {
      return;
    }

    try {
      const response = await axios.post(
        `http://localhost:5000/api/admin/send-reminder/${doctorId}/${type}`,
      );

      if (response.data.success) {
        showNotification(
          `✅ ${typeNames[type]} sent to ${doctorName}`,
          "success",
        );
      }
    } catch (error) {
      console.error("❌ Error sending reminder:", error);
      showNotification("Failed to send reminder", "error");
    }
  };

  // ✅ Fetch commission due from all doctors
  const fetchCommissionDue = async (showLoader = true) => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/admin/commission-due",
      );
      if (response.data.success) {
        setCommissionDue(response.data.doctors);
        setTotalCommissionDue(response.data.totalDue);
      }
    } catch (error) {
      console.error("❌ Error fetching commission due:", error);
    }
  };

  // ✅ Mark commission as paid
  const handleMarkCommissionPaid = async (doctorId, amount) => {
    const transactionId = paymentTransactionId[doctorId];

    if (!transactionId) {
      showNotification("Please enter transaction ID", "error");
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/admin/commission/mark-paid",
        {
          doctorId,
          transactionId,
          amount,
        },
      );

      if (response.data.success) {
        showNotification(
          `✅ Commission paid for ${response.data.doctor.name}`,
          "success",
        );
        await fetchCommissionDue();
        await fetchDashboardData();
        await fetchRestrictedDoctors(); // Refresh restricted list

        setPaymentTransactionId((prev) => ({ ...prev, [doctorId]: "" }));
      }
    } catch (error) {
      console.error("❌ Error marking commission as paid:", error);
      showNotification(
        error.response?.data?.message || "Failed to mark as paid",
        "error",
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  // ✅ Fetch all doctors with passwords
  const fetchAllDoctors = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      console.log("🔵 Fetching doctors...");
      const response = await axios.get(
        "http://localhost:5000/api/admin/doctors",
      );

      if (response.data.success) {
        const doctorsData = response.data.doctors;
        console.log(`✅ Fetched ${doctorsData.length} doctors`);

        if (doctorsData.length > 0) {
          console.log("📋 Sample doctor data:", {
            name: doctorsData[0].name,
            hasPassword: !!doctorsData[0].password,
            password: doctorsData[0].password,
          });
        }

        setDoctors(doctorsData);
      }
    } catch (error) {
      console.error("❌ Error fetching doctors:", error);
      showNotification("Failed to fetch doctors", "error");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // ✅ Refresh doctors function
  const refreshDoctors = async () => {
    try {
      setLoading(true);
      await fetchAllDoctors(true);
      showNotification("Doctors list refreshed", "success");
    } catch (error) {
      console.error("Error refreshing doctors:", error);
      showNotification("Failed to refresh doctors", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch dashboard data
  const fetchDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [statsRes, appointmentsRes, doctorsRes] = await Promise.all([
        axios.get("http://localhost:5000/api/admin/stats"),
        axios.get("http://localhost:5000/api/admin/appointments"),
        axios.get("http://localhost:5000/api/admin/doctors/stats"),
      ]);

      setStats(statsRes.data.stats);
      setAppointments(appointmentsRes.data.appointments);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      showNotification("Failed to fetch dashboard data", "error");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // ✅ Fetch commission report
  const fetchCommissionReport = async (showLoader = true) => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/admin/commission/report",
        {
          params: {
            month: commissionPeriod.month,
            year: commissionPeriod.year,
          },
        },
      );
      setCommissionReport(response.data.report);
    } catch (error) {
      console.error("Error fetching commission report:", error);
    }
  };

  // ✅ Handle filter
  const handleFilter = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.doctor) params.append("doctor", filter.doctor);
      if (filter.status) params.append("status", filter.status);
      if (filter.startDate) params.append("startDate", filter.startDate);
      if (filter.endDate) params.append("endDate", filter.endDate);

      const response = await axios.get(
        `http://localhost:5000/api/admin/appointments?${params}`,
      );
      setAppointments(response.data.appointments);
      showNotification("Filters applied", "success");
    } catch (error) {
      console.error("Error filtering appointments:", error);
      showNotification("Failed to apply filters", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Send login email
  const sendLoginEmail = async (doctor) => {
    if (!doctor || !doctor.email) {
      showNotification("Doctor email not found!", "error");
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:5000/api/admin/send-doctor-email",
        {
          email: doctor.email,
          name: doctor.name,
          password: doctor.password || "doctor123",
        },
      );

      if (response.data.success) {
        showNotification(`✅ Email sent to ${doctor.email}`, "success");
      } else {
        showNotification("Failed to send email", "error");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      showNotification("Failed to send email", "error");
    }
  };

  // ✅ Reset password
  const resetPassword = async (doc) => {
    const newPassword = prompt(
      `🔑 Reset password for ${doc.name}\n\n` +
        `Enter new password (or leave empty for default 'doctor123'):`,
      "doctor123",
    );

    if (newPassword === null) return;

    try {
      console.log("Resetting password for:", doc.email);

      const response = await axios.patch(
        `http://localhost:5000/api/admin/doctors/${doc._id}`,
        {
          password: newPassword || "doctor123",
        },
      );

      if (response.data.success) {
        setResetResult({
          name: doc.name,
          email: doc.email,
          password: newPassword || "doctor123",
        });
        setShowPasswordResetModal(true);

        await fetchAllDoctors();
        showNotification("Password reset successful", "success");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      showNotification("Failed to reset password", "error");
    }
  };

  // ✅ Handle show password
  const handleShowPassword = (doctor) => {
    console.log("🔍 Showing password for:", doctor.name);
    console.log("📋 Doctor data:", doctor);

    if (doctor.password) {
      alert(`🔑 Password for ${doctor.name}\n\nPassword: ${doctor.password}`);
    } else {
      alert(
        `❌ Password not found for ${doctor.name}\n\nTry refreshing the list first.`,
      );
      console.log("Doctor object without password:", doctor);
    }
  };

  // ✅ Handle image upload for new doctor
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPreviewImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    try {
      setUploading(true);
      const response = await axios.post(
        "http://localhost:5000/api/upload/doctor-image",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      setNewDoctor({
        ...newDoctor,
        imageUrl: response.data.imageUrl,
      });
      showNotification("Image uploaded successfully", "success");
    } catch (error) {
      console.error("Upload failed:", error);
      showNotification("Failed to upload image", "error");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Handle image upload for edit doctor
  const handleEditImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setEditPreviewImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    try {
      setEditUploading(true);
      const response = await axios.post(
        "http://localhost:5000/api/upload/doctor-image",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      setEditDoctorData({
        ...editDoctorData,
        imageUrl: response.data.imageUrl,
      });
      showNotification("Image uploaded successfully", "success");
    } catch (error) {
      console.error("Upload failed:", error);
      showNotification("Failed to upload image", "error");
    } finally {
      setEditUploading(false);
    }
  };

  // ✅ Handle add doctor
  const handleAddDoctor = async () => {
    try {
      const doctorData = {
        ...newDoctor,
        qrCodeUrl: newDoctor.upiId
          ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${newDoctor.upiId}&pn=Doctor&cu=INR`
          : "",
      };

      console.log("Adding doctor:", doctorData);

      const response = await axios.post(
        "http://localhost:5000/api/admin/doctors",
        doctorData,
      );

      if (response.data.success) {
        showNotification(` ${newDoctor.name} added successfully!`, "success");

        if (
          window.confirm(
            `Do you want to send login details to ${newDoctor.email}?`,
          )
        ) {
          await sendLoginEmail({
            ...newDoctor,
            password: response.data.password,
          });
        }

        setShowAddDoctorModal(false);
        setNewDoctor({
          name: "",
          email: "",
          phone: "",
          specialization: "",
          qualification: "",
          experience: "",
          fee: "",
          upiId: "",
          imageUrl: "",
          paymentMethod: "both",
          commissionPercentage: 1,
        });
        setPreviewImage(null);

        await fetchAllDoctors();
        await fetchDashboardData();
      }
    } catch (error) {
      console.error("Error adding doctor:", error);
      showNotification(
        error.response?.data?.message || "Failed to add doctor",
        "error",
      );
    }
  };

  // ✅ Handle edit click
  const handleEditClick = (doctor) => {
    console.log("Editing doctor:", doctor);

    const doctorId = doctor._id;
    if (!doctorId) {
      showNotification("Doctor ID not found", "error");
      return;
    }

    setEditDoctorData({ ...doctor });
    setEditPreviewImage(doctor.imageUrl || null);
    setShowEditDoctorModal(true);
  };

  // ✅ Handle edit doctor
  const handleEditDoctor = async () => {
    try {
      const doctorId = editDoctorData._id;

      if (!doctorId) {
        showNotification("Doctor ID not found", "error");
        return;
      }

      console.log("Updating doctor:", doctorId);

      const doctorData = {
        name: editDoctorData.name,
        email: editDoctorData.email,
        phone: editDoctorData.phone || "",
        specialization: editDoctorData.specialization,
        qualification: editDoctorData.qualification || "",
        experience: editDoctorData.experience || "",
        fee: parseInt(editDoctorData.fee) || 0,
        upiId: editDoctorData.upiId || "",
        imageUrl: editDoctorData.imageUrl || "",
        commissionPercentage: editDoctorData.commissionPercentage || 1,
      };

      const response = await axios.patch(
        `http://localhost:5000/api/admin/doctors/${doctorId}`,
        doctorData,
      );

      if (response.data.success) {
        showNotification(
          ` ${editDoctorData.name} updated successfully!`,
          "success",
        );
        setShowEditDoctorModal(false);
        setEditDoctorData(null);
        setEditPreviewImage(null);

        await fetchAllDoctors();
        await fetchDashboardData();
      }
    } catch (error) {
      console.error("Error updating doctor:", error);
      showNotification(
        error.response?.data?.message || "Failed to update doctor",
        "error",
      );
    }
  };

  // ✅ Handle delete doctor
  const handleDeleteDoctor = async (doctor) => {
    const doctorId = doctor._id;

    if (!doctorId) {
      showNotification("Doctor ID not found", "error");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete  ${doctor.name}? This action cannot be undone.`,
      )
    ) {
      try {
        console.log("Deleting doctor:", doctorId);
        await axios.delete(
          `http://localhost:5000/api/admin/doctors/${doctorId}`,
        );

        showNotification("Doctor deleted successfully", "success");

        await fetchAllDoctors();
        await fetchDashboardData();
      } catch (error) {
        console.error("Error deleting doctor:", error);
        showNotification(
          error.response?.data?.message || "Failed to delete doctor",
          "error",
        );
      }
    }
  };

  // ✅ Handle view QR
  const handleViewQR = (doctor) => {
    setSelectedDoctorQR(doctor);
    setShowQRModal(true);
  };

  // ✅ Calculate total commission
  const calculateTotalCommission = () => {
    if (!appointments) return 0;
    return appointments
      .filter((apt) => apt.status === "completed")
      .reduce((sum, apt) => sum + apt.amount * 0.01, 0);
  };

  if (loading && !doctors.length) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Refresh Indicator */}
      <div className="refresh-indicator">
        <small>
          Last updated: {new Date(lastRefresh).toLocaleTimeString()}
        </small>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <header className="admin-header">
        <div className="admin-header-left">
          <h1>🏥 Doctor Online Admin</h1>
          <p>Welcome back, {admin?.username || "Admin"}!</p>
        </div>

        {/* Desktop Buttons */}
        <div className="admin-header-right">
          {/* Payment Enforcement Button */}
          <button
            className="payment-enforcement-btn"
            onClick={() => setShowPaymentEnforcementModal(true)}
          >
            <span>💰</span>
            Payment Enforcement
            {(restrictedDoctors.length > 0 || overdueDoctors.length > 0) && (
              <span className="notification-badge">
                {restrictedDoctors.length + overdueDoctors.length}
              </span>
            )}
          </button>

          {totalCommissionDue > 0 && (
            <button
              className="commission-due-btn"
              onClick={() => setShowCommissionDueModal(true)}
            >
              <span>💰</span>
              Due: ₹{totalCommissionDue}
            </button>
          )}
          <button
            className="commission-report-btn"
            onClick={() => setShowCommissionModal(true)}
          >
            💰 Commission Report
          </button>
          <button onClick={onLogout} className="logout-btn">
            Logout
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button className="admin-mobile-menu-btn" onClick={toggleMobileMenu}>
          ☰
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? "active" : ""}`}
        onClick={toggleMobileMenu}
      ></div>

      {/* Mobile Menu Drawer - WITHOUT HEADER */}
      <div className={`mobile-menu-drawer ${mobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-menu-items">
          {/* Close button at top */}
          <button className="mobile-menu-close-top" onClick={toggleMobileMenu}>
            ✕
          </button>

          {/* Payment Enforcement Menu Item */}
          <button
            className="mobile-menu-btn-item payment"
            onClick={() => {
              setShowPaymentEnforcementModal(true);
              toggleMobileMenu();
            }}
          >
            <span>💰</span>
            Payment Enforcement
            {(restrictedDoctors.length > 0 || overdueDoctors.length > 0) && (
              <span className="menu-notification-badge">
                {restrictedDoctors.length + overdueDoctors.length}
              </span>
            )}
          </button>

          {/* Commission Due Menu Item */}
          <button
            className="mobile-menu-btn-item due"
            onClick={() => {
              setShowCommissionDueModal(true);
              toggleMobileMenu();
            }}
          >
            <span>💰</span>
            Commission Due: ₹{totalCommissionDue}
          </button>

          {/* Commission Report Menu Item */}
          <button
            className="mobile-menu-btn-item report"
            onClick={() => {
              setShowCommissionModal(true);
              toggleMobileMenu();
            }}
          >
            💰 Commission Report
          </button>

          {/* Logout Menu Item */}
          <button
            className="mobile-menu-btn-item logout"
            onClick={() => {
              onLogout();
              toggleMobileMenu();
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ========== NEW: PAYMENT ENFORCEMENT MODAL ========== */}
      {showPaymentEnforcementModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPaymentEnforcementModal(false)}
        >
          <div className="modal-content payment-enforcement-modal">
            <div className="modal-header">
              <h2>💰 Payment Enforcement</h2>
              <button
                className="close-btn"
                onClick={() => setShowPaymentEnforcementModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Summary Cards */}
              <div className="enforcement-summary-grid">
                <div className="summary-card restricted">
                  <span className="summary-icon">⛔</span>
                  <div className="summary-content">
                    <span className="summary-label">Restricted Doctors</span>
                    <span className="summary-value">
                      {stats?.restrictedDoctors || 0}
                    </span>
                  </div>
                </div>

                <div className="summary-card overdue">
                  <span className="summary-icon">⚠️</span>
                  <div className="summary-content">
                    <span className="summary-label">Overdue Doctors</span>
                    <span className="summary-value">
                      {stats?.overdueDoctors || 0}
                    </span>
                  </div>
                </div>

                <div className="summary-card fees">
                  <span className="summary-icon">💰</span>
                  <div className="summary-content">
                    <span className="summary-label">Late Fees Collected</span>
                    <span className="summary-value">
                      ₹{stats?.totalLateFees || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Restricted Doctors List */}
              <div className="enforcement-section">
                <h3>⛔ Restricted Accounts ({restrictedDoctors.length})</h3>
                <button
                  className="refresh-btn small"
                  onClick={() => {
                    fetchRestrictedDoctors();
                    fetchOverdueDoctors();
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {loadingRestricted ? (
                <div className="loading-spinner">
                  Loading restricted doctors...
                </div>
              ) : restrictedDoctors.length === 0 ? (
                <div className="no-data">No restricted doctors</div>
              ) : (
                <div className="table-responsive">
                  <table className="enforcement-table">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Specialization</th>
                        <th>Commission Due</th>
                        <th>Late Fees</th>
                        <th>Total Due</th>
                        <th>Restricted Since</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restrictedDoctors.map((doc) => {
                        const commission =
                          doc.paymentStats?.totalCommissionPaid || 0;
                        const lateFees = doc.lateFees || 0;
                        const total = commission + lateFees;

                        return (
                          <tr key={doc.doctorId}>
                            <td>
                              <strong>{doc.name}</strong>
                            </td>
                            <td>{doc.specialization || "N/A"}</td>
                            <td className="amount">₹{commission}</td>
                            <td className="amount fees">₹{lateFees}</td>
                            <td className="amount total">
                              <strong>₹{total}</strong>
                            </td>
                            <td>
                              {doc.restrictedAt
                                ? new Date(
                                    doc.restrictedAt,
                                  ).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="actions">
                              <button
                                className="action-btn unblock"
                                onClick={() =>
                                  handleUnblockDoctor(doc.doctorId, doc.name)
                                }
                                title="Unblock Doctor"
                              >
                                🔓 Unblock
                              </button>
                              <div className="reminder-dropdown">
                                <button className="action-btn remind">
                                  📧 Remind ▼
                                </button>
                                <div className="dropdown-content">
                                  <button
                                    onClick={() =>
                                      handleSendReminder(
                                        doc.doctorId,
                                        doc.name,
                                        "gentle",
                                      )
                                    }
                                  >
                                    ⏳ Gentle
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSendReminder(
                                        doc.doctorId,
                                        doc.name,
                                        "due",
                                      )
                                    }
                                  >
                                    ⚠️ Due Date
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSendReminder(
                                        doc.doctorId,
                                        doc.name,
                                        "urgent",
                                      )
                                    }
                                  >
                                    🔴 Urgent
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSendReminder(
                                        doc.doctorId,
                                        doc.name,
                                        "final",
                                      )
                                    }
                                  >
                                    🚨 Final
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Overdue Doctors Summary */}
              {overdueDoctors.length > 0 && (
                <div className="overdue-summary">
                  <h4>⚠️ Overdue Doctors ({overdueDoctors.length})</h4>
                  <div className="overdue-mini-list">
                    {overdueDoctors.slice(0, 5).map((doc) => (
                      <div key={doc.doctorId} className="overdue-item">
                        <span>{doc.name}</span>
                        <span>
                          ₹
                          {(doc.paymentStats?.totalCommissionPaid || 0) +
                            (doc.lateFees || 0)}
                        </span>
                        <span className="days">
                          {doc.totalOverdueDays || 0} days
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Commission Due Modal */}
      {showCommissionDueModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCommissionDueModal(false)}
        >
          <div className="modal-content commission-modal">
            <div className="modal-header">
              <h2>💰 Commission Report (1%)</h2>
              <button
                className="close-btn"
                onClick={() => setShowCommissionDueModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="commission-summary">
                <div className="summary-card highlight">
                  <span>Total Due</span>
                  <strong>₹{totalCommissionDue}</strong>
                </div>
                <div className="summary-card">
                  <span>Platform UPI</span>
                  <strong>6002777634@axisbank</strong>
                </div>
              </div>

              <div className="doctor-commission-list">
                <h3>Doctor-wise Commission Due</h3>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Email</th>
                        <th>Commission Due</th>
                        <th>Late Fees</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionDue.map((doc) => {
                        const totalWithFees =
                          doc.commissionDue + (doc.lateFees || 0);
                        return (
                          <tr key={doc.doctorId}>
                            <td>{doc.name}</td>
                            <td>{doc.email}</td>
                            <td className="commission-amount">
                              ₹{doc.commissionDue}
                            </td>
                            <td className={doc.lateFees ? "fees-amount" : ""}>
                              {doc.lateFees ? `₹${doc.lateFees}` : "-"}
                            </td>
                            <td className="total-amount">
                              <strong>₹{totalWithFees}</strong>
                            </td>
                            <td>
                              {doc.paymentStatus === "restricted" ? (
                                <span className="status-badge restricted">
                                  ⛔ Restricted
                                </span>
                              ) : doc.paymentStatus === "overdue" ? (
                                <span className="status-badge overdue">
                                  ⚠️ Overdue
                                </span>
                              ) : doc.commissionDue > 0 ? (
                                <span className="status-badge pending">
                                  ⏳ Pending
                                </span>
                              ) : (
                                <span className="status-badge paid">
                                  ✅ Paid
                                </span>
                              )}
                            </td>
                            <td>
                              {doc.commissionDue > 0 ? (
                                <div className="commission-action">
                                  <input
                                    type="text"
                                    placeholder="Transaction ID"
                                    value={
                                      paymentTransactionId[doc.doctorId] || ""
                                    }
                                    onChange={(e) =>
                                      setPaymentTransactionId({
                                        ...paymentTransactionId,
                                        [doc.doctorId]: e.target.value,
                                      })
                                    }
                                  />
                                  <button
                                    className="mark-paid-btn"
                                    onClick={() =>
                                      handleMarkCommissionPaid(
                                        doc.doctorId,
                                        doc.commissionDue,
                                      )
                                    }
                                    disabled={
                                      processingPayment ||
                                      !paymentTransactionId[doc.doctorId]
                                    }
                                  >
                                    {processingPayment
                                      ? "Processing..."
                                      : "Mark Paid"}
                                  </button>
                                </div>
                              ) : (
                                <span className="paid-badge">✅ Paid</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="commission-note">
                ⚠️ After receiving payment via UPI, enter transaction ID and
                click "Mark Paid"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Password Reset Modal */}
      {showPasswordResetModal && resetResult && (
        <div className="modal-overlay">
          <div className="modal-content reset-modal">
            <div className="modal-header">
              <h2>🔑 Password Reset Successful</h2>
              <button
                className="close-btn"
                onClick={() => setShowPasswordResetModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="reset-details">
              <p>
                <strong>Doctor:</strong> {resetResult.name}
              </p>
              <p>
                <strong>Email:</strong> {resetResult.email}
              </p>
              <p>
                <strong>New Password:</strong>
              </p>
              <code>{resetResult.password}</code>
            </div>

            <div className="reset-actions">
              <button
                className="email-btn"
                onClick={() => sendLoginEmail(resetResult)}
                title="Send Login Details"
              >
                📧 Email Password
              </button>
              <button
                className="close-btn"
                onClick={() => setShowPasswordResetModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Commission Report Modal */}
      {showCommissionModal && commissionReport && (
        <div className="modal-overlay">
          <div className="modal-content commission-modal">
            <div className="modal-header">
              <h2>💰 Commission Report (1%)</h2>
              <button
                className="close-btn"
                onClick={() => setShowCommissionModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="period-selector">
                <select
                  value={commissionPeriod.month}
                  onChange={(e) =>
                    setCommissionPeriod({
                      ...commissionPeriod,
                      month: parseInt(e.target.value),
                    })
                  }
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
                <select
                  value={commissionPeriod.year}
                  onChange={(e) =>
                    setCommissionPeriod({
                      ...commissionPeriod,
                      year: parseInt(e.target.value),
                    })
                  }
                >
                  {[2024, 2025, 2026].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <button onClick={fetchCommissionReport} className="apply-btn">
                  Apply
                </button>
              </div>

              <div className="commission-summary">
                <div className="summary-card">
                  <span>Total Revenue</span>
                  <strong>₹{commissionReport?.totalRevenue || 0}</strong>
                </div>
                <div className="summary-card highlight">
                  <span>Your Commission (1%)</span>
                  <strong>₹{commissionReport?.totalCommission || 0}</strong>
                </div>
                <div className="summary-card">
                  <span>Appointments</span>
                  <strong>{commissionReport?.appointmentCount || 0}</strong>
                </div>
              </div>

              <div className="doctor-commission-list">
                <h3>Doctor-wise Commission</h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Specialization</th>
                        <th>Appointments</th>
                        <th>Revenue</th>
                        <th>Commission (1%)</th>
                        <th>UPI ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionReport?.doctors?.map((doc, index) => (
                        <tr key={index}>
                          <td>{doc.doctorName}</td>
                          <td>{doc.specialization}</td>
                          <td>{doc.appointments}</td>
                          <td>₹{doc.totalRevenue}</td>
                          <td className="commission-amount">
                            ₹{doc.commission}
                          </td>
                          <td className="upi-id">{doc.upiId || "Not set"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: QR Code Modal */}
      {showQRModal && selectedDoctorQR && (
        <div className="modal-overlay">
          <div className="modal-content qr-modal">
            <div className="modal-header">
              <h2>📱 {selectedDoctorQR.name}'s QR Code</h2>
              <button
                className="close-btn"
                onClick={() => setShowQRModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="qr-display">
              {selectedDoctorQR.qrCodeUrl ? (
                <img
                  src={selectedDoctorQR.qrCodeUrl}
                  alt={`QR Code for ${selectedDoctorQR.name}`}
                  className="qr-image-large"
                />
              ) : (
                <div className="qr-placeholder-large">
                  <span className="qr-icon">📱</span>
                  <p>QR Code not available</p>
                </div>
              )}

              <div className="qr-details">
                <p>
                  <strong>Doctor:</strong> {selectedDoctorQR.name}
                </p>
                <p>
                  <strong>UPI ID:</strong> {selectedDoctorQR.upiId || "Not set"}
                </p>
                <p>
                  <strong>Amount:</strong> ₹{selectedDoctorQR.fee}
                </p>
              </div>

              <button className="print-btn" onClick={() => window.print()}>
                🖨️ Print QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Edit Doctor Modal */}
      {showEditDoctorModal && editDoctorData && (
        <div className="modal-overlay">
          <div className="modal-content add-doctor-modal">
            <div className="modal-header">
              <h2>✏️ Edit Doctor</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowEditDoctorModal(false);
                  setEditDoctorData(null);
                  setEditPreviewImage(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={editDoctorData.name || ""}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={editDoctorData.email || ""}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      email: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={editDoctorData.phone || ""}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Specialization *</label>
                <select
                  value={editDoctorData.specialization || ""}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      specialization: e.target.value,
                    })
                  }
                  className="specialization-select"
                >
                  <option value="">Select Specialization</option>
                  <option value="Cardiologist">❤️ Cardiologist</option>
                  <option value="Dermatologist">🧴 Dermatologist</option>
                  <option value="Pediatrician">👶 Pediatrician</option>
                  <option value="Orthopedist">🦴 Orthopedist</option>
                  <option value="Neurologist">🧠 Neurologist</option>
                  <option value="Gynecologist">👩 Gynecologist</option>
                  <option value="Physiotherapist">💪 Physiotherapist</option>
                  <option value="General Physician">
                    🏥 General Physician
                  </option>
                  <option value="ENT Specialist">👂 ENT</option>
                  <option value="Ophthalmologist">👁️ Eye</option>
                  <option value="Psychiatrist">🧠 Psychiatrist</option>
                  <option value="Dentist">🦷 Dentist</option>
                  <option value="Ayurvedic">🌿 Ayurvedic</option>
                  <option value="Homeopathy">💊 Homeopathy</option>
                </select>
              </div>
              <div className="form-group">
                <label>Qualification</label>
                <input
                  type="text"
                  value={editDoctorData.qualification || ""}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      qualification: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Experience</label>
                <input
                  type="text"
                  value={editDoctorData.experience || ""}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      experience: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Consultation Fee (₹) *</label>
                <input
                  type="number"
                  value={editDoctorData.fee || ""}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      fee: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>UPI ID</label>
                <input
                  type="text"
                  value={editDoctorData.upiId || ""}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      upiId: e.target.value,
                    })
                  }
                  placeholder="doctor@okhdfcbank"
                />
              </div>

              <div className="form-group full-width">
                <label>📸 Profile Photo</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    className="file-input"
                    id="edit-doctor-image"
                  />
                  <label
                    htmlFor="edit-doctor-image"
                    className="file-input-label"
                  >
                    {editUploading ? "Uploading..." : "Choose Photo"}
                  </label>

                  {editPreviewImage && (
                    <div className="image-preview">
                      <img src={editPreviewImage} alt="Preview" />
                      <p className="preview-note">Preview</p>
                    </div>
                  )}

                  <p className="hint">
                    Or paste image URL directly:{" "}
                    <input
                      type="text"
                      value={editDoctorData.imageUrl || ""}
                      onChange={(e) =>
                        setEditDoctorData({
                          ...editDoctorData,
                          imageUrl: e.target.value,
                        })
                      }
                      placeholder="https://example.com/doctor.jpg"
                      className="url-input"
                    />
                  </p>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Commission Percentage</label>
                <input
                  type="number"
                  value={editDoctorData.commissionPercentage || 1}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      commissionPercentage: parseInt(e.target.value),
                    })
                  }
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowEditDoctorModal(false);
                  setEditDoctorData(null);
                  setEditPreviewImage(null);
                }}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={handleEditDoctor}
                disabled={editUploading}
              >
                {editUploading ? "Uploading..." : "Update Doctor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Add Doctor Modal */}
      {showAddDoctorModal && (
        <div className="modal-overlay">
          <div className="modal-content add-doctor-modal">
            <div className="modal-header">
              <h2>➕ Add New Doctor</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowAddDoctorModal(false);
                  setPreviewImage(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={newDoctor.name}
                  onChange={(e) =>
                    setNewDoctor({ ...newDoctor, name: e.target.value })
                  }
                  placeholder="Dr. Rajesh Sharma"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newDoctor.email}
                  onChange={(e) =>
                    setNewDoctor({ ...newDoctor, email: e.target.value })
                  }
                  placeholder="doctor@example.com"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={newDoctor.phone}
                  onChange={(e) =>
                    setNewDoctor({ ...newDoctor, phone: e.target.value })
                  }
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="form-group">
                <label>Specialization *</label>
                <select
                  value={newDoctor.specialization}
                  onChange={(e) =>
                    setNewDoctor({
                      ...newDoctor,
                      specialization: e.target.value,
                    })
                  }
                  className="specialization-select"
                >
                  <option value="">Select Specialization</option>
                  <option value="Cardiologist">❤️ Cardiologist</option>
                  <option value="Dermatologist">🧴 Dermatologist</option>
                  <option value="Pediatrician">👶 Pediatrician</option>
                  <option value="Orthopedist">🦴 Orthopedist</option>
                  <option value="Neurologist">🧠 Neurologist</option>
                  <option value="Gynecologist">👩 Gynecologist</option>
                  <option value="Physiotherapist">💪 Physiotherapist</option>
                  <option value="General Physician">
                    🏥 General Physician
                  </option>
                  <option value="ENT Specialist">👂 ENT</option>
                  <option value="Ophthalmologist">👁️ Eye</option>
                  <option value="Psychiatrist">🧠 Psychiatrist</option>
                  <option value="Dentist">🦷 Dentist</option>
                  <option value="Ayurvedic">🌿 Ayurvedic</option>
                  <option value="Homeopathy">💊 Homeopathy</option>
                </select>
              </div>
              <div className="form-group">
                <label>Qualification</label>
                <input
                  type="text"
                  value={newDoctor.qualification}
                  onChange={(e) =>
                    setNewDoctor({
                      ...newDoctor,
                      qualification: e.target.value,
                    })
                  }
                  placeholder="MD, DM Cardiology"
                />
              </div>
              <div className="form-group">
                <label>Experience</label>
                <input
                  type="text"
                  value={newDoctor.experience}
                  onChange={(e) =>
                    setNewDoctor({
                      ...newDoctor,
                      experience: e.target.value,
                    })
                  }
                  placeholder="10+ years"
                />
              </div>
              <div className="form-group">
                <label>Consultation Fee (₹) *</label>
                <input
                  type="number"
                  value={newDoctor.fee}
                  onChange={(e) =>
                    setNewDoctor({ ...newDoctor, fee: e.target.value })
                  }
                  placeholder="500"
                />
              </div>
              <div className="form-group">
                <label>UPI ID (for payments)</label>
                <input
                  type="text"
                  value={newDoctor.upiId}
                  onChange={(e) =>
                    setNewDoctor({ ...newDoctor, upiId: e.target.value })
                  }
                  placeholder="doctor@okhdfcbank"
                />
                <small className="hint">
                  Example: name@okhdfcbank, name@paytm
                </small>
              </div>

              <div className="form-group full-width">
                <label>📸 Profile Photo</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input"
                    id="doctor-image"
                  />
                  <label htmlFor="doctor-image" className="file-input-label">
                    {uploading ? "Uploading..." : "Choose Photo"}
                  </label>

                  {previewImage && (
                    <div className="image-preview">
                      <img src={previewImage} alt="Preview" />
                      <p className="preview-note">Preview</p>
                    </div>
                  )}

                  {newDoctor.imageUrl && !previewImage && (
                    <div className="image-preview">
                      <img src={newDoctor.imageUrl} alt="Uploaded" />
                      <p className="preview-note">Uploaded photo</p>
                    </div>
                  )}

                  <p className="hint">
                    Or paste image URL directly:{" "}
                    <input
                      type="text"
                      value={newDoctor.imageUrl}
                      onChange={(e) =>
                        setNewDoctor({
                          ...newDoctor,
                          imageUrl: e.target.value,
                        })
                      }
                      placeholder="https://example.com/doctor.jpg"
                      className="url-input"
                    />
                  </p>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Commission Percentage</label>
                <input
                  type="number"
                  value={newDoctor.commissionPercentage}
                  onChange={(e) =>
                    setNewDoctor({
                      ...newDoctor,
                      commissionPercentage: parseInt(e.target.value),
                    })
                  }
                  min="0"
                  max="100"
                />
                <p className="note">Default: 1% platform commission</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowAddDoctorModal(false);
                  setPreviewImage(null);
                }}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={handleAddDoctor}
                disabled={
                  !newDoctor.name ||
                  !newDoctor.email ||
                  !newDoctor.fee ||
                  uploading
                }
              >
                {uploading ? "Uploading..." : "Add Doctor"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-tabs">
        <button
          className={activeTab === "dashboard" ? "active" : ""}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          className={activeTab === "appointments" ? "active" : ""}
          onClick={() => setActiveTab("appointments")}
        >
          📋 Appointments
        </button>
        <button
          className={activeTab === "doctors" ? "active" : ""}
          onClick={() => setActiveTab("doctors")}
        >
          👨‍⚕️ Doctors
        </button>
      </div>

      {activeTab === "dashboard" && stats && (
        <div className="dashboard-tab">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">📅</span>
              <div>
                <h3>Total Appointments</h3>
                <p className="stat-number">{stats.totalAppointments || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">👤</span>
              <div>
                <h3>Total Patients</h3>
                <p className="stat-number">{stats.totalPatients || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">👨‍⚕️</span>
              <div>
                <h3>Total Doctors</h3>
                <p className="stat-number">{doctors.length || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">💰</span>
              <div>
                <h3>Total Revenue</h3>
                <p className="stat-number">₹{stats.totalRevenue || 0}</p>
              </div>
            </div>
            <div className="stat-card highlight">
              <span className="stat-icon">💳</span>
              <div>
                <h3>Your Commission (1%)</h3>
                <p className="stat-number">
                  ₹{stats.totalPlatformCommission || calculateTotalCommission()}
                </p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">✅</span>
              <div>
                <h3>Today's Appointments</h3>
                <p className="stat-number">{stats.todayAppointments || 0}</p>
              </div>
            </div>
          </div>

          {/* Commission Due Summary Card - MOVED HERE */}
          {totalCommissionDue > 0 && (
            <div className="verification-summary-card commission-card">
              <div className="summary-header">
                <span className="summary-icon">💰</span>
                <div className="summary-text">
                  <h3>₹{totalCommissionDue} Commission Due</h3>
                  <p>From {commissionDue.length} doctors</p>
                </div>
                <button
                  className="summary-action"
                  onClick={() => setShowCommissionDueModal(true)}
                >
                  Collect Now →
                </button>
              </div>
            </div>
          )}

          <div className="recent-appointments">
            <h2>Recent Appointments</h2>
            <div className="appointments-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Doctor</th>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.slice(0, 5).map((apt) => (
                    <tr key={apt.appointmentId}>
                      <td>{apt.appointmentId}</td>
                      <td>{apt.doctor?.name}</td>
                      <td>{apt.patient?.name}</td>
                      <td>{apt.appointmentDate}</td>
                      <td>{apt.appointmentTime}</td>
                      <td>₹{apt.amount}</td>
                      <td className="commission">
                        ₹{(apt.amount * 0.01).toFixed(2)}
                      </td>
                      <td>
                        <span className={`status-badge ${apt.status}`}>
                          {apt.status === "pending_verification"
                            ? "⏳ Pending"
                            : apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="appointments-tab">
          <div className="filters-section">
            <h2>Filter Appointments</h2>
            <div className="filters-grid">
              <input
                type="text"
                placeholder="Doctor name"
                value={filter.doctor}
                onChange={(e) =>
                  setFilter({ ...filter, doctor: e.target.value })
                }
              />
              <select
                value={filter.status}
                onChange={(e) =>
                  setFilter({ ...filter, status: e.target.value })
                }
              >
                <option value="">All Status</option>
                <option value="pending_verification">
                  ⏳ Pending Verification
                </option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input
                type="date"
                placeholder="Start Date"
                value={filter.startDate}
                onChange={(e) =>
                  setFilter({ ...filter, startDate: e.target.value })
                }
              />
              <input
                type="date"
                placeholder="End Date"
                value={filter.endDate}
                onChange={(e) =>
                  setFilter({ ...filter, endDate: e.target.value })
                }
              />
              <button onClick={handleFilter} className="filter-btn">
                Apply Filters
              </button>
            </div>
          </div>

          <div className="appointments-list">
            <h2>All Appointments ({appointments.length})</h2>

            {/* Desktop Table - Hidden on Mobile */}
            <div className="appointments-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Doctor</th>
                    <th>Patient</th>
                    <th>Email</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Commission</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.appointmentId}>
                      <td>{apt.appointmentId}</td>
                      <td>{apt.doctor?.name}</td>
                      <td>{apt.patient?.name}</td>
                      <td>{apt.patient?.email}</td>
                      <td>{apt.appointmentDate}</td>
                      <td>{apt.appointmentTime}</td>
                      <td>₹{apt.amount}</td>
                      <td className="commission">
                        ₹{(apt.amount * 0.01).toFixed(2)}
                      </td>
                      <td>
                        <span className="payment-badge">
                          {apt.paymentMethod || "UPI"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${apt.status}`}>
                          {apt.status === "pending_verification"
                            ? "⏳ Pending"
                            : apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - Shows only on mobile */}
            <div className="appointments-cards">
              {appointments.map((apt) => (
                <div key={apt.appointmentId} className="appointment-card">
                  <div className="appointment-card-header">
                    <span className="appointment-id">#{apt.appointmentId}</span>
                    <span className={`appointment-status-mobile ${apt.status}`}>
                      {apt.status === "pending_verification"
                        ? "⏳ Pending"
                        : apt.status}
                    </span>
                  </div>

                  <div className="appointment-card-body">
                    <div className="appointment-info-item">
                      <span className="info-label">👨‍⚕️ Doctor</span>
                      <span className="info-value">
                        {apt.doctor?.name || "N/A"}
                      </span>
                    </div>
                    <div className="appointment-info-item">
                      <span className="info-label">👤 Patient</span>
                      <span className="info-value">
                        {apt.patient?.name || "N/A"}
                      </span>
                    </div>
                    <div className="appointment-info-item">
                      <span className="info-label">📧 Email</span>
                      <span className="info-value">
                        {apt.patient?.email || "N/A"}
                      </span>
                    </div>
                    <div className="appointment-info-item">
                      <span className="info-label">📅 Date</span>
                      <span className="info-value">{apt.appointmentDate}</span>
                    </div>
                    <div className="appointment-info-item">
                      <span className="info-label">⏰ Time</span>
                      <span className="info-value">{apt.appointmentTime}</span>
                    </div>
                    <div className="appointment-info-item">
                      <span className="info-label">💳 Payment</span>
                      <span className="info-value">
                        {apt.paymentMethod || "UPI"}
                      </span>
                    </div>
                  </div>

                  <div className="appointment-card-footer">
                    <div className="appointment-amount">₹{apt.amount}</div>
                    <div className="appointment-commission">
                      Commission: <span>₹{(apt.amount * 0.01).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty State for Mobile */}
              {appointments.length === 0 && (
                <div className="no-appointments-mobile">
                  <p>No appointments found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "doctors" && (
        <div className="doctors-tab">
          <div className="doctors-header">
            <h2>Doctor Management ({doctors.length} doctors)</h2>
            <div className="doctors-actions">
              <button
                className="refresh-btn"
                onClick={refreshDoctors}
                disabled={loading}
              >
                <span>🔄</span>
                {loading ? "Refreshing..." : "Refresh Doctors"}
              </button>
              <button
                className="add-doctor-btn"
                onClick={() => setShowAddDoctorModal(true)}
              >
                <span>➕</span>
                Add New Doctor
              </button>
            </div>
          </div>

          <div className="doctor-list-grid">
            {doctors && doctors.length > 0 ? (
              doctors.map((doc) => (
                <div key={doc._id} className="doctor-card">
                  <div className="doctor-card-header">
                    <img
                      src={doc.imageUrl || getDoctorImage(doc.name)}
                      alt={doc.name}
                      className="doctor-card-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://via.placeholder.com/60x60/2563eb/ffffff?text=Dr";
                      }}
                    />
                    <div className="doctor-card-title">
                      <h3>{doc.name}</h3>
                      <span className="doctor-specialization-badge">
                        {doc.specialization}
                      </span>
                    </div>
                  </div>

                  <div className="doctor-card-details">
                    <p>
                      <strong>📧 Email:</strong> {doc.email}
                    </p>
                    <p>
                      <strong>📞 Phone:</strong> {doc.phone || "Not set"}
                    </p>
                    <p>
                      <strong>💰 Fee:</strong> ₹{doc.fee}
                    </p>
                    <p>
                      <strong>💳 UPI:</strong>
                      <span className="upi-text">{doc.upiId || "Not set"}</span>
                    </p>
                    <p>
                      <strong>📊 Commission:</strong>{" "}
                      {doc.commissionPercentage || 1}%
                    </p>
                    {doc.paymentStats?.totalCommissionPaid > 0 && (
                      <p className="commission-due-badge">
                        <strong>💰 Commission Due:</strong>
                        <span>₹{doc.paymentStats.totalCommissionPaid}</span>
                        {doc.lateFees > 0 && (
                          <span className="late-fees">
                            {" "}
                            + ₹{doc.lateFees} fees
                          </span>
                        )}
                      </p>
                    )}
                    {doc.paymentStatus === "restricted" && (
                      <p className="restricted-badge">⛔ Account Restricted</p>
                    )}
                  </div>

                  <div className="doctor-card-stats">
                    <div className="stat">
                      <span>Appointments</span>
                      <strong>{doc.totalAppointments || 0}</strong>
                    </div>
                    <div className="stat">
                      <span>Earnings</span>
                      <strong>₹{doc.totalEarnings || 0}</strong>
                    </div>
                    <div className="stat highlight">
                      <span>Your 1%</span>
                      <strong>
                        ₹{Math.round((doc.totalEarnings || 0) * 0.01)}
                      </strong>
                    </div>
                  </div>

                  <div className="doctor-card-actions">
                    <button
                      className="action-btn qr-btn" // ✅ Added "action-btn"
                      onClick={() => handleViewQR(doc)}
                      title="View QR Code"
                    >
                      📱 QR
                    </button>
                    <button
                      className="action-btn email-btn" // ✅ Added "action-btn"
                      onClick={() => sendLoginEmail(doc)}
                      title="Send Login Details"
                    >
                      📧 Email
                    </button>
                    <button
                      className="action-btn password-btn" // ✅ Added "action-btn"
                      onClick={() => {
                        if (doc.password) {
                          navigator.clipboard
                            .writeText(doc.password)
                            .then(() => {
                              alert(
                                `✅ Password copied!\n\nPassword: ${doc.password}\n\nNow paste in login form`,
                              );
                            });
                        } else {
                          alert(`❌ Password not found`);
                        }
                      }}
                    >
                      <span>📋</span>C-PW
                    </button>
                    <button
                      className="action-btn reset-btn" // ✅ Added "action-btn"
                      onClick={() => resetPassword(doc)}
                      title="Reset Password"
                    >
                      🔑 Reset
                    </button>
                    <button
                      className="action-btn edit-btn" // ✅ Added "action-btn"
                      onClick={() => handleEditClick(doc)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="action-btn delete-btn" // ✅ Added "action-btn"
                      onClick={() => handleDeleteDoctor(doc)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-doctors">
                <p>No doctors added yet</p>
                <button
                  className="add-first-doctor-btn"
                  onClick={() => setShowAddDoctorModal(true)}
                >
                  ➕ Add Your First Doctor
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
