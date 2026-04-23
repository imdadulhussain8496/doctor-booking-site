// D:\Projects\DoctorBooking\frontend\src\App.js
import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { getDoctorImage } from "./utils/doctorImages";
import { AuthProvider } from "./context/AuthContext";

// Import Admin Pages
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

// Import Doctor Pages
import DoctorLogin from "./pages/DoctorLogin";
import DoctorDashboard from "./pages/DoctorDashboard";

// Set axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = "http://localhost:5000";

function App() {
  // State Management
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDetails, setBookingDetails] = useState({
    name: "",
    age: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    symptoms: "",
  });
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState(
    "Checking backend connection...",
  );
  const [appointments, setAppointments] = useState([]);
  const [showAppointments, setShowAppointments] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showDoctorsList, setShowDoctorsList] = useState(false);
  const [dbDoctors, setDbDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [showUPIPayment, setShowUPIPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [patientEmail, setPatientEmail] = useState("");

  // 🆕 View All Slots Modal State
  const [showAllSlotsModal, setShowAllSlotsModal] = useState(false);
  const [selectedSlotDoctor, setSelectedSlotDoctor] = useState(null);
  const [allDoctorSlots, setAllDoctorSlots] = useState([]);

  // Helper function to convert 24-hour to 12-hour AM/PM format
  const formatTo12Hour = (time24) => {
    if (!time24) return "";
    let timePart = time24.split(" ")[0];
    let [hours, minutes] = timePart.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time24;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // 🆕 Fetch all slots for a doctor
  const fetchAllSlotsForDoctor = async (doctor) => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const currentTime = today.getHours() * 60 + today.getMinutes();

      // Check if doctor's availableSlot shows "Tomorrow"
      let dateToFetch = todayStr;
      let dateLabel = "today";

      if (doctor.availableSlot && doctor.availableSlot.startsWith("Tomorrow")) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateToFetch = tomorrow.toISOString().split("T")[0];
        dateLabel = "tomorrow";
      }

      const response = await axios.get(
        `/api/availability/${doctor.doctorId || doctor.id}/slots/${dateToFetch}`,
      );

      if (response.data.success && response.data.slots) {
        let slotsToShow = response.data.slots;

        // Only filter for today, show all for tomorrow
        if (dateLabel === "today") {
          slotsToShow = response.data.slots.filter((slot) => {
            let hours = parseInt(slot.start.split(":")[0]);
            const minutes = parseInt(slot.start.split(":")[1]);
            const slotTimeMinutes = hours * 60 + minutes;
            return slotTimeMinutes > currentTime + 15;
          });
        }

        // Helper function to get time category
        const getTimeCategory = (time12hr) => {
          const timeStr = time12hr.toLowerCase();
          if (timeStr.includes("am")) {
            return "morning";
          }
          // For PM times
          const hour = parseInt(time12hr.split(":")[0]);
          if (hour >= 1 && hour <= 4) {
            return "afternoon";
          }
          return "evening";
        };

        const formattedSlots = slotsToShow.map((slot) => {
          const time12hr = formatTo12Hour(slot.start);
          const category = getTimeCategory(time12hr);
          return { time: time12hr, category };
        });

        if (formattedSlots.length > 0) {
          setAllDoctorSlots(formattedSlots);
          setSelectedSlotDoctor(doctor);
          setShowAllSlotsModal(true);
        } else {
          alert(`No available slots for ${dateLabel}`);
        }
      } else {
        alert(`No available slots for ${dateLabel}`);
      }
    } catch (error) {
      console.error("Error fetching all slots:", error);
      alert("Failed to fetch slots");
    }
  };

  // Doctors Data with images (fallback)
  const fallbackDoctors = [
    {
      id: 1,
      name: "Dr. Rajesh Sharma",
      specialization: "Cardiologist",
      fee: 500,
      experience: "10+ years",
      qualification: "MD, DM Cardiology",
      rating: 4.8,
      reviews: 1632,
      clinic: "Downtown Medical Center",
      availableSlot: "Today 4:00 PM, 5:00 PM",
      image: "👨‍⚕️",
      email: "sharma@doctor.com",
      upiId: "sharma@okhdfcbank",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=sharma@okhdfcbank&pn=Doctor&cu=INR",
    },
    {
      id: 2,
      name: "Dr. Priya Patel",
      specialization: "Dermatologist",
      fee: 400,
      experience: "8+ years",
      qualification: "MD Dermatology",
      rating: 4.7,
      reviews: 1245,
      clinic: "Skin Care Clinic",
      availableSlot: "Today 3:30 PM, 4:30 PM",
      image: "👩‍⚕️",
      email: "patel@doctor.com",
      upiId: "patel@okhdfcbank",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=patel@okhdfcbank&pn=Doctor&cu=INR",
    },
    {
      id: 3,
      name: "Dr. Amit Kumar",
      specialization: "Pediatrician",
      fee: 300,
      experience: "12+ years",
      qualification: "MD Pediatrics",
      rating: 4.9,
      reviews: 2100,
      clinic: "Child Care Hospital",
      availableSlot: "Today 2:00 PM, 3:00 PM",
      image: "👨‍⚕️",
      email: "kumar@doctor.com",
      upiId: "kumar@okhdfcbank",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=kumar@okhdfcbank&pn=Doctor&cu=INR",
    },
    {
      id: 4,
      name: "Dr. Sunita Gupta",
      specialization: "Orthopedist",
      fee: 600,
      experience: "15+ years",
      qualification: "MS Orthopedics",
      rating: 4.8,
      reviews: 987,
      clinic: "Ortho Care Center",
      availableSlot: "Today 5:00 PM, 6:00 PM",
      image: "👩‍⚕️",
      email: "gupta@doctor.com",
      upiId: "gupta@okhdfcbank",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=gupta@okhdfcbank&pn=Doctor&cu=INR",
    },
  ];

  // Listen for URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event("popstate"));
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("popstate"));
    };

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  // Fetch doctors from database
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await axios.get("/api/admin/doctors?limit=20");
      if (response.data.success) {
        const doctors = response.data.doctors;

        const doctorsWithRealSlots = await Promise.all(
          doctors.map(async (doctor) => {
            try {
              const today = new Date();
              const todayStr = today.toISOString().split("T")[0];
              const currentTime = today.getHours() * 60 + today.getMinutes();

              // Try today's slots first
              let slotsRes = await axios.get(
                `/api/availability/${doctor.doctorId || doctor.id}/slots/${todayStr}`,
              );
              let targetDate = "Today";
              let futureSlots = [];

              if (
                slotsRes.data.success &&
                slotsRes.data.slots &&
                slotsRes.data.slots.length > 0
              ) {
                futureSlots = slotsRes.data.slots.filter((slot) => {
                  let hours = parseInt(slot.start.split(":")[0]);
                  const minutes = parseInt(slot.start.split(":")[1]);
                  const slotTimeMinutes = hours * 60 + minutes;
                  return slotTimeMinutes > currentTime + 15;
                });
              }

              // If no slots today, get tomorrow's slots
              if (futureSlots.length === 0) {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split("T")[0];

                slotsRes = await axios.get(
                  `/api/availability/${doctor.doctorId || doctor.id}/slots/${tomorrowStr}`,
                );
                targetDate = "Tomorrow";

                if (
                  slotsRes.data.success &&
                  slotsRes.data.slots &&
                  slotsRes.data.slots.length > 0
                ) {
                  futureSlots = slotsRes.data.slots;
                }
              }

              if (futureSlots.length > 0) {
                const timeSlots = futureSlots
                  .slice(0, 2)
                  .map((slot) => {
                    return formatTo12Hour(slot.start);
                  })
                  .join(", ");

                doctor.availableSlot = `${targetDate} ${timeSlots}`;
                doctor.allSlotsCount = futureSlots.length;
              } else {
                doctor.availableSlot = "No slots available";
                doctor.allSlotsCount = 0;
              }
            } catch (error) {
              console.error(`Error fetching slots for ${doctor.name}:`, error);
              doctor.availableSlot = "No slots available";
              doctor.allSlotsCount = 0;
            }
            return doctor;
          }),
        );

        setDbDoctors(doctorsWithRealSlots);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setDbDoctors(fallbackDoctors);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (selectedDoctor && bookingDetails.date) {
        setLoadingSlots(true);
        try {
          const response = await axios.get(`/api/available-slots`, {
            params: {
              doctorName: selectedDoctor.name,
              date: bookingDetails.date,
            },
          });

          let slots = response.data.availableSlots || [];

          const today = new Date();
          const todayStr = today.toISOString().split("T")[0];

          if (bookingDetails.date === todayStr) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            slots = slots.filter((slot) => {
              const [time, period] = slot.split(" ");
              let [hours, minutes] = time.split(":").map(Number);

              if (period === "PM" && hours !== 12) hours += 12;
              if (period === "AM" && hours === 12) hours = 0;

              const slotTotalMinutes = hours * 60 + minutes;
              const currentTotalMinutes = currentHour * 60 + currentMinute;

              return slotTotalMinutes > currentTotalMinutes + 15;
            });
          }

          setAvailableSlots(slots);

          if (bookingDetails.time && !slots.includes(bookingDetails.time)) {
            setBookingDetails((prev) => ({ ...prev, time: "" }));
          }
        } catch (error) {
          console.error("Error fetching slots:", error);
        } finally {
          setLoadingSlots(false);
        }
      }
    };

    fetchAvailableSlots();
  }, [selectedDoctor, bookingDetails.date]);

  // Test backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await axios.get("/ping");
        setBackendStatus(`✅ Connected to backend`);
      } catch (error) {
        setBackendStatus("🔴 Demo Mode");
        console.warn("Backend not available");
      }
    };
    checkBackend();

    const params = new URLSearchParams(window.location.search);
    if (params.get("show") === "appointments") {
      setShowAppointments(true);
    }
  }, []);

  // Save appointments to localStorage (backup only)
  useEffect(() => {
    if (appointments.length > 0) {
      localStorage.setItem(
        "doctorOnlineAppointments",
        JSON.stringify(appointments),
      );
    }
  }, [appointments]);

  // Booking Handlers
  const handleBookDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setStep(2);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (
      !bookingDetails.name ||
      !bookingDetails.age ||
      !bookingDetails.email ||
      !bookingDetails.phone ||
      !bookingDetails.date ||
      !bookingDetails.time
    ) {
      alert("Please fill all required fields");
      return;
    }
    setStep(3);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchAppointmentsByEmail = async (email) => {
    // Email validation
    if (!email || !email.includes("@") || !email.includes(".")) {
      alert("❌ Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/appointments/${email}`);

      if (response.data.success) {
        if (
          response.data.appointments &&
          response.data.appointments.length > 0
        ) {
          setAppointments(response.data.appointments);
          setShowAppointments(true);
        } else {
          alert("📋 No appointments found for this email. Book one now!");
        }
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      alert("❌ Error finding appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentDone = async () => {
    setLoading(true);
    try {
      const checkSlotResponse = await axios.get(`/api/available-slots`, {
        params: {
          doctorName: selectedDoctor.name,
          date: bookingDetails.date,
        },
      });

      if (
        !checkSlotResponse.data.availableSlots.includes(bookingDetails.time)
      ) {
        alert(
          "❌ Sorry! This slot was just taken. Please select another time.",
        );
        setAvailableSlots(checkSlotResponse.data.availableSlots);
        setStep(2);
        setLoading(false);
        return;
      }

      const appointmentData = {
        doctor: selectedDoctor,
        patient: {
          name: bookingDetails.name,
          age: parseInt(bookingDetails.age),
          email: bookingDetails.email,
          phone: bookingDetails.phone,
          symptoms: bookingDetails.symptoms,
        },
        appointmentDate: bookingDetails.date,
        appointmentTime: bookingDetails.time,
        amount: selectedDoctor.fee,
        paymentMethod: "upi",
        status: "pending_verification",
        paymentStatus: "pending",
      };

      console.log("📝 Saving appointment:", appointmentData);

      const response = await axios.post("/api/appointments", appointmentData);

      if (response.data.success) {
        setPaymentConfirmed(true);
        setStep(4);
      } else {
        alert("❌ Booking failed. Please try again.");
      }
    } catch (error) {
      console.error("❌ Booking error:", error.response?.data);

      if (error.response?.status === 409) {
        alert(
          "❌ This time slot was just booked! Please select a different time.",
        );
        if (selectedDoctor && bookingDetails.date) {
          const response = await axios.get(`/api/available-slots`, {
            params: {
              doctorName: selectedDoctor.name,
              date: bookingDetails.date,
            },
          });
          setAvailableSlots(response.data.availableSlots);
        }
        setStep(2);
      } else {
        alert("❌ Booking failed. Server error.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setShowUPIPayment(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";

    let date;
    if (dateString.includes("-")) {
      const [year, month, day] = dateString.split("-");
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateString);
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDoctor(null);
    setBookingDetails({
      name: "",
      age: "",
      email: "",
      phone: "",
      date: "",
      time: "",
      symptoms: "",
    });
    setAvailableSlots([]);
    setShowUPIPayment(false);
    setPaymentConfirmed(false);
  };

  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const todayStr = formatDateInput(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateInput(tomorrow);
  const minDate = todayStr;
  const maxDateStr = tomorrowStr;

  // Helper function to render stars
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = [];
    for (let i = 0; i < fullStars; i++) stars.push("★");
    if (hasHalfStar) stars.push("½");
    for (let i = 0; i < emptyStars; i++) stars.push("☆");

    return stars.join("");
  };

  // Route handlers
  if (currentPath === "/admin") {
    return (
      <AuthProvider>
        <AdminLogin />
      </AuthProvider>
    );
  }

  if (currentPath === "/admin-dashboard") {
    return (
      <AuthProvider>
        <AdminDashboard />
      </AuthProvider>
    );
  }

  if (currentPath === "/doctor") {
    return (
      <AuthProvider>
        <DoctorLogin />
      </AuthProvider>
    );
  }

  if (currentPath === "/doctor-dashboard") {
    return (
      <AuthProvider>
        <DoctorDashboard />
      </AuthProvider>
    );
  }

  if (currentPath === "/patient-records") {
    const PatientRecords = require("./pages/PatientRecords").default;
    return <PatientRecords />;
  }

  const displayDoctors = dbDoctors.length > 0 ? dbDoctors : fallbackDoctors;

  return (
    <div className="App">
      {/* Header with Mobile Menu */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="logo">🏥 Doctor Online</h1>
            <p className="tagline">Healthcare Center</p>
          </div>

          <div className="desktop-nav">
            <button
              className="nav-btn"
              onClick={() => {
                setShowEmailModal(true);
                setMobileMenuOpen(false);
              }}
            >
              Find My Appointments
            </button>
            <button
              className="nav-btn admin-btn"
              onClick={() => (window.location.href = "/admin")}
            >
              Admin
            </button>
            <button
              className="nav-btn doctor-btn"
              onClick={() => (window.location.href = "/doctor")}
            >
              Doctor
            </button>
            <button
              className="nav-btn home-btn"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Home
            </button>
          </div>

          <button
            className={`home-mobile-menu-btn ${mobileMenuOpen ? "open" : ""}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="menu-icon">{mobileMenuOpen ? "✕" : "☰"}</span>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-menu">
            {/* Mobile menu content remains the same */}
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">Menu</span>
              
            </div>

            <div className="mobile-menu-section">
              <h4 className="mobile-menu-section-title">Patient Portal</h4>
              <button
                className="mobile-nav-item"
                onClick={() => {
                  setShowEmailModal(true);
                  setMobileMenuOpen(false);
                }}
              >
                <span className="mobile-nav-icon">🔍</span>
                <span className="mobile-nav-text">Find My Appointments</span>
              </button>
              <button
                className="mobile-nav-item"
                onClick={() => {
                  window.location.href = "/";
                  setMobileMenuOpen(false);
                }}
              >
                <span className="mobile-nav-icon">🏠</span>
                <span className="mobile-nav-text">Home</span>
              </button>
            </div>

            <div className="mobile-menu-section">
              <div
                className="mobile-menu-section-header"
                onClick={() => setShowDoctorsList(!showDoctorsList)}
              >
                <h4 className="mobile-menu-section-title">Our Doctors</h4>
                <span className="mobile-menu-arrow">
                  {showDoctorsList ? "▼" : "▶"}
                </span>
              </div>

              {showDoctorsList && (
                <div className="mobile-doctors-list">
                  {displayDoctors.map((doctor) => (
                    <button
                      key={doctor.doctorId || doctor.id}
                      className="mobile-nav-item doctor-item"
                      onClick={() => {
                        handleBookDoctor(doctor);
                        setMobileMenuOpen(false);
                        setShowDoctorsList(false);
                      }}
                    >
                      <span className="mobile-nav-icon">👨‍⚕️</span>
                      <div className="mobile-nav-text">
                        <div className="mobile-doctor-name">{doctor.name}</div>
                        <div className="mobile-doctor-specialty">
                          {doctor.specialization}
                        </div>
                      </div>
                      <span className="mobile-doctor-fee">₹{doctor.fee}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mobile-menu-section">
              <h4 className="mobile-menu-section-title">Professional Portal</h4>
              <button
                className="mobile-nav-item admin-btn"
                onClick={() => {
                  window.location.href = "/admin";
                  setMobileMenuOpen(false);
                }}
              >
                <span className="mobile-nav-icon">👨‍💼</span>
                <span className="mobile-nav-text">Admin Dashboard</span>
              </button>
              <button
                className="mobile-nav-item doctor-login-btn"
                onClick={() => {
                  window.location.href = "/doctor";
                  setMobileMenuOpen(false);
                }}
              >
                <span className="mobile-nav-icon">👨‍⚕️</span>
                <span className="mobile-nav-text">Doctor Login</span>
              </button>
            </div>

            <div className="mobile-menu-footer">
              <div className="mobile-version">v1.0.0</div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="app-main">
        {showAppointments ? (
          <div className="appointments-view">
            <h2>Your Appointments</h2>
            {appointments.length === 0 ? (
              <div className="empty-state">
                <p>No appointments found for this email.</p>
                <button
                  className="primary-btn"
                  onClick={() => setShowAppointments(false)}
                >
                  Book Your First Appointment
                </button>
              </div>
            ) : (
              <div className="appointments-list">
                {appointments.map((apt, index) => (
                  <div
                    key={apt.id || apt._id || index}
                    className="appointment-card"
                  >
                    <div className="appointment-header">
                      <span className="appointment-id">#{index + 1}</span>
                      <span
                        className={`appointment-status-badge ${apt.status}`}
                      >
                        {apt.status === "pending_verification" && "⏳ Pending"}
                        {apt.status === "confirmed" && "✅ Confirmed"}
                        {apt.status === "completed" && "✓ Completed"}
                        {apt.status === "cancelled" && "✗ Cancelled"}
                      </span>
                    </div>
                    <div className="appointment-body">
                      <div className="doctor-info">
                        <span className="doctor-icon">
                          {apt.doctor?.image || "👨‍⚕️"}
                        </span>
                        <div>
                          <h3>{apt.doctor?.name || "Doctor"}</h3>
                          <p className="specialty">
                            {apt.doctor?.specialization || "Specialist"}
                          </p>
                          <p className="fee">
                            Fee: ₹{apt.doctor?.fee || apt.amount || 0}
                          </p>
                        </div>
                      </div>
                      <div className="patient-info">
                        <p>
                          <strong>Patient:</strong>{" "}
                          {apt.patient?.name || apt.patientName}
                        </p>
                        <p>
                          <strong>Age:</strong> {apt.patient?.age || "N/A"}
                        </p>
                        <p>
                          <strong>Date:</strong>{" "}
                          {formatDate(apt.appointmentDate || apt.patient?.date)}
                        </p>
                        <p>
                          <strong>Time:</strong>{" "}
                          {apt.appointmentTime || apt.patient?.time}
                        </p>
                        <p>
                          <strong>Email:</strong>{" "}
                          {apt.patientEmail || apt.patient?.email}
                        </p>
                        <button
                          className="view-records-btn"
                          onClick={() => {
                            window.location.href = `/patient-records?email=${apt.patientEmail || apt.patient?.email}`;
                          }}
                        >
                          📁 View Medical Records
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="booking-flow">
            {/* Progress Steps */}
            <div className="progress-steps">
              {[1, 2, 3, 4].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`step 
                   ${step >= stepNum ? "active" : ""} 
                   ${step > stepNum || (stepNum === 4 && step === 4) ? "completed" : ""}
                 `}
                >
                  <div className="step-circle">{stepNum}</div>
                  <div className="step-label">
                    {stepNum === 1 && "Select Doctor"}
                    {stepNum === 2 && "Book Slot"}
                    {stepNum === 3 && "Make Payment"}
                    {stepNum === 4 && "Confirmation"}
                  </div>
                </div>
              ))}
            </div>

            {/* Step 1: Select Doctor */}
            {step === 1 && (
              <div className="step-content">
                <h2>Choose Your Doctor</h2>
                <p className="step-description">
                  Select from our panel of expert doctors
                </p>

                {loadingDoctors ? (
                  <div className="loading-doctors">
                    <div className="spinner"></div>
                    <p>Loading doctors...</p>
                  </div>
                ) : (
                  <div className="home-doctors-grid">
                    {displayDoctors.map((doctor) => (
                      <div
                        key={doctor.doctorId || doctor.id}
                        className="home-doctor-card"
                      >
                        {/* STATUS BADGE - TOP RIGHT CORNER */}
                        <div
                          className={`home-doctor-status-badge ${doctor.isActive ? "active" : "inactive"}`}
                        >
                          {doctor.isActive ? "🟢 Active" : "🔴 Inactive"}
                        </div>

                        <div className="home-doctor-card-inner">
                          {/* LEFT SIDE - IMAGE */}
                          <div className="home-doctor-image-section">
                            <div className="home-doctor-image-container">
                              <img
                                src={
                                  doctor.imageUrl || getDoctorImage(doctor.name)
                                }
                                alt={doctor.name}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = getDoctorImage(doctor.name);
                                }}
                              />
                            </div>
                          </div>

                          {/* RIGHT SIDE - CONTENT */}
                          <div className="home-doctor-content">
                            <h3 className="home-doctor-name">{doctor.name}</h3>

                            {/* Specialization */}
                            <div className="doctor-info-row">
                              <span className="doctor-info-icon">🏥</span>
                              <span className="doctor-info-text doctor-specialty-text">
                                {doctor.specialization}
                              </span>
                            </div>

                            {/* Qualification/Degree */}
                            <div className="doctor-info-row">
                              <span className="doctor-info-icon">🎓</span>
                              <span className="doctor-info-text doctor-degree-text">
                                {doctor.qualification || "MBBS, MD"}
                              </span>
                            </div>

                            {/* Experience */}
                            <div className="doctor-info-row">
                              <span className="doctor-info-icon">📅</span>
                              <span className="doctor-info-text doctor-experience-text">
                                {doctor.experience || "5+ years"} experience
                              </span>
                            </div>

                            {/* Location - Clinic Name + Address */}
                            <div className="doctor-info-row">
                              <span className="doctor-info-icon">📍</span>
                              <span className="doctor-info-text doctor-location-text">
                                {doctor.clinicName}
                                {doctor.clinicName && doctor.address
                                  ? ", "
                                  : ""}
                                {doctor.address || ""}
                                {!doctor.clinicName &&
                                  !doctor.address &&
                                  "Online Consultation"}
                              </span>
                            </div>

                            {/* Available Slots - Button Only */}
                            <div className="slots-row">
                              {doctor.allSlotsCount > 0 ? (
                                <button
                                  className="view-all-slots-btn-primary"
                                  onClick={() => fetchAllSlotsForDoctor(doctor)}
                                >
                                  View Available Slots ({doctor.allSlotsCount})
                                  →
                                </button>
                              ) : (
                                <span className="slots-time no-slots-message">
                                  No slots available today
                                </span>
                              )}
                            </div>

                            {/* Price & Button */}
                            <div className="price-book-row">
                              <span className="price-amount">
                                ₹{doctor.fee} <span>/ consultation</span>
                              </span>
                              <button
                                className="home-book-btn"
                                onClick={() => handleBookDoctor(doctor)}
                                disabled={!doctor.isActive}
                                style={{
                                  opacity: doctor.isActive ? 1 : 0.5,
                                  cursor: doctor.isActive
                                    ? "pointer"
                                    : "not-allowed",
                                  backgroundColor: doctor.isActive
                                    ? "#2563eb"
                                    : "#94a3b8",
                                }}
                              >
                                {doctor.isActive ? "Book" : "Unavailable"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Booking Form */}
            {step === 2 && selectedDoctor && (
              <div className="step-content">
                <div className="home-doctor-summary">
                  <div className="home-doctor-summary-info">
                    <h2>Appointment with</h2>
                    <h3>{selectedDoctor.name}</h3>
                    <p>{selectedDoctor.specialization}</p>
                  </div>
                  <div className="home-consultation-fee">
                    ₹{selectedDoctor.fee}
                  </div>
                </div>

                <form onSubmit={handleBookingSubmit} className="booking-form">
                  <div className="form-section">
                    <h3>Patient Details</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={bookingDetails.name}
                          onChange={handleInputChange}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Age *</label>
                        <input
                          type="number"
                          name="age"
                          value={bookingDetails.age}
                          onChange={handleInputChange}
                          placeholder="Enter age"
                          min="1"
                          max="120"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Phone Number *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={bookingDetails.phone}
                          onChange={handleInputChange}
                          placeholder="Enter 10-digit mobile number"
                          pattern="[0-9]{10}"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Email Address *</label>
                        <input
                          type="email"
                          name="email"
                          value={bookingDetails.email}
                          onChange={handleInputChange}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Appointment Details</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Appointment Date *</label>
                        <input
                          type="date"
                          name="date"
                          value={bookingDetails.date}
                          onChange={handleInputChange}
                          min={minDate}
                          max={maxDateStr}
                          required
                        />
                        <small className="date-hint">
                          📅 You can book for today or tomorrow only
                        </small>
                      </div>
                      <div className="form-group">
                        <label>Preferred Time Slot *</label>
                        <select
                          name="time"
                          value={bookingDetails.time}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select a time slot</option>
                          {loadingSlots ? (
                            <option disabled>Loading available slots...</option>
                          ) : availableSlots.length > 0 ? (
                            availableSlots.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}{" "}
                                {/* ← Changed from formatTo12Hour(slot) to slot */}
                              </option>
                            ))
                          ) : (
                            <option disabled>
                              No slots available for this date
                            </option>
                          )}
                        </select>
                        {bookingDetails.date &&
                          selectedDoctor &&
                          availableSlots.length === 0 &&
                          !loadingSlots && (
                            <p className="slot-warning">
                              ⚠️ No time slots available for this date. Please
                              select another date.
                            </p>
                          )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Symptoms / Reason for Visit</label>
                      <textarea
                        name="symptoms"
                        value={bookingDetails.symptoms}
                        onChange={handleInputChange}
                        placeholder="Briefly describe your symptoms"
                        rows="4"
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setStep(1)}
                    >
                      ← Back to Doctors
                    </button>
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={
                        !bookingDetails.time || availableSlots.length === 0
                      }
                    >
                      Proceed to Payment →
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Payment - UPI/QR Code */}
            {step === 3 && selectedDoctor && !showUPIPayment && (
              <div className="step-content">
                <h2>💳 Payment Instructions</h2>
                <p className="step-description">
                  Pay directly to the doctor via UPI
                </p>

                <div className="home-payment-container">
                  <div className="home-payment-summary">
                    <h3>Payment Summary</h3>
                    <div className="home-summary-item">
                      <span>Doctor Consultation Fee</span>
                      <span>₹{selectedDoctor.fee}</span>
                    </div>
                    <div className="home-summary-item total">
                      <span>Total Amount </span>
                      <span>₹{selectedDoctor.fee}</span>
                    </div>
                  </div>

                  <div className="payment-details">
                    <div className="home-patient-summary">
                      <h4>Patient Information</h4>
                      <div className="home-patient-info-item">
                        <strong>Name:</strong> {bookingDetails.name}
                      </div>
                      <div className="home-patient-info-item">
                        <strong>Age:</strong> {bookingDetails.age}
                      </div>
                      <div className="home-patient-info-item">
                        <strong>Email:</strong> {bookingDetails.email}
                      </div>
                      <div className="home-patient-info-item">
                        <strong>Phone:</strong> {bookingDetails.phone}
                      </div>
                      <div className="home-patient-info-item">
                        <strong>Appointment:</strong>{" "}
                        {formatDate(bookingDetails.date)} at{" "}
                        {formatTo12Hour(bookingDetails.time)}
                      </div>
                    </div>

                    <button
                      className="payment-btn"
                      onClick={handlePayment}
                      disabled={loading}
                    >
                      Proceed to UPI Payment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3b: UPI Payment Interface */}
            {step === 3 &&
              selectedDoctor &&
              showUPIPayment &&
              !paymentConfirmed && (
                <div className="step-content">
                  <h2>📱 Pay via UPI</h2>
                  <p className="step-description">
                    Scan QR code to pay {selectedDoctor.name}
                  </p>

                  <div className="upi-payment-container">
                    <div className="doctor-upi-info">
                      <h3>Doctor's Payment Details</h3>
                      <div className="qr-code-section">
                        {selectedDoctor.qrCodeUrl ? (
                          <img
                            src={selectedDoctor.qrCodeUrl}
                            alt={`QR Code for ${selectedDoctor.name}`}
                            className="qr-code-image"
                          />
                        ) : (
                          <div className="qr-placeholder">
                            <span className="qr-icon">📱</span>
                            <p>
                              QR Code: {selectedDoctor.upiId || "Not available"}
                            </p>
                          </div>
                        )}
                        <p className="upi-id">
                          <strong>UPI ID:</strong>{" "}
                          {selectedDoctor.upiId || "Not available"}
                        </p>
                      </div>
                    </div>

                    <div className="payment-confirmation">
                      <h3>After Payment</h3>
                      <p className="amount">Amount: ₹{selectedDoctor.fee}</p>

                      <div className="payment-instructions">
                        <div className="instruction-box">
                          <p>
                            ✅ 1. Scan QR code and complete payment in your UPI
                            app
                          </p>
                          <p>📱 2. Save the payment screenshot</p>
                          <p>
                            🏥 3. Show screenshot at clinic for verification
                          </p>
                        </div>
                      </div>

                      <div className="info-box warning">
                        <p>⏳ Your appointment is tentatively booked</p>
                        <p>✅ Final confirmation after clinic verification</p>
                      </div>

                      <div className="payment-actions">
                        <button
                          className="secondary-btn"
                          onClick={() => setShowUPIPayment(false)}
                          disabled={loading}
                        >
                          ← Back
                        </button>
                        <button
                          className="primary-btn"
                          onClick={handlePaymentDone}
                          disabled={loading}
                        >
                          {loading ? "Processing..." : "✓ Confirm Payment"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Step 4: Waiting - CLINIC VERIFICATION MESSAGE */}
            {step === 4 && (
              <div className="step-content">
                <div className="waiting-card minimal">
                  <div className="waiting-icon">🏥</div>
                  <h3>Booking Received</h3>
                  <p className="small-msg">
                    Visit clinic → Staff verifies → Get confirmation
                  </p>
                  <div className="amount-chip">₹{selectedDoctor?.fee}</div>
                  <button className="home-btn small" onClick={resetForm}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 🆕 VIEW ALL SLOTS MODAL */}
      {showAllSlotsModal && selectedSlotDoctor && (
        <div
          className="modal-overlay"
          onClick={() => setShowAllSlotsModal(false)}
        >
          <div
            className="modal-content slots-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {selectedSlotDoctor.availableSlot?.startsWith("Tomorrow")
                  ? "📅 Tomorrow's"
                  : "📅 Today's"}{" "}
                Available Slots - {selectedSlotDoctor.name}
              </h2>
              <button
                className="close-btn"
                onClick={() => setShowAllSlotsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {allDoctorSlots.length === 0 ? (
                <div className="no-slots-message">
                  <p>
                    No available slots for{" "}
                    {selectedSlotDoctor.availableSlot?.startsWith("Tomorrow")
                      ? "tomorrow"
                      : "today"}
                  </p>
                </div>
              ) : (
                <div className="slots-grid">
                  {allDoctorSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      className="slot-item"
                      onClick={() => {
                        const isTomorrow =
                          selectedSlotDoctor.availableSlot?.startsWith(
                            "Tomorrow",
                          );
                        const date = new Date();
                        if (isTomorrow) {
                          date.setDate(date.getDate() + 1);
                        }
                        const formattedDate = date.toISOString().split("T")[0];
                        setShowAllSlotsModal(false);
                        handleBookDoctor(selectedSlotDoctor);
                        setBookingDetails((prev) => ({
                          ...prev,
                          date: formattedDate,
                          time: slot.time || slot,
                        }));
                      }}
                    >
                      {slot.time || slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📧 EMAIL MODAL - Find Appointments (ADD THIS HERE) */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div
            className="modal-content email-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>🔍 Find Your Appointments</h2>
              <button
                className="close-btn"
                onClick={() => setShowEmailModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Enter the email address you used when booking</p>
              <input
                type="email"
                placeholder="your@email.com"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    if (patientEmail && patientEmail.includes("@")) {
                      fetchAppointmentsByEmail(patientEmail);
                      setShowEmailModal(false);
                      setPatientEmail("");
                    } else {
                      alert("Please enter a valid email");
                    }
                  }
                }}
              />
              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  className="primary-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    if (patientEmail && patientEmail.includes("@")) {
                      fetchAppointmentsByEmail(patientEmail);
                      setShowEmailModal(false);
                      setPatientEmail("");
                    } else {
                      alert("Please enter a valid email");
                    }
                  }}
                >
                  View Appointments
                </button>
                <button
                  className="secondary-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowEmailModal(false);
                    setPatientEmail("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>🏥 Doctor Online</h3>
            <p>Healthcare Center</p>
            <p>Email: doctoronlinhelp@gmail.com</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <button onClick={() => (window.location.href = "/admin")}>
              Admin
            </button>
            <button onClick={() => (window.location.href = "/doctor")}>
              Doctor
            </button>
            <button onClick={resetForm}>New Booking</button>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Doctor Online. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
