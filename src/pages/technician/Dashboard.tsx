import { useMemo, useState } from 'react';
import { ClipboardList, FileCheck2, FlaskConical } from 'lucide-react';
import { Sidebar } from '../../components/technician/Sidebar';
import { Header } from '../../components/technician/Header';
import { EmptyState } from '../../components/EmptyState';
import { DashboardMetric, DashboardPanel } from '../../components/dashboard/DashboardWidgets';
import { useDashboardData } from '../../hooks/useDashboardData';

export function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  const { labTests, reports, profileStatus, profileError } = useDashboardData({ role: 'technician' });
  const needsAttention = useMemo(
    () => labTests.data?.items.filter(test => test.status === 'PENDING' || test.status === 'IN_PROGRESS') ?? [],
    [labTests.data],
  );
  const reportError = reports.error || (profileStatus === 'error' ? profileError || 'Your technician profile could not be verified.' : null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={'flex min-h-screen flex-col transition-all duration-300 ' + (isSidebarOpen ? 'md:ml-64' : 'md:ml-0')}>
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="min-w-0 flex-1 space-y-5 p-4 sm:p-6">
          <div><p className="mb-1 text-sm text-gray-600">Dashboard</p><h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Technician Dashboard</h1><p className="mt-1 text-sm text-gray-500">A compact overview of your laboratory work.</p></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <DashboardMetric label="Lab orders" value={labTests.data?.total} loading={labTests.loading} hint="All accessible lab orders" icon={FlaskConical} />
            <DashboardMetric label="Needs attention" value={labTests.error ? null : needsAttention.length} loading={labTests.loading} hint="Pending or in progress among the first five returned orders" icon={ClipboardList} />
            <DashboardMetric label="My submitted reports" value={reportError ? null : reports.data?.total} loading={reports.loading || profileStatus === 'loading'} hint={reportError ? 'Unavailable until your report summary can load' : 'Reports linked to your technician profile'} icon={FileCheck2} />
          </div>
          {reportError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your submitted-report total is unavailable: {reportError}</p>}
          <DashboardPanel title="Needs attention" description="Pending and in-progress work from the first five orders returned by the worklist." loading={labTests.loading} error={labTests.error} action={{ to: '/technician/lab-tests', label: 'Open Lab Tests' }}>
            {needsAttention.length
              ? <p className="py-2 text-sm text-gray-700"><span className="font-semibold text-gray-900">{needsAttention.length}</span> {needsAttention.length === 1 ? 'order needs' : 'orders need'} attention. Open Lab Tests to review, filter, and process them.</p>
              : <EmptyState icon={<ClipboardList />} title="No work needs attention in this preview" description="No pending or in-progress work was found in the current five-order snapshot." />}
          </DashboardPanel>
        </main>
      </div>
    </div>
  );
}
