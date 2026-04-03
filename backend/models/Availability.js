const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  start: { type: String, required: true }, // "09:00"
  end: { type: String, required: true },   // "17:00"
  isBooked: { type: Boolean, default: false }
});

const weeklyScheduleSchema = new mongoose.Schema({
  day: { 
    type: Number, 
    required: true,
    min: 0, 
    max: 6, // 0=Monday, 6=Sunday
  },
  isAvailable: { type: Boolean, default: true },
  timeRanges: [{
    start: String,
    end: String
  }],
  breaks: [{
    start: String,
    end: String,
    reason: String
  }]
});

const exceptionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  isAvailable: { type: Boolean, default: false },
  reason: { type: String, enum: ['holiday', 'vacation', 'leave', 'other'] },
  timeRanges: [{
    start: String,
    end: String
  }]
});

const availabilitySchema = new mongoose.Schema({
  doctorId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  weeklySchedule: [weeklyScheduleSchema],
  exceptions: [exceptionSchema],
  slotDuration: { type: Number, default: 15 }, // minutes
  bufferTime: { type: Number, default: 5 }, // minutes between appointments
  maxAdvanceBooking: { type: Number, default: 30 }, // days
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Availability', availabilitySchema);