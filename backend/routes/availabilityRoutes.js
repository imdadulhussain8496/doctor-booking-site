const express = require("express");
const router = express.Router();
const Availability = require("../models/Availability");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");

// Get availability for a doctor
router.get("/:doctorId", async (req, res) => {
  try {
    const availability = await Availability.findOne({
      doctorId: req.params.doctorId,
    });

    if (!availability) {
      const defaultAvailability = await createDefaultAvailability(
        req.params.doctorId,
      );
      return res.json({ success: true, availability: defaultAvailability });
    }

    res.json({ success: true, availability });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update weekly schedule
router.put("/:doctorId/weekly", async (req, res) => {
  try {
    const { weeklySchedule } = req.body;

    let availability = await Availability.findOne({
      doctorId: req.params.doctorId,
    });

    if (!availability) {
      availability = new Availability({
        doctorId: req.params.doctorId,
        weeklySchedule,
        slotDuration: 15,
        bufferTime: 0,
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
router.post("/:doctorId/exception", async (req, res) => {
  try {
    const { date, reason, isAvailable, timeRanges } = req.body;

    const availability = await Availability.findOne({
      doctorId: req.params.doctorId,
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Availability not found",
      });
    }

    availability.exceptions.push({
      date: new Date(date),
      reason,
      isAvailable,
      timeRanges: timeRanges || [],
    });

    availability.updatedAt = new Date();
    await availability.save();

    res.json({ success: true, availability });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get booked slots for a doctor on a specific date
router.get("/:doctorId/booked-slots/:date", async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    const appointments = await Appointment.find({
      "doctor.doctorId": doctorId,
      appointmentDate: date,
      status: { $in: ["confirmed", "pending_verification"] },
    });

    const bookedSlots = appointments.map((apt) => apt.appointmentTime);

    res.json({ success: true, bookedSlots });
  } catch (error) {
    console.error("Error fetching booked slots:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available slots for a specific date
router.get("/:doctorId/slots/:date", async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    const availability = await Availability.findOne({ doctorId });

    if (!availability) {
      return res.json({ success: true, slots: [] });
    }

    const exception = availability.exceptions.find(
      (e) => e.date.toDateString() === targetDate.toDateString(),
    );

    if (exception) {
      if (!exception.isAvailable) {
        return res.json({ success: true, slots: [] });
      }
      const slots = generateSlotsFromRanges(
        exception.timeRanges,
        availability.slotDuration || 15,
        availability.bufferTime || 0,
      );
      return res.json({ success: true, slots });
    }

    const daySchedule = availability.weeklySchedule.find(
      (d) => d.day === dayOfWeek,
    );

    if (!daySchedule || !daySchedule.isAvailable) {
      return res.json({ success: true, slots: [] });
    }

    const slots = generateSlotsFromRanges(
      daySchedule.timeRanges,
      availability.slotDuration || 15,
      availability.bufferTime || 0,
      daySchedule.breaks || [],
    );

    const appointments = await Appointment.find({
      "doctor.doctorId": doctorId,
      appointmentDate: date,
      status: { $in: ["confirmed", "pending_verification"] },
    });

    const bookedSlotTimes = appointments.map((apt) => apt.appointmentTime);

    const availableSlots = slots.filter((slot) => {
      let hours = parseInt(slot.start.split(":")[0]);
      const minutes = slot.start.split(":")[1];
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHour = hours % 12 || 12;
      const time12hr = `${displayHour}:${minutes} ${ampm}`;
      return !bookedSlotTimes.includes(time12hr);
    });

    res.json({ success: true, slots: availableSlots });
  } catch (error) {
    console.error("Error in slots:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to generate slots
function generateSlotsFromRanges(
  timeRanges,
  slotDuration,
  bufferTime,
  breaks = [],
) {
  const slots = [];

  timeRanges.forEach((range) => {
    const [startHour, startMin] = range.start.split(":").map(Number);
    const [endHour, endMin] = range.end.split(":").map(Number);

    let current = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;

    while (current + slotDuration <= end) {
      const slotStart = current;
      const slotEnd = current + slotDuration;

      // Check if slot overlaps with any break
      let isBreak = false;
      for (const b of breaks) {
        const [bStartHour, bStartMin] = b.start.split(":").map(Number);
        const [bEndHour, bEndMin] = b.end.split(":").map(Number);
        const bStart = bStartHour * 60 + bStartMin;
        const bEnd = bEndHour * 60 + bEndMin;

        // If slot starts during break OR slot ends during break OR slot completely inside break
        if ((slotStart >= bStart && slotStart < bEnd) ||
            (slotEnd > bStart && slotEnd <= bEnd) ||
            (slotStart <= bStart && slotEnd >= bEnd)) {
          isBreak = true;
          // Jump to end of break to skip all slots during break
          current = bEnd;
          break;
        }
      }

      if (!isBreak) {
        const hours = Math.floor(slotStart / 60);
        const mins = slotStart % 60;
        slots.push({
          start: `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`,
          end: addMinutes(slotStart, slotDuration),
        });
        current += slotDuration + bufferTime;
      }
    }
  });

  return slots;
}

function addMinutes(minutes, duration) {
  const total = minutes + duration;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

async function createDefaultAvailability(doctorId) {
  // ALL 7 DAYS - Fully open 9 AM to 5:30 PM with lunch break
  const weeklySchedule = [];

  // Sunday to Saturday - All days fully open
  for (let day = 0; day <= 6; day++) {
    weeklySchedule.push({
      day,
      isAvailable: true,
      timeRanges: [{ start: "09:00", end: "17:30" }],
      breaks: [{ start: "13:00", end: "14:00", reason: "Lunch" }],
    });
  }

  const availability = new Availability({
    doctorId,
    weeklySchedule,
    slotDuration: 15,
    bufferTime: 0,
  });

  await availability.save();
  return availability;
}

module.exports = router;
