import { CalendarDays, FileText, FlaskConical } from 'lucide-react';
import { DashboardMetric } from '../dashboard/DashboardWidgets';

interface SummaryCardsProps {
  consultationCount?: number;
  reportCount?: number;
  clinicCount?: number;
  consultationsLoading: boolean;
  reportsLoading: boolean;
  clinicsLoading: boolean;
}

export function SummaryCards({ consultationCount, reportCount, clinicCount, consultationsLoading, reportsLoading, clinicsLoading }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <DashboardMetric label="My consultations" value={consultationCount} loading={consultationsLoading} hint="Consultations linked to your account" icon={FileText} />
      <DashboardMetric label="My lab reports" value={reportCount} loading={reportsLoading} hint="Reports available in your medical records" icon={FlaskConical} />
      <DashboardMetric label="Available clinics" value={clinicCount} loading={clinicsLoading} hint="Scheduled clinics from today onward" icon={CalendarDays} />
    </div>
  );
}
