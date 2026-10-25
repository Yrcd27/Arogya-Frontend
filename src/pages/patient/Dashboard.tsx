import { useState } from 'react';
import { Sidebar } from '../../components/patient/Sidebar';
import { Header } from '../../components/patient/Header';
import { EmptyState } from '../../components/EmptyState';
import { PatientCard } from '../../components/patient/PatientCard';
import { SummaryCards } from '../../components/patient/SummaryCards';
import { ClinicList, DashboardPanel } from '../../components/dashboard/DashboardWidgets';
import { StatusBadge } from '../../components/StatusBadge';
import { useDashboardData } from '../../hooks/useDashboardData';
import { availableClinics } from '../../utils/dashboard';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const { clinics, consultations, reports, patientQueues } = useDashboardData({ role: 'patient' });
  const available = availableClinics(clinics.data ?? []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={'flex min-h-screen flex-col transition-all duration-300 ' + (isSidebarOpen ? 'md:ml-64' : 'md:ml-0')}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="min-w-0 flex-1 space-y-5 p-4 sm:p-6">
          <div><p className="mb-1 text-sm text-gray-600">Dashboard</p><h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Patient Dashboard</h1><p className="mt-1 text-sm text-gray-500">Your health information, clinic participation, and medical records.</p></div>
          <SummaryCards consultationCount={consultations.data?.total} reportCount={reports.data?.total} clinicCount={clinics.data ? available.length : undefined} consultationsLoading={consultations.loading} reportsLoading={reports.loading} clinicsLoading={clinics.loading} />
          <PatientCard />
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <DashboardPanel title="Your queue participation" description="Previously joined queues available on this device. Open Mobile Clinics to check another clinic." loading={patientQueues.loading} refreshing={patientQueues.refreshing} error={patientQueues.error} onRetry={patientQueues.reload} action={{ to: '/patient/clinics', label: 'Check clinic queues' }}>
            {!!patientQueues.data?.unverified && <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Some previous queue joins could not be verified. Check your queue before trying to join again.</p>}
            {!patientQueues.data?.tokens.length ? <EmptyState title="No confirmed queue tokens" description="No active queue tokens could be confirmed from your previous joins on this device." />
              : <ul className="divide-y divide-gray-100">{patientQueues.data.tokens.map(token => <li key={token.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"><div className="min-w-0"><p translate="no" className="notranslate break-words font-medium text-gray-900">{clinics.data?.find(clinic => clinic.id === Number(token.clinicId))?.clinicName || 'Clinic #' + token.clinicId}</p><p className="mt-1 text-sm text-gray-600">Token #{token.tokenNumber}{token.status === 'PENDING' ? ' · Position ' + token.position : ' · Currently being served'}</p></div><StatusBadge status={token.status} /></li>)}</ul>}
            </DashboardPanel>
            <DashboardPanel title="Upcoming mobile clinics" description="Available scheduled clinics, not confirmed appointments." loading={clinics.loading} refreshing={clinics.refreshing} error={clinics.error} onRetry={clinics.reload} action={{ to: '/patient/clinics', label: 'Find a clinic and join its queue' }}>
              <ClinicList clinics={available} />
              {available.length > 5 && <p className="mt-3 text-xs text-gray-500">Showing 5 of {available.length} available clinics.</p>}
            </DashboardPanel>
          </div>
        </main>
      </div>
    </div>
  );
}
