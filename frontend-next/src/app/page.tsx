'use client';

import { useEffect, useState } from 'react';

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

export default function Home() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://drappointment24.com/api/doctors')
      .then(res => res.json())
      .then(data => {
        setDoctors(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading doctors...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>🩺 DrAppointment</h1>
      <p style={{ textAlign: 'center' }}>24/7 Doctor Booking</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
        {doctors.map((doctor) => (
          <div key={doctor._id} style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '15px' }}>
            <h3>{doctor.name}</h3>
            <p>{doctor.specialization}</p>
            <p><strong>₹{doctor.fee}</strong></p>
            <span style={{ color: doctor.isActive ? 'green' : 'red' }}>
              {doctor.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
