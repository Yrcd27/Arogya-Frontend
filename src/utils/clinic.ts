// Utility functions for clinic operations

import { Clinic, ClinicFilters } from '../types/clinic';

/**
 * Format date string to user-friendly format
 */
export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format time string to user-friendly format
 */
export const formatTime = (timeStr: string): string => {
  return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get days until clinic date with user-friendly text
 */
export const getDaysUntilClinic = (dateStr: string): string | null => {
  const clinicDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = clinicDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return null;
};

/**
 * Check if a date is in the past
 */
export const isPastDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Filter clinics based on search criteria
 */
export const filterClinics = (clinics: Clinic[], filters: ClinicFilters): Clinic[] => {
  return clinics.filter(clinic => {
    // Search filter
    const matchesSearch = filters.searchTerm === '' || 
      clinic.clinicName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      clinic.district.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      clinic.province.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (clinic.location && clinic.location.toLowerCase().includes(filters.searchTerm.toLowerCase()));

    // Province filter
    const matchesProvince = filters.province === '' || clinic.province === filters.province;

    // District filter
    const matchesDistrict = filters.district === '' || clinic.district === filters.district;

    // Status filter (for admin view)
    const matchesStatus = filters.status === 'All Status' || clinic.status === filters.status;

    // Date range filter
    const clinicDate = new Date(clinic.scheduledDate);
    const matchesDateRange = 
      (filters.dateRange.start === '' || clinicDate >= new Date(filters.dateRange.start)) &&
      (filters.dateRange.end === '' || clinicDate <= new Date(filters.dateRange.end));

    return matchesSearch && matchesProvince && matchesDistrict && matchesStatus && matchesDateRange;
  });
};

/**
 * Sort clinics based on selected criteria
 */
export const sortClinics = (clinics: Clinic[], sortBy: string): Clinic[] => {
  return [...clinics].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      case 'name':
        return a.clinicName.localeCompare(b.clinicName);
      case 'province':
        return a.province.localeCompare(b.province);
      default:
        return 0;
    }
  });
};

/**
 * Get available clinics (scheduled and future dates only)
 */
export const getAvailableClinics = (clinics: Clinic[]): Clinic[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return clinics.filter((clinic: Clinic) => {
    const clinicDate = new Date(clinic.scheduledDate);
    return clinic.status === 'SCHEDULED' && clinicDate >= today;
  });
};

/**
 * Validate clinic form data
 */
export const validateClinicForm = (formData: {
  clinicName: string;
  province: string;
  district: string;
  scheduledDate: string;
  scheduledTime: string;
}, selectedDoctors: { doctorId: number; name: string; specialization: string }[]): string | null => {
  if (!formData.clinicName.trim()) {
    return 'Clinic name is required';
  }
  if (!formData.province) {
    return 'Province is required';
  }
  if (!formData.district) {
    return 'District is required';
  }
  if (!formData.scheduledDate) {
    return 'Scheduled date is required';
  }
  if (!formData.scheduledTime) {
    return 'Scheduled time is required';
  }
  
  // Check if date is not in the past
  if (isPastDate(formData.scheduledDate)) {
    return 'Scheduled date cannot be in the past';
  }

  if (selectedDoctors.length === 0) {
    return 'At least one doctor must be assigned to the clinic';
  }

  return null;
};

/**
 * Get status color class for UI display
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-blue-100 text-blue-600';
    case 'IN_PROGRESS':
      return 'bg-[#38A3A5] bg-opacity-20 text-[#38A3A5]';
    case 'COMPLETED':
      return 'bg-green-100 text-green-600';
    case 'CANCELLED':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-200 text-gray-600';
  }
};

/**
 * Format time for API submission (ensure HH:MM:SS format)
 */
export const formatTimeForAPI = (timeStr: string): string => {
  // If time is in HH:MM format, add :00 for seconds
  if (timeStr && !timeStr.includes(':00') && timeStr.split(':').length === 2) {
    return timeStr + ':00';
  }
  return timeStr;
};