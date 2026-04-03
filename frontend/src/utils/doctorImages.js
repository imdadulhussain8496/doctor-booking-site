// D:\Projects\DoctorBooking\frontend\src\utils\doctorImages.js

// Doctor images mapping for consistent display across the app
const doctorImages = {
  "Dr. Rajesh Sharma":
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop",
  "Dr. Priya Patel":
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop",
  "Dr. Amit Kumar":
    "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop",
  "Dr. Sunita Gupta":
    "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop",
  default:
    "https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=400&h=400&fit=crop",
};

// Get image by doctor name
export const getDoctorImage = (doctorName) => {
  return doctorImages[doctorName] || doctorImages.default;
};

// Get image by doctor ID (for cases where name isn't available)
export const getDoctorImageById = (doctorId) => {
  // You can add ID-based mapping if needed
  const idMap = {
    DOC001: "Dr. Rajesh Sharma",
    DOC002: "Dr. Priya Patel",
    DOC003: "Dr. Amit Kumar",
    DOC004: "Dr. Sunita Gupta",
  };
  return doctorImages[idMap[doctorId]] || doctorImages.default;
};

// Export the full mapping if needed elsewhere
export default doctorImages;
