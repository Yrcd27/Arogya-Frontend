import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Activity } from 'lucide-react';
import { profileAPI } from '../../services/api';

interface PatientProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  address: string;
  emergencyContact: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  chronicDiseases?: string;
  user?: {
    email: string;
  };
}

interface PatientProfileModalProps {
  patientId: number;
  onClose: () => void;
}

export function PatientProfileModal({ patientId, onClose }: PatientProfileModalProps) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatientProfile();
  }, [patientId]);

  const loadPatientProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileAPI.getPatient(patientId);
      console.log('Patient profile data:', data);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load patient profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patient profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Patient Profile</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38A3A5] mb-4"></div>
            <p className="text-gray-600">Loading patient profile...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#38A3A5] to-[#2d8284] p-6 rounded-lg text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-[#38A3A5]" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold">
                    {profile.firstName} {profile.lastName}
                  </h4>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-gray-900">
                    {new Date(profile.dateOfBirth).toLocaleDateString()}
                    <span className="text-gray-600 text-sm ml-2">
                      ({calculateAge(profile.dateOfBirth)} years old)
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  <p className="text-gray-900">{profile.gender}</p>
                </div>
              </div>

              {profile.bloodGroup && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Activity className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Blood Group</label>
                    <p className="text-gray-900">{profile.bloodGroup}</p>
                  </div>
                </div>
              )}

              {profile.user?.email && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900 break-all">{profile.user.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="border-t pt-4">
              <h5 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h5>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone Number</label>
                    <p className="text-gray-900">{profile.phoneNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900">{profile.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-[#38A3A5] mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                    <p className="text-gray-900">{profile.emergencyContact}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            {(profile.allergies || profile.chronicConditions || profile.chronicDiseases) && (
              <div className="border-t pt-4">
                <h5 className="text-lg font-semibold text-gray-900 mb-3">Medical Information</h5>
                <div className="space-y-4">
                  {profile.allergies && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Allergies</label>
                      <p className="text-gray-900 whitespace-pre-wrap bg-red-50 p-3 rounded-lg border border-red-200 mt-1">
                        {profile.allergies}
                      </p>
                    </div>
                  )}

                  {(profile.chronicConditions || profile.chronicDiseases) && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Chronic Conditions</label>
                      <p className="text-gray-900 whitespace-pre-wrap bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-1">
                        {profile.chronicConditions || profile.chronicDiseases}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">
            No profile data available
          </div>
        )}
      </div>
    </div>
  );
}
