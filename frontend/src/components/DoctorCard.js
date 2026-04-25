import React, { memo } from 'react';
import { getDoctorImage } from '../utils/doctorImages';

const DoctorCard = memo(({ doctor, onBookDoctor, onViewSlots }) => {
  return (
    <div className="home-doctor-card">
      {/* STATUS BADGE - TOP RIGHT CORNER */}
      <div className={`home-doctor-status-badge ${doctor.isActive ? "active" : "inactive"}`}>
        {doctor.isActive ? "🟢 Active" : "🔴 Inactive"}
      </div>

      <div className="home-doctor-card-inner">
        {/* LEFT SIDE - IMAGE */}
        <div className="home-doctor-image-section">
          <div className="home-doctor-image-container">
            <img
              src={doctor.imageUrl || getDoctorImage(doctor.name)}
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

          <div className="doctor-info-row">
            <span className="doctor-info-icon">🏥</span>
            <span className="doctor-info-text doctor-specialty-text">
              {doctor.specialization}
            </span>
          </div>

          <div className="doctor-info-row">
            <span className="doctor-info-icon">🎓</span>
            <span className="doctor-info-text doctor-degree-text">
              {doctor.qualification || "MBBS, MD"}
            </span>
          </div>

          <div className="doctor-info-row">
            <span className="doctor-info-icon">📅</span>
            <span className="doctor-info-text doctor-experience-text">
              {doctor.experience || "5+ years"} experience
            </span>
          </div>

          <div className="doctor-info-row">
            <span className="doctor-info-icon">📍</span>
            <span className="doctor-info-text doctor-location-text">
              {doctor.clinicName}
              {doctor.clinicName && doctor.address ? ", " : ""}
              {doctor.address || ""}
              {!doctor.clinicName && !doctor.address && "Online Consultation"}
            </span>
          </div>

          <div className="slots-row">
            {doctor.allSlotsCount > 0 ? (
              <button
                className="view-all-slots-btn-primary"
                onClick={() => onViewSlots(doctor)}
              >
                View Available Slots ({doctor.allSlotsCount}) →
              </button>
            ) : (
              <span className="slots-time no-slots-message">
                {doctor.isActive ? "No slots available today" : ""}
              </span>
            )}
          </div>

          <div className="price-book-row">
            <span className="price-amount">
              ₹{doctor.fee} <span>/ consultation</span>
            </span>
            <button
              className="home-book-btn"
              onClick={() => onBookDoctor(doctor)}
              disabled={!doctor.isActive}
              style={{
                opacity: doctor.isActive ? 1 : 0.5,
                cursor: doctor.isActive ? "pointer" : "not-allowed",
                backgroundColor: doctor.isActive ? "#2563eb" : "#94a3b8",
              }}
            >
              {doctor.isActive ? "Book" : "Unavailable"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

DoctorCard.displayName = 'DoctorCard';

export default DoctorCard;
