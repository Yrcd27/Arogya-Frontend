import React, { useEffect, useRef, useState } from 'react';
import { AlertCircleIcon, CheckCircleIcon, SaveIcon, XIcon } from 'lucide-react';
import { Header } from '../../components/admin/Header';
import { Sidebar } from '../../components/admin/Sidebar';
import { ProfileView } from '../../components/profile/ProfileView';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import type { AdminProfile as StoredAdminProfile, CreateAdminProfileInput } from '../../types/user';

interface AdminProfile { id?: number; firstName: string; lastName: string; dateOfBirth: string; phoneNumber: string; nicNumber: string; user: { id: number }; }

const emptyProfile: AdminProfile = { firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '', nicNumber: '', user: { id: 0 } };
const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-[#38A3A5]';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { profile: currentProfile, status: profileStatus, error: profileError, replaceProfile } = useUserProfile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [profile, setProfile] = useState<AdminProfile>(emptyProfile);
  const savedProfile = useRef<AdminProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const savingRef = useRef(false);
  useUnsavedChangesWarning(isEditing && JSON.stringify(profile) !== JSON.stringify(savedProfile.current));

  useEffect(() => {
    if (currentProfile) {
      const nextProfile = currentProfile as StoredAdminProfile;
      setProfile(nextProfile);
      savedProfile.current = nextProfile;
      setIsNewProfile(false);
      setIsEditing(false);
    } else if (profileStatus === 'not-found' && user?.id) {
      const nextProfile = { ...emptyProfile, user: { id: user.id } };
      setProfile(nextProfile);
      savedProfile.current = nextProfile;
      setIsNewProfile(true);
      setIsEditing(false);
    } else if (profileStatus === 'error') setError(profileError || 'Failed to load profile information');
  }, [currentProfile, profileError, profileStatus, user?.id]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfile(previous => ({ ...previous, [name]: value }));
  };
  const startEditing = () => { savedProfile.current = profile; setError(''); setSuccess(''); setIsEditing(true); };
  const cancelEditing = () => { setProfile(savedProfile.current); setError(''); setIsEditing(false); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    setSuccess('');
    const requestBody: CreateAdminProfileInput = { firstName: profile.firstName, lastName: profile.lastName, dateOfBirth: profile.dateOfBirth, phoneNumber: profile.phoneNumber, nicNumber: profile.nicNumber, user: { id: user?.id || profile.user.id } };
    try {
      if (isNewProfile) {
        const created = await profileAPI.createAdmin(requestBody);
        const nextProfile = { ...profile, id: created.id };
        setProfile(nextProfile); savedProfile.current = nextProfile; replaceProfile(created); setSuccess('Profile created successfully!'); setIsNewProfile(false);
      } else {
        if (!profile.id) throw new Error('Profile ID is missing. Please refresh and try again.');
        const updated = await profileAPI.updateAdmin({ ...requestBody, id: profile.id });
        const nextProfile = { ...profile, id: updated.id };
        setProfile(nextProfile); savedProfile.current = nextProfile; replaceProfile(updated); setSuccess('Profile updated successfully!');
      }
      setIsEditing(false);
    } catch (saveError: unknown) {
      console.error('Error saving profile:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save profile');
    } finally { savingRef.current = false; setSaving(false); }
  };

  return <div className="min-h-screen bg-gray-50"><Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} /><div className={`flex min-h-screen flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}><Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} /><main className="flex-1 p-4 sm:p-6 lg:p-8">{profileStatus === 'loading' ? <div className="py-24 text-center text-gray-500">Loading profile...</div> : <><div className="mb-5 sm:mb-7"><p className="mb-2 text-sm text-gray-600">Dashboard / Profile</p><h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{isNewProfile ? 'Complete Your Admin Profile' : 'Admin Profile'}</h1></div>{isNewProfile && !isEditing && <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />Your profile is not complete yet. Select Complete Profile to add your details.</div>}{error && <div role="alert" className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"><AlertCircleIcon className="h-5 w-5" />{error}</div>}{success && <div role="status" className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700"><CheckCircleIcon className="h-5 w-5" />{success}</div>}{isEditing ? <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-7"><div className="mb-6"><h2 className="text-xl font-bold text-gray-900">{isNewProfile ? 'Complete profile' : 'Edit profile'}</h2><p className="mt-1 text-sm text-gray-600">Update your personal and contact information.</p></div><form onSubmit={handleSubmit} className="space-y-6"><div className="grid grid-cols-1 gap-5 md:grid-cols-2">{[['First Name', 'firstName', 'Enter first name'], ['Last Name', 'lastName', 'Enter last name'], ['Date of Birth', 'dateOfBirth', ''], ['Phone Number', 'phoneNumber', '+94771234567'], ['NIC Number', 'nicNumber', '123456789V or 123456789012']].map(([label, name, placeholder]) => <div key={name}><label className="mb-2 block text-sm font-medium text-gray-700">{label} *</label><input type={name === 'dateOfBirth' ? 'date' : name === 'phoneNumber' ? 'tel' : 'text'} name={name} value={profile[name as keyof Omit<AdminProfile, 'id' | 'user'>]} onChange={handleInputChange} required placeholder={placeholder} className={inputClass} /></div>)}</div><div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={cancelEditing} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><XIcon className="h-4 w-4" />Cancel</button><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#38A3A5] px-5 py-2.5 font-medium text-white hover:bg-[#2d8284] disabled:opacity-50"><SaveIcon className="h-4 w-4" />{saving ? 'Saving...' : isNewProfile ? 'Create Profile' : 'Save Changes'}</button></div></form></section> : <ProfileView role="Administrator" name={`${profile.firstName} ${profile.lastName}`.trim()} incomplete={isNewProfile} onEdit={startEditing} sections={[{ title: 'Personal information', details: [{ label: 'First name', value: profile.firstName }, { label: 'Last name', value: profile.lastName }, { label: 'Date of birth', value: profile.dateOfBirth }, { label: 'NIC number', value: profile.nicNumber }] }, { title: 'Contact information', details: [{ label: 'Phone number', value: profile.phoneNumber }] }]} />}</>}</main></div></div>;
};

export default Profile;
