import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AvailabilityManager.css';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function AvailabilityManager({ doctorId }) {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1); // Monday default
  const [editing, setEditing] = useState(false);
  const [exceptions, setExceptions] = useState([]);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [newException, setNewException] = useState({
    date: '',
    reason: 'leave',
    isAvailable: false,
    timeRanges: []
  });

  useEffect(() => {
    fetchAvailability();
  }, [doctorId]);

  const fetchAvailability = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/availability/${doctorId}`);
      setAvailability(response.data.availability);
      setExceptions(response.data.availability.exceptions || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeAdd = (day) => {
    const updatedSchedule = [...availability.weeklySchedule];
    const dayIndex = updatedSchedule.findIndex(d => d.day === day);
    
    if (!updatedSchedule[dayIndex].timeRanges) {
      updatedSchedule[dayIndex].timeRanges = [];
    }
    
    updatedSchedule[dayIndex].timeRanges.push({ start: '09:00', end: '17:00' });
    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
  };

  const handleTimeRangeChange = (day, rangeIndex, field, value) => {
    const updatedSchedule = [...availability.weeklySchedule];
    const dayIndex = updatedSchedule.findIndex(d => d.day === day);
    updatedSchedule[dayIndex].timeRanges[rangeIndex][field] = value;
    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
  };

  const handleTimeRangeRemove = (day, rangeIndex) => {
    const updatedSchedule = [...availability.weeklySchedule];
    const dayIndex = updatedSchedule.findIndex(d => d.day === day);
    updatedSchedule[dayIndex].timeRanges.splice(rangeIndex, 1);
    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
  };

  const handleBreakAdd = (day) => {
    const updatedSchedule = [...availability.weeklySchedule];
    const dayIndex = updatedSchedule.findIndex(d => d.day === day);
    
    if (!updatedSchedule[dayIndex].breaks) {
      updatedSchedule[dayIndex].breaks = [];
    }
    
    updatedSchedule[dayIndex].breaks.push({ 
      start: '13:00', 
      end: '14:00', 
      reason: 'Break' 
    });
    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
  };

  const handleBreakChange = (day, breakIndex, field, value) => {
    const updatedSchedule = [...availability.weeklySchedule];
    const dayIndex = updatedSchedule.findIndex(d => d.day === day);
    updatedSchedule[dayIndex].breaks[breakIndex][field] = value;
    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
  };

  const handleBreakRemove = (day, breakIndex) => {
    const updatedSchedule = [...availability.weeklySchedule];
    const dayIndex = updatedSchedule.findIndex(d => d.day === day);
    updatedSchedule[dayIndex].breaks.splice(breakIndex, 1);
    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
  };

  const handleSave = async () => {
    try {
      await axios.put(`http://localhost:5000/api/availability/${doctorId}/weekly`, {
        weeklySchedule: availability.weeklySchedule
      });
      setEditing(false);
      alert('Schedule saved successfully!');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule');
    }
  };

  const handleAddException = async () => {
    try {
      await axios.post(`http://localhost:5000/api/availability/${doctorId}/exception`, newException);
      setShowExceptionModal(false);
      fetchAvailability(); // Refresh
      alert('Exception added successfully!');
    } catch (error) {
      console.error('Error adding exception:', error);
      alert('Failed to add exception');
    }
  };

  if (loading) {
    return <div className="availability-loading">Loading schedule...</div>;
  }

  return (
    <div className="availability-manager">
      <div className="availability-header">
        <h2>📅 Manage Your Availability</h2>
        <div className="header-actions">
          <button 
            className="exception-btn"
            onClick={() => setShowExceptionModal(true)}
          >
            ➕ Add Exception (Holiday/Vacation)
          </button>
          {!editing ? (
            <button 
              className="avail-edit-btn"
              onClick={() => setEditing(true)}
            >
              ✏️ Edit Schedule
            </button>
          ) : (
            <button 
              className="save-btn"
              onClick={handleSave}
            >
              💾 Save Changes
            </button>
          )}
        </div>
      </div>

      <div className="weekly-schedule">
        <div className="days-tabs">
          {daysOfWeek.map((day, index) => (
            <button
              key={index}
              className={`day-tab ${selectedDay === index ? 'active' : ''}`}
              onClick={() => setSelectedDay(index)}
            >
              {day}
            </button>
          ))}
        </div>

        {availability && (
          <div className="day-schedule">
            {availability.weeklySchedule
              .filter(d => d.day === selectedDay)
              .map((daySchedule, idx) => (
                <div key={idx} className="schedule-details">
                  <div className="availability-toggle">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={daySchedule.isAvailable}
                        onChange={(e) => {
                          if (!editing) return;
                          const updated = [...availability.weeklySchedule];
                          const dayIndex = updated.findIndex(d => d.day === selectedDay);
                          updated[dayIndex].isAvailable = e.target.checked;
                          setAvailability({
                            ...availability,
                            weeklySchedule: updated
                          });
                        }}
                        disabled={!editing}
                      />
                      <span className="slider"></span>
                    </label>
                    <span>{daySchedule.isAvailable ? 'Available' : 'Not Available'}</span>
                  </div>

                  {daySchedule.isAvailable && (
                    <>
                      <div className="time-ranges-section">
                        <h4>Working Hours</h4>
                        {daySchedule.timeRanges?.map((range, rangeIdx) => (
                          <div key={rangeIdx} className="time-range-item">
                            <input
                              type="time"
                              value={range.start}
                              onChange={(e) => editing && handleTimeRangeChange(
                                selectedDay, 
                                rangeIdx, 
                                'start', 
                                e.target.value
                              )}
                              disabled={!editing}
                            />
                            <span>to</span>
                            <input
                              type="time"
                              value={range.end}
                              onChange={(e) => editing && handleTimeRangeChange(
                                selectedDay, 
                                rangeIdx, 
                                'end', 
                                e.target.value
                              )}
                              disabled={!editing}
                            />
                            {editing && (
                              <button 
                                className="remove-btn"
                                onClick={() => handleTimeRangeRemove(selectedDay, rangeIdx)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        {editing && (
                          <button 
                            className="add-range-btn"
                            onClick={() => handleTimeRangeAdd(selectedDay)}
                          >
                            + Add Time Range
                          </button>
                        )}
                      </div>

                      <div className="breaks-section">
                        <h4>Breaks</h4>
                        {daySchedule.breaks?.map((breakItem, breakIdx) => (
                          <div key={breakIdx} className="break-item">
                            <input
                              type="time"
                              value={breakItem.start}
                              onChange={(e) => editing && handleBreakChange(
                                selectedDay,
                                breakIdx,
                                'start',
                                e.target.value
                              )}
                              disabled={!editing}
                            />
                            <span>to</span>
                            <input
                              type="time"
                              value={breakItem.end}
                              onChange={(e) => editing && handleBreakChange(
                                selectedDay,
                                breakIdx,
                                'end',
                                e.target.value
                              )}
                              disabled={!editing}
                            />
                            <input
                              type="text"
                              value={breakItem.reason}
                              onChange={(e) => editing && handleBreakChange(
                                selectedDay,
                                breakIdx,
                                'reason',
                                e.target.value
                              )}
                              placeholder="Reason"
                              disabled={!editing}
                              className="break-reason"
                            />
                            {editing && (
                              <button 
                                className="remove-btn"
                                onClick={() => handleBreakRemove(selectedDay, breakIdx)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        {editing && (
                          <button 
                            className="add-break-btn"
                            onClick={() => handleBreakAdd(selectedDay)}
                          >
                            + Add Break
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Exceptions List */}
      {exceptions.length > 0 && (
        <div className="exceptions-list">
          <h3>Exceptions (Holidays/Vacations)</h3>
          <div className="exceptions-grid">
            {exceptions.map((ex, idx) => (
              <div key={idx} className="exception-card">
                <span className="exception-date">
                  {new Date(ex.date).toLocaleDateString()}
                </span>
                <span className="exception-reason">{ex.reason}</span>
                <span className={`exception-status ${ex.isAvailable ? 'available' : 'unavailable'}`}>
                  {ex.isAvailable ? 'Partial' : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exception Modal */}
      {showExceptionModal && (
        <div className="modal-overlay">
          <div className="modal-content exception-modal">
            <div className="modal-header">
              <h3>Add Exception</h3>
              <button 
                className="close-btn"
                onClick={() => setShowExceptionModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newException.date}
                  onChange={(e) => setNewException({
                    ...newException,
                    date: e.target.value
                  })}
                />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <select
                  value={newException.reason}
                  onChange={(e) => setNewException({
                    ...newException,
                    reason: e.target.value
                  })}
                >
                  <option value="holiday">Public Holiday</option>
                  <option value="vacation">Vacation</option>
                  <option value="leave">Personal Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Availability</label>
                <select
                  value={newException.isAvailable ? 'partial' : 'closed'}
                  onChange={(e) => setNewException({
                    ...newException,
                    isAvailable: e.target.value === 'partial'
                  })}
                >
                  <option value="closed">Fully Closed</option>
                  <option value="partial">Partially Available</option>
                </select>
              </div>
              {newException.isAvailable && (
                <div className="form-group">
                  <label>Time Ranges (if partially available)</label>
                  {/* Add time range picker here */}
                  <p className="hint">Coming soon: Add specific hours</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowExceptionModal(false)}
              >
                Cancel
              </button>
              <button 
                className="submit-btn"
                onClick={handleAddException}
              >
                Add Exception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvailabilityManager;