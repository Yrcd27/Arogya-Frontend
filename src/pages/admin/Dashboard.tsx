import { useState } from 'react';
import { CalendarDays, Hospital, Stethoscope } from 'lucide-react';
import { Sidebar } from '../../components/admin/Sidebar';
import { Header } from '../../components/admin/Header';
import { EmptyState } from '../../components/EmptyState';
import { ClinicList, DashboardMetric, DashboardPanel } from '../../components/dashboard/DashboardWidgets';
import { useDashboardData } from '../../hooks/useDashboardData';
import { operationalClinics } from '../../utils/dashboard';
import { businessDateString } from '../../utils/businessDate';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const { clinics, assignments } = useDashboardData({ role: 'admin' });
  const today = businessDateString();
  const schedule = operationalClinics(clinics.data ?? []);
  const refreshAssignments = () => { assignments.reload(); if (!clinics.data) clinics.reload(); };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={'flex min-h-screen flex-col transition-all duration-300 ' + (isSidebarOpen ? 'md:ml-64' : 'md:ml-0')}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="min-w-0 flex-1 space-y-5 p-4 sm:p-6">
          <div><p className="mb-1 text-sm text-gray-600">Dashboard</p><h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Admin Dashboard</h1><p className="mt-1 text-sm text-gray-500">Clinic operations, schedules, and doctor coverage.</p></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <DashboardMetric label="Today's clinics" value={clinics.data ? schedule.filter(clinic => clinic.scheduledDate === today).length : null} loading={clinics.loading} hint="Scheduled or in progress today" icon={CalendarDays} />
            <DashboardMetric label="Clinics in progress" value={clinics.data?.filter(clinic => clinic.status === 'IN_PROGRESS').length} loading={clinics.loading} hint="Current status reported by clinics" icon={Hospital} />
            <DashboardMetric label="Upcoming clinics" value={clinics.data ? schedule.filter(clinic => clinic.status === 'SCHEDULED').length : null} loading={clinics.loading} hint="Scheduled from today onward" icon={Stethoscope} />
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <DashboardPanel title="Clinic schedule" description="In-progress clinics first, followed by the next scheduled visits." loading={clinics.loading} refreshing={clinics.refreshing} error={clinics.error} onRetry={clinics.reload} action={{ to: '/admin/clinics', label: 'Manage clinic schedules' }}>
              <ClinicList clinics={schedule} />
              {schedule.length > 5 && <p className="mt-3 text-xs text-gray-500">Showing 5 of {schedule.length} active and upcoming clinics.</p>}
            </DashboardPanel>
            <DashboardPanel title="Doctor assignments" description="Coverage for the clinics in the schedule preview." loading={clinics.loading || assignments.loading} refreshing={assignments.refreshing} error={(!clinics.data && clinics.error) || assignments.error} onRetry={refreshAssignments}>
              {!schedule.length ? <EmptyState icon={<Stethoscope />} title="No upcoming assignments" description="There are no upcoming clinic assignments to display." />
                : <ul className="divide-y divide-gray-100">{schedule.slice(0, 5).map(clinic => {
                  const doctors = Array.from(new Map((assignments.data ?? []).filter(row => row.clinic?.id === clinic.id).map(row => [row.doctorRefId, row])).values());
                  return <li key={clinic.id} className="py-3 first:pt-1 last:pb-0"><p className="break-words font-medium text-gray-900">{clinic.clinicName}</p><p className={'mt-1 text-sm ' + (doctors.length ? 'text-gray-600' : 'text-amber-700')}>{doctors.length ? doctors.length + (doctors.length === 1 ? ' doctor assigned' : ' doctors assigned') : 'No doctors assigned'}</p>{doctors.length > 0 && <p className="mt-1 break-words text-xs leading-5 text-gray-500">{doctors.map(doctor => doctor.doctorName || 'Doctor #' + doctor.doctorRefId).join(', ')}</p>}</li>;
                })}</ul>}
            </DashboardPanel>
          </div>
        </main>
      </div>
    </div>
  );
}
