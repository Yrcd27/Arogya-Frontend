import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, FileText, Hospital } from 'lucide-react';
import { Sidebar } from '../../components/doctor/Sidebar';
import { Header } from '../../components/doctor/Header';
import { ClinicList, DashboardMetric, DashboardPanel } from '../../components/dashboard/DashboardWidgets';
import { useDashboardData } from '../../hooks/useDashboardData';
import { operationalClinics } from '../../utils/dashboard';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const [clinicId, setClinicId] = useState<number | null>(null);
  const { clinics, assignments, myClinics, consultations, waitingQueue, profileId, profileStatus, profileError, retryProfile } = useDashboardData({ role: 'doctor', clinicId });
  const schedule = operationalClinics(myClinics);
  const clinicLoading = clinics.loading || assignments.loading || profileStatus === 'loading';
  const clinicError = clinics.error || assignments.error || (profileStatus === 'error' ? profileError || 'Your doctor profile could not be verified.' : null);
  const clinicReady = profileId !== null && !!clinics.data && !!assignments.data;
  const refreshClinics = () => { clinics.reload(); assignments.reload(); if (profileId === null) void retryProfile(); };
  const selectedClinic = myClinics.find(clinic => clinic.id === clinicId);

  useEffect(() => {
    if (!myClinics.some(clinic => clinic.id === clinicId)) setClinicId(operationalClinics(myClinics)[0]?.id ?? myClinics[0]?.id ?? null);
  }, [myClinics, clinicId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={'flex min-h-screen flex-col transition-all duration-300 ' + (isSidebarOpen ? 'md:ml-64' : 'md:ml-0')}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="min-w-0 flex-1 space-y-5 p-4 sm:p-6">
          <div><p className="mb-1 text-sm text-gray-600">Dashboard</p><h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Doctor Dashboard</h1><p className="mt-1 text-sm text-gray-500">Your clinics and waiting patients.</p></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <DashboardMetric label="Assigned clinics" value={clinicReady ? myClinics.length : null} loading={clinicLoading} hint="Clinics assigned to your profile" icon={Hospital} />
            <DashboardMetric label="Upcoming visits" value={clinicReady ? schedule.filter(clinic => clinic.status === 'SCHEDULED').length : null} loading={clinicLoading} hint="Your scheduled clinics from today" icon={CalendarDays} />
            <DashboardMetric label="My consultations" value={consultations.data?.total} loading={consultations.loading} hint="Consultations linked to your account" icon={FileText} />
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <DashboardPanel title="Assigned clinic schedule" description="Your in-progress and upcoming clinics." loading={clinicLoading} error={clinicError} onRetry={refreshClinics}>
              {profileId === null ? <p className="py-3 text-sm text-gray-600">A verified doctor profile is needed to display assignments. <Link className="font-medium text-[#2d8284] underline" to="/doctor/profile">Open your profile</Link></p>
                : <><ClinicList clinics={schedule} queueLinks />{schedule.length > 5 && <p className="mt-3 text-xs text-gray-500">Showing 5 of {schedule.length} active and upcoming assigned clinics.</p>}</>}
            </DashboardPanel>
            <DashboardPanel title="Waiting queue" description="Pending patients at one of your assigned clinics." loading={clinicLoading} error={clinicError} onRetry={refreshClinics}>
              <label htmlFor="dashboard-doctor-clinic" className="mb-2 block text-sm font-medium text-gray-700">Clinic</label>
              <select id="dashboard-doctor-clinic" value={selectedClinic ? clinicId ?? '' : ''} onChange={event => setClinicId(Number(event.target.value) || null)} disabled={!clinicReady || !myClinics.length} className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-60">
                <option value="" disabled>{!clinicReady ? 'Clinic assignments unavailable' : !myClinics.length ? 'No assigned clinics' : 'Select a clinic'}</option>
                {myClinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.clinicName}</option>)}
              </select>
              {selectedClinic && <div aria-busy={waitingQueue.loading}>
                {waitingQueue.loading ? <p role="status" className="py-3 text-sm text-gray-500">Loading waiting patients…</p>
                  : waitingQueue.error ? <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{waitingQueue.error}<button type="button" onClick={waitingQueue.reload} className="ml-2 font-medium underline">Try again</button></div>
                  : waitingQueue.data ? <><p className="mb-2 text-sm text-gray-600"><span className="font-semibold text-gray-900">{waitingQueue.data.length}</span> waiting {waitingQueue.data.length === 1 ? 'patient' : 'patients'}</p>{waitingQueue.data.length > 0 && <ul className="divide-y divide-gray-100">{waitingQueue.data.slice(0, 3).map(token => <li key={token.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="font-medium text-gray-900">Token #{token.tokenNumber}</span><span className="text-gray-500">Position {token.position}</span></li>)}</ul>}</> : null}
                <p className="mt-3 text-xs leading-5 text-gray-500">Currently serving patients are managed on the queue page.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3"><Link to={'/doctor/queue?clinicId=' + selectedClinic.id} className="inline-flex rounded-lg bg-[#38A3A5] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d8284]">Open clinic queue</Link><button type="button" onClick={waitingQueue.reload} disabled={waitingQueue.loading} className="rounded text-sm font-medium text-[#2d8284] hover:underline disabled:opacity-50">Refresh queue</button></div>
              </div>}
            </DashboardPanel>
          </div>
        </main>
      </div>
    </div>
  );
}
