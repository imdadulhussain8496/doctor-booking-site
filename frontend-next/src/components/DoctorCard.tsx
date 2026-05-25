'use client';

interface Doctor {
  _id: string;
  name: string;
  specialization: string;
  qualification: string;
  experience: string;
  fee: number;
  imageUrl: string;
  isActive: boolean;
  clinicName: string;
  address: string;
}

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative">
        <img 
          src={doctor.imageUrl || 'https://img.icons8.com/color/96/000000/doctor-male.png'} 
          alt={doctor.name}
          className="w-full h-48 object-cover"
        />
        <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${
          doctor.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {doctor.isActive ? '🟢 Active' : '🔴 Inactive'}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-xl font-bold mb-2">{doctor.name}</h3>
        <p className="text-gray-600 mb-1">🏥 {doctor.specialization}</p>
        <p className="text-gray-600 mb-1">🎓 {doctor.qualification}</p>
        <p className="text-gray-600 mb-1">📅 {doctor.experience} experience</p>
        <p className="text-gray-600 mb-3">📍 {doctor.clinicName}, {doctor.address}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-2xl font-bold text-blue-600">₹{doctor.fee}</span>
          <button 
            disabled={!doctor.isActive}
            className={`px-4 py-2 rounded-lg font-semibold ${
              doctor.isActive 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {doctor.isActive ? 'Book Appointment' : 'Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
}
