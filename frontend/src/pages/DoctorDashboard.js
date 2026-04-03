// D:\Projects\DoctorBooking\frontend\src\pages\DoctorDashboard.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Doctor.css";

function DoctorDashboard({ doctor, onLogout }) {
  // Fix: backend returns "id" but dashboard expects "doctorId"
  const doctorId = doctor?.id || doctor?.doctorId || doctor?._id;

  const [activeTab, setActiveTab] = useState("dashboard");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    pendingVerification: 0,
    totalEarnings: 0,
    todayAppointments: 0,
    upcomingCount: 0,
  });
  const [upiId, setUpiId] = useState(doctor?.upiId || "");
  const [showQR, setShowQR] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showPayCommissionModal, setShowPayCommissionModal] = useState(false);
  const [showPaymentQR, setShowPaymentQR] = useState(false); // ← ADD THIS LINE
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

  // Commission Payment States
  const [paymentTransactionId, setPaymentTransactionId] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

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

  useEffect(() => {
    if (doctor && doctorId) {
      fetchAllData();
      fetchAvailability();
      fetchPaymentHistory();
    }
  }, [doctor, doctorId]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAppointments(),
      fetchStats(),
      fetchCommission(),
      fetchPatients(),
      fetchMedicalRecords(),
    ]);
    setLoading(false);
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/doctor/payment-history/${doctorId}`
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
      const response = await axios.get(
        `http://localhost:5000/api/doctor/appointments/${doctorId}`
      );
      if (response.data.success) {
        setAppointments(response.data.appointments);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/doctor/dashboard/${doctorId}`
      );
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
      const response = await axios.get(
        `http://localhost:5000/api/doctor/${doctorId}/commission`
      );
      if (response.data.success) {
        setCommissionData(response.data);
      }
    } catch (error) {
      console.error("Error fetching commission:", error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/doctor/patients/${doctorId}`
      );
      if (response.data.success) {
        setPatients(response.data.patients);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/upload/doctor/${doctorId}`
      );
      if (response.data.success) {
        setMedicalRecords(response.data.records);
      }
    } catch (error) {
      console.error("Error fetching medical records:", error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/availability/${doctorId}`
      );
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
      setAvailability({
        monday: { start: "09:00", end: "17:00", enabled: true },
        tuesday: { start: "09:00", end: "17:00", enabled: true },
        wednesday: { start: "09:00", end: "17:00", enabled: true },
        thursday: { start: "09:00", end: "17:00", enabled: true },
        friday: { start: "09:00", end: "17:00", enabled: true },
        saturday: { start: "09:00", end: "17:00", enabled: true },
        sunday: { start: "09:00", end: "17:00", enabled: false },
      });
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
          weeklySchedule.push({
            day,
            isAvailable: data.enabled,
            timeRanges: data.enabled
              ? [{ start: data.start, end: data.end }]
              : [],
            breaks: [],
          });
        }
      }

      const response = await axios.put(
        `http://localhost:5000/api/availability/${doctorId}/weekly`,
        { weeklySchedule }
      );
      if (response.data.success) {
        showNotificationMsg("✅ Availability updated successfully!", "success");
      }
    } catch (error) {
      showNotificationMsg("✅ Availability saved locally!", "success");
      console.log("Availability saved locally (API not ready yet)");
    }
  };

  const verifyPayment = async (appointmentId) => {
    try {
      console.log("🔍 Verifying payment for appointment:", appointmentId);
      console.log("👨‍⚕️ Doctor ID:", doctorId);

      const response = await axios.post(
        `http://localhost:5000/api/doctor/verify/${appointmentId}`,
        { doctorId: doctorId }
      );

      if (response.data.success) {
        showNotificationMsg("✅ Payment verified successfully!", "success");
        fetchAppointments();
        fetchStats();
        setLastUpdated(new Date());
      } else {
        showNotificationMsg(
          response.data.message || "❌ Verification failed",
          "error"
        );
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      showNotificationMsg(
        error.response?.data?.message || "❌ Failed to verify payment",
        "error"
      );
    }
  };

  const completeAppointment = async (appointmentId) => {
    try {
      const response = await axios.patch(
        `http://localhost:5000/api/doctor/appointments/${appointmentId}`,
        { status: "completed" }
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
      const response = await axios.patch(
        `http://localhost:5000/api/doctor/appointments/${appointmentId}`,
        { status: "cancelled" }
      );
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

  const updateUpiId = async () => {
    if (!upiId) {
      showNotificationMsg("Please enter UPI ID", "error");
      return;
    }
    try {
      const response = await axios.patch(
        `http://localhost:5000/api/doctor/${doctorId}/upi`,
        { upiId }
      );
      if (response.data.success) {
        showNotificationMsg("✅ UPI ID updated successfully!", "success");
        doctor.upiId = upiId;
        setShowUPIModal(false);
      }
    } catch (error) {
      console.error("Error updating UPI:", error);
      showNotificationMsg("❌ Failed to update UPI ID", "error");
    }
  };

  const payCommission = async () => {
    if (!paymentTransactionId) {
      showNotificationMsg("Please enter transaction ID", "error");
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/api/doctor/pay-commission`,
        {
          doctorId: doctorId,
          amount: commissionData?.due || 0,
          transactionId: paymentTransactionId,
        }
      );

      if (response.data.success) {
        showNotificationMsg("✅ Payment successful! Commission paid.", "success");
        setPaymentTransactionId("");
        setShowPayCommissionModal(false);
        fetchCommission();
        fetchPaymentHistory();
        setLastUpdated(new Date());
      } else {
        showNotificationMsg(response.data.message || "❌ Payment failed", "error");
      }
    } catch (error) {
      console.error("Payment error:", error);
      showNotificationMsg(error.response?.data?.message || "❌ Payment failed", "error");
    } finally {
      setProcessingPayment(false);
    }
  };

  const showNotificationMsg = (message, type) => {
    setShowNotification({ show: true, message, type });
    setTimeout(
      () => setShowNotification({ show: false, message: "", type: "" }),
      3000
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
    (apt) => apt.appointmentDate === today
  );
  const upcomingAppointments = appointments.filter(
    (apt) => apt.appointmentDate > today && apt.status !== "cancelled"
  );
  const pendingAppointments = appointments.filter(
    (apt) => apt.status === "pending_verification"
  );

  const filteredAppointments = appointments.filter((apt) => {
    if (filterStatus !== "all" && apt.status !== filterStatus) return false;
    if (filterDate && apt.appointmentDate !== filterDate) return false;
    return true;
  });

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    {
      id: "verify",
      label: "Verify Payment",
      badge: pendingAppointments.length,
    },
    { id: "appointments", label: "Appointments" },
    { id: "patients", label: "My Patients" },
    { id: "availability", label: "Availability" },
    { id: "records", label: "Medical Records" },
    { id: "earnings", label: "Earnings" },
  ];

  return (
    <div className="doctor-dashboard">
      {showNotification.show && (
        <div className={`notification ${showNotification.type}`}>
          {showNotification.message}
        </div>
      )}

      <header className="doctor-header">
        <div className="doctor-header-left">
          <div className="doctor-profile-mini">
            <img
              src={doctor?.imageUrl || "https://via.placeholder.com/60"}
              alt={doctor?.name}
              className="doctor-avatar-img"
              onError={(e) => (e.target.src = "https://via.placeholder.com/60")}
            />
            <div>
              <h1>{doctor?.name}</h1>
              <div className="doctor-specialization">
                {doctor?.specialization}
              </div>
              <div className="doctor-fee">
                Consultation Fee: ₹{doctor?.fee}{" "}
                <span className="fee-note">(includes 1% platform fee)</span>
              </div>
            </div>
          </div>
        </div>
        <div className="doctor-header-right">
          <div className="upi-status-container">
            <div
              className={`upi-status ${doctor?.upiId ? "active" : "inactive"}`}
            >
              <span className="upi-icon">💳</span>
              UPI: {doctor?.upiId || "Not set"}
            </div>
            <button
              className="view-qr-small"
              onClick={() => setShowQR(!showQR)}
            >
              {showQR ? "Hide QR" : "View QR"}
            </button>
          </div>
          {showQR && doctor?.upiId && (
            <div className="qr-popup">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${doctor?.upiId}&pn=Doctor&cu=INR`}
                alt="QR Code"
              />
              <p className="qr-amount">₹{doctor?.fee}</p>
            </div>
          )}

          <button
            className="header-btn payment-history-header-btn"
            onClick={() => setShowPaymentHistoryModal(true)}
          >
            📜 Payment History
          </button>

          <button
            className="header-btn upi-settings-header-btn"
            onClick={() => setShowUPIModal(true)}
          >
            ⚙️ UPI Settings
          </button>

          <button
            className="header-btn commission-header-btn"
            onClick={() => setShowCommissionModal(true)}
          >
            💰 Commission Report
          </button>

          {/* ✅ NEW: Pay Commission Button - Shows only when due > 0 */}
          {commissionData?.due > 0 && (
            <button
              className="header-btn pay-commission-header-btn"
              onClick={() => setShowPayCommissionModal(true)}
            >
              💰 Pay Commission (₹{commissionData.due})
            </button>
          )}

          <button className="logout-btn" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Pay Commission Modal */}
      {showPayCommissionModal && (
        <div className="modal-overlay" onClick={() => setShowPayCommissionModal(false)}>
          <div className="modal-content pay-commission-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 Pay Commission</h2>
              <button className="close-btn" onClick={() => setShowPayCommissionModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="due-amount-card">
                <span>Amount Due:</span>
                <strong>₹{commissionData?.due || 0}</strong>
              </div>
              <div className="payment-note">
                <p>💡 Use the UPI ID from the header to make payment.</p>
                <p>📱 UPI ID: <strong>{doctor?.upiId || "Not set"}</strong></p>
              </div>
              <div className="payment-form">
                <input
                  type="text"
                  id="transactionId"
                  name="transactionId"
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

      <div className="refresh-indicator">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      <div className="doctor-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.badge > 0 && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      <div className="doctor-main-content">
        {/* Dashboard Tab */}
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
                  onClick={() => setShowCommissionModal(true)}
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

        {/* UPI Settings Modal */}
        {showUPIModal && (
          <div className="modal-overlay" onClick={() => setShowUPIModal(false)}>
            <div
              className="modal-content upi-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>⚙️ UPI Settings</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowUPIModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="upi-current">
                  <h3>Current UPI ID</h3>
                  <div className="current-upi">
                    {doctor?.upiId || "Not Set"}
                  </div>
                </div>
                <div className="qr-preview">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${doctor?.upiId || upiId}&pn=Doctor&cu=INR`}
                    alt="QR Code"
                  />
                  <p>QR Code for payments</p>
                </div>
                <div className="upi-update-form">
                  <h3>Update UPI ID</h3>
                  <input
                    type="text"
                    id="upiId"
                    name="upiId"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="Enter UPI ID (e.g., name@okhdfcbank)"
                    autoComplete="off"
                  />
                  <p className="upi-note">
                    This UPI ID will be used for all payments
                  </p>
                  <button className="update-btn" onClick={updateUpiId}>
                    Update UPI ID
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
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "8px",
                      }}
                    >
                      Payments made to admin will appear here.
                    </p>
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

        {/* Verify Payment Tab */}
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

        {/* Appointments Tab */}
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
                  placeholder="Filter by date"
                />
              </div>
            </div>

            {loading ? (
              <div className="doctor-loading">
                <div className="spinner"></div>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="no-data">No appointments found</div>
            ) : (
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
                      let statusText = "";
                      let statusClass = "";

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
                          <td className="patient-cell">{apt.patient?.name}</td>
                          <td className="contact-cell">{apt.patient?.phone}</td>
                          <td
                            className="symptoms-cell"
                            style={{
                              maxWidth: "150px",
                              wordBreak: "break-word",
                            }}
                          >
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
                                  const action = e.target.value;
                                  if (action === "complete") {
                                    completeAppointment(apt._id);
                                  } else if (action === "cancel") {
                                    rejectAppointment(apt._id);
                                  }
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
            )}
          </div>
        )}
        
        {/* Patients Tab */}
        {activeTab === "patients" && (
          <div className="patients-tab">
            <h2>My Patients</h2>
            {patients.length === 0 ? (
              <div className="no-data">No patients yet</div>
            ) : (
              <div className="patients-grid">
                {patients.map((patient) => (
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
                        <strong>{patient.visitCount}</strong>
                      </div>
                      <div className="stat">
                        <span>Last Visit</span>
                        <strong>{formatDate(patient.lastVisit)}</strong>
                      </div>
                    </div>
                    <button
                      className="view-details-btn"
                      onClick={() => setActiveTab("records")}
                    >
                      View Medical Records
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Availability Tab */}
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
            <button
              className="save-availability-btn"
              onClick={updateAvailability}
            >
              Save Availability Schedule
            </button>
          </div>
        )}

        {/* Medical Records Tab */}
        {activeTab === "records" && (
          <div className="records-tab">
            <h2>Medical Records</h2>
            {medicalRecords.length === 0 ? (
              <div className="no-data">No medical records uploaded</div>
            ) : (
              <div className="records-grid">
                {medicalRecords.map((record) => (
                  <div key={record._id} className="record-card">
                    <div className="record-icon">📄</div>
                    <div className="record-info">
                      <h4>{record.filename}</h4>
                      <p className="record-patient">
                        Patient: {record.patientName}
                      </p>
                      <p className="record-date">
                        Uploaded: {formatDate(record.uploadedAt)}
                      </p>
                    </div>
                    <div className="record-actions">
                      <a
                        href={`http://localhost:5000${record.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-btn"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Earnings Tab with Commission Payment */}
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

              {/* Commission Payment Card - Shows when due > 0 */}
              {commissionData?.due > 0 && (
                <div className="commission-payment-card">
                  <h3>💰 Pay Commission</h3>
                  <div className="payment-info">
                    <div className="due-amount-card">
                      <span>Amount Due:</span>
                      <strong>₹{commissionData.due}</strong>
                    </div>
                    <div className="platform-upi">
                      <span>Platform UPI ID:</span>
                      <code>
                        {commissionData.platformUpiId || "platform@okhdfcbank"}
                      </code>
                      <button
                        className="copy-upi-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            commissionData.platformUpiId ||
                              "platform@okhdfcbank",
                          );
                          showNotificationMsg("UPI ID copied!", "success");
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div className="payment-steps">
                    <h4>Payment Instructions:</h4>
                    <ol>
                      <li>Copy UPI ID above or scan QR code</li>
                      <li>Pay ₹{commissionData.due} to the platform UPI</li>
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
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${commissionData.platformUpiId || "platform@okhdfcbank"}&am=${commissionData.due}&pn=Doctor%20Online&cu=INR`}
                        alt="Payment QR Code"
                      />
                      <p>Scan to pay ₹{commissionData.due}</p>
                    </div>
                  )}

                  <div className="payment-form">
                    <input
                      type="text"
                      id="transactionId"
                      name="transactionId"
                      placeholder="Enter UPI Transaction ID (e.g., 1234567890)"
                      value={paymentTransactionId}
                      onChange={(e) => setPaymentTransactionId(e.target.value)}
                    />
                    <button
                      className="pay-commission-btn"
                      onClick={payCommission}
                      disabled={!paymentTransactionId || processingPayment}
                    >
                      {processingPayment
                        ? "Processing..."
                        : "✓ Confirm Payment"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Commission Modal */}
      {showCommissionModal && commissionData && (
        <div
          className="modal-overlay"
          onClick={() => setShowCommissionModal(false)}
        >
          <div
            className="modal-content commission-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="commission-modal-header">
              <div className="header-title">
                <span className="header-icon">💰</span>
                <h2>Commission Report</h2>
              </div>
              <button
                className="doctor-close-btn"
                onClick={() => setShowCommissionModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="commission-modal-content">
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

              <div
                className="commission-details"
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    marginBottom: "10px",
                    color: "#1e293b",
                  }}
                >
                  Summary
                </h3>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Total Earnings:</span>
                  <strong>₹{commissionData.totalEarnings || 0}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Commission Rate:</span>
                  <strong>{commissionData.commissionPercentage || 1}%</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "8px",
                    marginTop: "8px",
                  }}
                >
                  <span>Net Earnings:</span>
                  <strong>
                    ₹
                    {(commissionData.totalEarnings || 0) -
                      (commissionData.totalCommission || 0)}
                  </strong>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="close-modal-btn"
                onClick={() => setShowCommissionModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;
