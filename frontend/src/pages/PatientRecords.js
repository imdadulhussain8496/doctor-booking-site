import React, { useState, useEffect } from "react";
import axios from "axios";
import "./PatientRecords.css";

// Set axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:5000";

function PatientRecords() {
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("records");
  const [patientInfo, setPatientInfo] = useState(null);

  // Get email from URL manually (without router)
  const getEmailFromUrl = () => {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get("email");
  };

  const email = getEmailFromUrl();

  useEffect(() => {
    if (email) {
      fetchPatientRecords();
      fetchPatientAppointments();
    } else {
      console.error("No email found in URL");
      setLoading(false);
    }
  }, [email]);

  const fetchPatientRecords = async () => {
    try {
      console.log("📄 Fetching medical records for email:", email);
      const response = await axios.get(`/api/upload/patient/${email}`);
      console.log("✅ Records response:", response.data);
      setRecords(response.data.records || []);

      if (response.data.records && response.data.records.length > 0) {
        setPatientInfo({
          name: response.data.records[0].patientName,
          email: email,
        });
      }
    } catch (error) {
      console.error("❌ Error fetching records:", error);
    }
  };

  const fetchPatientAppointments = async () => {
    try {
      console.log("📅 Fetching appointments for email:", email);
      const response = await axios.get(`/api/appointments/${encodeURIComponent(email)}`);
      console.log("✅ Appointments response:", response.data);
      setAppointments(response.data.appointments || []);
      
      if (!patientInfo && response.data.appointments?.length > 0) {
        setPatientInfo({
          name: response.data.appointments[0].patient?.name || "Patient",
          email: email,
        });
      }
    } catch (error) {
      console.error("❌ Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'confirmed': return 'status-badge confirmed';
      case 'completed': return 'status-badge completed';
      case 'cancelled': return 'status-badge cancelled';
      default: return 'status-badge';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="records-loading">
        <div className="spinner"></div>
        <p>Loading your medical history...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="error-container">
        <div className="error-icon">❌</div>
        <h2>Invalid Access</h2>
        <p>No email address provided. Please go back to your appointments.</p>
        <button
          className="patient-home-btn"
          onClick={() => (window.location.href = "/")}
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="patient-records-container">
      <header className="records-header">
        <div className="header-left">
          <h1>🏥 My Health Dashboard</h1>
          {patientInfo && (
            <p className="patient-greeting">Welcome back, {patientInfo.name}!</p>
          )}
        </div>
        <div className="header-buttons">
          <button
            className="back-btn"
            onClick={() => (window.location.href = "/")}
          >
            ← Book New Appointment
          </button>
        </div>
      </header>

      {patientInfo && (
        <div className="patient-summary-card">
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Total Appointments</span>
              <span className="stat-value">{appointments.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Medical Records</span>
              <span className="stat-value">{records.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Spent</span>
              <span className="stat-value">
                ₹{appointments
                  .filter(apt => apt.status !== 'cancelled')
                  .reduce((sum, apt) => sum + (apt.amount || 0), 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="records-tabs">
        <button
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          📅 Appointments ({appointments.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          📄 Medical Records ({records.length})
        </button>
      </div>

      {activeTab === 'appointments' && (
        <div className="appointments-section">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>No Appointments Yet</h3>
              <p>Book your first appointment with a doctor</p>
              <button
                className="primary-btn"
                onClick={() => (window.location.href = "/")}
              >
                Book Now
              </button>
            </div>
          ) : (
            <div className="appointments-list">
              {appointments.map((apt) => (
                <div key={apt.appointmentId || apt._id} className="appointment-card">
                  <div className="appointment-header">
                    <div className="doctor-info">
                      <h3>Dr. {apt.doctor?.name}</h3>
                      <span className="specialization">{apt.doctor?.specialization}</span>
                    </div>
                    <span className={getStatusBadgeClass(apt.status)}>
                      {apt.status || 'confirmed'}
                    </span>
                  </div>
                  
                  <div className="appointment-details">
                    <div className="detail-row">
                      <span className="detail-label">📅 Date:</span>
                      <span className="detail-value">{formatDate(apt.appointmentDate)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">⏰ Time:</span>
                      <span className="detail-value">{apt.appointmentTime || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">💰 Amount:</span>
                      <span className="detail-value amount">₹{apt.amount || 0}</span>
                    </div>
                    {apt.paymentMethod && (
                      <div className="detail-row">
                        <span className="detail-label">💳 Payment:</span>
                        <span className="detail-value">{apt.paymentMethod}</span>
                      </div>
                    )}
                    {apt.patient?.symptoms && (
                      <div className="detail-row symptoms">
                        <span className="detail-label">📝 Symptoms:</span>
                        <span className="detail-value">{apt.patient.symptoms}</span>
                      </div>
                    )}
                  </div>

                  <div className="appointment-footer">
                    <span className="appointment-id">
                      ID: {apt.appointmentId || apt._id?.slice(-6)}
                    </span>
                    {apt.transactionId && (
                      <span className="transaction-id">
                        TXN: {apt.transactionId.slice(-8)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'records' && (
        <div className="records-section">
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>No Medical Records Found</h3>
              <p>Your medical records will appear here once your doctor uploads them</p>
            </div>
          ) : (
            <div className="records-grid">
              {records.map((record) => (
                <div key={record.recordId} className="record-card">
                  <div className="record-icon">
                    {record.fileType === "xray" && "🦷"}
                    {record.fileType === "prescription" && "📋"}
                    {record.fileType === "lab_report" && "🔬"}
                    {record.fileType === "mri" && "🧠"}
                    {record.fileType === "ct" && "🫁"}
                    {record.fileType === "other" && "📄"}
                  </div>
                  <div className="record-info">
                    <h3>{record.title || 'Medical Record'}</h3>
                    <p className="record-doctor">Dr. {record.doctorName}</p>
                    <p className="record-date">
                      {record.recordDate
                        ? new Date(record.recordDate).toLocaleDateString()
                        : "N/A"}
                    </p>
                    {record.description && (
                      <p className="record-description">{record.description}</p>
                    )}
                    <div className="record-meta">
                      <span className="record-type">{record.fileType}</span>
                      <span className="record-size">
                        {record.formattedFileSize || 'N/A'}
                      </span>
                    </div>
                    {record.tags && record.tags.length > 0 && (
                      <div className="record-tags">
                        {record.tags.map((tag, i) => (
                          <span key={i} className="tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="record-actions">
                    <button
                      className="view-btn"
                      onClick={() => window.open(record.fileUrl, "_blank")}
                    >
                      View File
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PatientRecords;