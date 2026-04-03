const express = require('express');
const router = express.Router();
const Availability = require('../models/Availability');
const Doctor = require('../models/Doctor');

// Get availability for a doctor
router.get('/:doctorId', async (req, res) => {
  try {
    const availability = await Availability.findOne({ 
      doctorId: req.params.doctorId 
    });
    
    if (!availability) {
      // Create default availability if none exists
      const defaultAvailability = await createDefaultAvailability(req.params.doctorId);
      return res.json({ success: true, availability: defaultAvailability });
    }
    
    res.json({ success: true, availability });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update weekly schedule
router.put('/:doctorId/weekly', async (req, res) => {
  try {
    const { weeklySchedule } = req.body;
    
    let availability = await Availability.findOne({ 
      doctorId: req.params.doctorId 
    });
    
    if (!availability) {
      availability = new Availability({
        doctorId: req.params.doctorId,
        weeklySchedule
      });
    } else {
      availability.weeklySchedule = weeklySchedule;
    }
    
    availability.updatedAt = new Date();
    await availability.save();
    
    res.json({ success: true, availability });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add exception (holiday/vacation)
router.post('/:doctorId/exception', async (req, res) => {
  try {
    const { date, reason, isAvailable, timeRanges } = req.body;
    
    const availability = await Availability.findOne({ 
      doctorId: req.params.doctorId 
    });
    
    if (!availability) {
      return res.status(404).json({ 
        success: false, 
        message: 'Availability not found' 
      });
    }
    
    availability.exceptions.push({
      date: new Date(date),
      reason,
      isAvailable,
      timeRanges: timeRanges || []
    });
    
    availability.updatedAt = new Date();
    await availability.save();
    
    res.json({ success: true, availability });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available slots for a specific date
router.get('/:doctorId/slots/:date', async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0-6
    
    const availability = await Availability.findOne({ doctorId });
    
    if (!availability) {
      return res.json({ success: true, slots: [] });
    }
    
    // Check for exceptions first
    const exception = availability.exceptions.find(e => 
      e.date.toDateString() === targetDate.toDateString()
    );
    
    if (exception) {
      if (!exception.isAvailable) {
        return res.json({ success: true, slots: [] });
      }
      // Generate slots from exception timeRanges
      const slots = generateSlotsFromRanges(
        exception.timeRanges, 
        availability.slotDuration,
        availability.bufferTime
      );
      return res.json({ success: true, slots });
    }
    
    // Get weekly schedule
    const daySchedule = availability.weeklySchedule.find(d => d.day === dayOfWeek);
    
    if (!daySchedule || !daySchedule.isAvailable) {
      return res.json({ success: true, slots: [] });
    }
    
    // Generate slots from weekly schedule
    const slots = generateSlotsFromRanges(
      daySchedule.timeRanges,
      availability.slotDuration,
      availability.bufferTime,
      daySchedule.breaks
    );
    
    res.json({ success: true, slots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to generate slots
function generateSlotsFromRanges(timeRanges, slotDuration, bufferTime, breaks = []) {
  const slots = [];
  
  timeRanges.forEach(range => {
    const [startHour, startMin] = range.start.split(':').map(Number);
    const [endHour, endMin] = range.end.split(':').map(Number);
    
    let current = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;
    
    while (current + slotDuration <= end) {
      const slotStart = current;
      const slotEnd = current + slotDuration;
      
      // Check if slot overlaps with any break
      const isBreak = breaks.some(b => {
        const [bStartHour, bStartMin] = b.start.split(':').map(Number);
        const [bEndHour, bEndMin] = b.end.split(':').map(Number);
        const bStart = bStartHour * 60 + bStartMin;
        const bEnd = bEndHour * 60 + bEndMin;
        
        return (slotStart >= bStart && slotStart < bEnd) || 
               (slotEnd > bStart && slotEnd <= bEnd);
      });
      
      if (!isBreak) {
        const hours = Math.floor(slotStart / 60);
        const mins = slotStart % 60;
        slots.push({
          start: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
          end: addMinutes(slotStart, slotDuration)
        });
      }
      
      current += slotDuration + bufferTime;
    }
  });
  
  return slots;
}

function addMinutes(minutes, duration) {
  const total = minutes + duration;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

async function createDefaultAvailability(doctorId) {
  // Create default Mon-Fri 9AM-5PM schedule
  const weeklySchedule = [];
  for (let day = 1; day <= 5; day++) { // Mon-Fri
    weeklySchedule.push({
      day,
      isAvailable: true,
      timeRanges: [{ start: '09:00', end: '17:00' }],
      breaks: [{ start: '13:00', end: '14:00', reason: 'Lunch' }]
    });
  }
  // Saturday half day
  weeklySchedule.push({
    day: 6,
    isAvailable: true,
    timeRanges: [{ start: '09:00', end: '13:00' }],
    breaks: []
  });
  // Sunday closed
  weeklySchedule.push({
    day: 0,
    isAvailable: false,
    timeRanges: [],
    breaks: []
  });
  
  const availability = new Availability({
    doctorId,
    weeklySchedule
  });
  
  await availability.save();
  return availability;
}

module.exports = router;