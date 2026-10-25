// Utility functions for clinic operations

import { PROVINCES_DISTRICTS, type Clinic, type ClinicFilters, type CreateClinicRequest, type SelectedDoctor } from '../types/clinic';
import type { FieldErrors } from './formValidation';
import { businessDateString, businessTimeString } from './businessDate';
import { isPositiveId } from './clinicalValidation';

export const CLINIC_FIELDS = ['clinicName', 'province', 'district', 'location', 'scheduledDate', 'scheduledTime', 'status', 'doctorIds'] as const;
export type ClinicField = (typeof CLINIC_FIELDS)[number];
export const CLINIC_STATUSES: readonly string[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
export const CLINIC_SORT_OPTIONS = ['date', 'name', 'province'] as const;
export const CLINIC_NAME_MAX_LENGTH = 255;
export const CLINIC_LOCATION_MAX_LENGTH = 500;

export function isValidClinicDate(value: string): boolean {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

export function getDistrictOptions(province: string): readonly string[] {
  return Object.prototype.hasOwnProperty.call(PROVINCES_DISTRICTS, province)
    ? PROVINCES_DISTRICTS[province as keyof typeof PROVINCES_DISTRICTS] : [];
}

export function getProvinceDistrictErrors(province: string, district: string, required = false): FieldErrors<'province' | 'district'> {
  const errors: FieldErrors<'province' | 'district'> = {};
  const districts = getDistrictOptions(province);
  if (!province && required) errors.province = 'Province is required.';
  else if (province && !districts.length) errors.province = 'Select a valid province.';
  if (!district && required) errors.district = 'District is required.';
  else if (district && !districts.includes(district)) errors.district = 'Select a district belonging to the selected province.';
  return errors;
}

export function validateClinicFields(formData: CreateClinicRequest, selectedDoctors: SelectedDoctor[], isEditMode = false, allowedDoctorIds?: readonly number[], today = businessDateString(), nowTime = businessTimeString()): FieldErrors<ClinicField> {
  const errors: FieldErrors<ClinicField> = getProvinceDistrictErrors(formData.province, formData.district, true);
  if (!formData.clinicName.trim()) errors.clinicName = 'Clinic name is required.';
  else if (formData.clinicName.trim().length > CLINIC_NAME_MAX_LENGTH) errors.clinicName = `Clinic name must be ${CLINIC_NAME_MAX_LENGTH} characters or fewer.`;
  if (formData.location && formData.location.trim().length > CLINIC_LOCATION_MAX_LENGTH) errors.location = `Location must be ${CLINIC_LOCATION_MAX_LENGTH} characters or fewer.`;
  if (!formData.scheduledDate) errors.scheduledDate = 'Scheduled date is required.';
  else if (!isValidClinicDate(formData.scheduledDate)) errors.scheduledDate = 'Enter a valid scheduled date.';
  else if (!isEditMode && formData.scheduledDate < today) errors.scheduledDate = 'Scheduled date cannot be in the past.';
  if (!formData.scheduledTime) errors.scheduledTime = 'Scheduled time is required.';
  else if (!/^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/.test(formData.scheduledTime)) errors.scheduledTime = 'Enter a valid time in 24-hour format.';
  else if (!isEditMode && formData.scheduledDate === today && formData.scheduledTime.slice(0, 5) < nowTime) errors.scheduledTime = 'Scheduled time cannot be in the past.';
  if (!CLINIC_STATUSES.includes(formData.status) || !isEditMode && formData.status !== 'SCHEDULED') errors.status = 'Select a valid clinic status.';
  const ids = selectedDoctors.map(doctor => doctor.doctorId);
  if (!ids.length) errors.doctorIds = 'At least one doctor must be assigned to the clinic.';
  else if (ids.some(id => typeof id !== 'number' || !isPositiveId(id) || allowedDoctorIds !== undefined && !allowedDoctorIds.includes(id)) || new Set(ids).size !== ids.length) {
    errors.doctorIds = 'Select valid doctors from the available or currently assigned doctors. Remove duplicate or unavailable selections.';
  }
  return errors;
}

export function validateClinicFilters(filters: ClinicFilters, today = businessDateString()): FieldErrors<'province' | 'district' | 'start' | 'end' | 'status' | 'sortBy'> {
  const errors = { ...getProvinceDistrictErrors(filters.province, filters.district) } as FieldErrors<'province' | 'district' | 'start' | 'end' | 'status' | 'sortBy'>;
  for (const field of ['start', 'end'] as const) {
    const date = filters.dateRange[field];
    if (date && !isValidClinicDate(date)) errors[field] = 'Enter a valid filter date.';
    else if (date && date < today) errors[field] = 'Choose today or a future date.';
  }
  if (!errors.start && !errors.end && filters.dateRange.start && filters.dateRange.end && filters.dateRange.start > filters.dateRange.end) errors.end = 'To date must be on or after From date.';
  if (filters.status !== 'All Status' && !CLINIC_STATUSES.includes(filters.status)) errors.status = 'Select a valid status filter.';
  if (!CLINIC_SORT_OPTIONS.some(option => option === filters.sortBy)) errors.sortBy = 'Select a valid sorting option.';
  return errors;
}

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
  return isValidClinicDate(dateStr) && dateStr < businessDateString();
};

/**
 * Filter clinics based on search criteria
 */
export const filterClinics = (clinics: Clinic[], filters: ClinicFilters): Clinic[] => {
  const search = filters.searchTerm.trim().toLowerCase();
  return clinics.filter(clinic => {
    // Search filter
    const matchesSearch = search === '' ||
      [clinic.clinicName, clinic.district, clinic.province, clinic.location || ''].some(value => value.toLowerCase().includes(search));

    // Province filter
    const matchesProvince = filters.province === '' || clinic.province === filters.province;

    // District filter
    const matchesDistrict = filters.district === '' || clinic.district === filters.district;

    // Status filter (for admin view)
    const matchesStatus = filters.status === 'All Status' || clinic.status === filters.status;

    // Date range filter
    const clinicDate = clinic.scheduledDate;
    const matchesDateRange = 
      (filters.dateRange.start === '' || isValidClinicDate(filters.dateRange.start) && clinicDate >= filters.dateRange.start) &&
      (filters.dateRange.end === '' || isValidClinicDate(filters.dateRange.end) && clinicDate <= filters.dateRange.end);

    return matchesSearch && matchesProvince && matchesDistrict && matchesStatus && matchesDateRange;
  });
};

/**
 * Sort clinics based on selected criteria
 */
export const sortClinics = (clinics: Clinic[], sortBy: string): Clinic[] => {
  return [...clinics].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return b.id - a.id;
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
 * Get clinics a patient can join: in-progress clinics, plus scheduled clinics today or later
 */
export const getAvailableClinics = (clinics: Clinic[]): Clinic[] => {
  const today = businessDateString();
  
  return clinics.filter((clinic: Clinic) => {
    if (clinic.status === 'IN_PROGRESS') return true;
    return clinic.status === 'SCHEDULED' && isValidClinicDate(clinic.scheduledDate) && clinic.scheduledDate >= today;
  });
};

/**
 * Format time for API submission (ensure HH:MM:SS format)
 */
export const formatTimeForAPI = (timeStr: string): string => {
  const time = timeStr.trim();
  return /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(time) ? `${time}:00` : time;
};
