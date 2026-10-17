import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CalendarDays, RefreshCw, type LucideIcon } from 'lucide-react';
import type { Clinic } from '../../types/clinic';
import type { Consultation } from '../../services/consultationService';
import type { TestResult } from '../../services/medicalRecordsService';
import { dashboardDate } from '../../utils/dashboard';
import { StatusBadge } from '../StatusBadge';

export function DashboardMetric({ label, value, loading, hint, icon: Icon }: {
  label: string; value: number | null | undefined; loading?: boolean; hint?: string; icon: LucideIcon;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#38A3A5]" />
      </div>
      {loading ? <div role="status" className="mt-3"><span className="sr-only">Loading {label}</span><div aria-hidden="true" className="h-8 w-20 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" /></div>
        : <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{value == null ? <span aria-label="Unavailable">—</span> : value.toLocaleString()}</p>}
      {hint && <p className="mt-1 text-xs leading-5 text-gray-500">{hint}</p>}
    </div>
  );
}

export function DashboardPanel({ title, description, action, loading, error, onRetry, children, className = '' }: {
  title: string; description?: string; action?: { to: string; label: string }; loading?: boolean;
  error?: string | null; onRetry?: () => void; children: ReactNode; className?: string;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} aria-busy={loading} className={`min-w-0 rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>}
        </div>
        {onRetry && <button type="button" onClick={onRetry} disabled={loading} aria-label={`Refresh ${title}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 hover:text-[#2d8284] disabled:opacity-40"><RefreshCw aria-hidden="true" className="h-4 w-4" /></button>}
      </div>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        {loading ? <div role="status" className="space-y-3 py-2"><span className="sr-only">Loading {title}</span>{[0, 1, 2].map(row => <div key={row} aria-hidden="true" className="h-12 animate-pulse rounded-lg bg-gray-50 motion-reduce:animate-none" />)}</div>
          : error ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="flex items-start gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p className="min-w-0 break-words">{error}</p></div>{onRetry && <button type="button" onClick={onRetry} className="mt-2 font-semibold underline underline-offset-2">Try again</button>}</div>
          : children}
      </div>
      {action && <div className="border-t border-gray-100 px-4 py-3 sm:px-5"><Link to={action.to} className="inline-flex items-center gap-2 rounded text-sm font-medium text-[#2d8284] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]">{action.label}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>}
    </section>
  );
}

export function ClinicList({ clinics, queueLinks = false }: { clinics: Clinic[]; queueLinks?: boolean }) {
  if (!clinics.length) return <p className="py-3 text-sm text-gray-500">No upcoming or in-progress clinics.</p>;
  return <ul className="divide-y divide-gray-100">{clinics.slice(0, 5).map(clinic => (
    <li key={clinic.id} className="py-3 first:pt-1 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2"><p className="min-w-0 break-words font-medium text-gray-900">{clinic.clinicName}</p><StatusBadge status={clinic.status} className="shrink-0" /></div>
      <p className="mt-1 flex items-start gap-2 text-sm text-gray-600"><CalendarDays aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{dashboardDate(`${clinic.scheduledDate}T${clinic.scheduledTime}`, true)}</p>
      <p className="mt-1 break-words text-sm text-gray-500">{[clinic.location, clinic.district].filter(Boolean).join(' · ') || 'Location not provided'}</p>
      {queueLinks && <Link to={`/doctor/queue?clinicId=${clinic.id}`} className="mt-2 inline-flex rounded text-sm font-medium text-[#2d8284] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]">Open queue</Link>}
    </li>
  ))}</ul>;
}

export function ConsultationList({ consultations, role }: { consultations: Consultation[]; role: 'patient' | 'doctor' }) {
  if (!consultations.length) return <p className="py-3 text-sm text-gray-500">No consultations recorded yet.</p>;
  return <ul className="divide-y divide-gray-100">{consultations.map(consultation => (
    <li key={consultation.id} className="py-3 first:pt-1 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2"><p className="min-w-0 break-words font-medium text-gray-900">Consultation #{consultation.id}</p><StatusBadge status={consultation.status} /></div>
      <p className="mt-1 line-clamp-2 break-words text-sm text-gray-700">{consultation.chiefComplaint || 'Complaint not provided'}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{dashboardDate(consultation.bookedAt || consultation.completedAt)} · {role === 'doctor' ? `Patient #${consultation.patientId}` : `Doctor #${consultation.doctorId}`}</p>
    </li>
  ))}</ul>;
}

export function ReportList({ reports }: { reports: TestResult[] }) {
  if (!reports.length) return <p className="py-3 text-sm text-gray-500">No lab reports available yet.</p>;
  return <ul className="divide-y divide-gray-100">{reports.map(report => (
    <li key={report.id} className="py-3 first:pt-1 last:pb-0">
      <p className="font-medium text-gray-900">Report #{report.id} <span className="font-normal text-gray-500">· Lab test #{report.labTestId}</span></p>
      <p className="mt-1 line-clamp-2 break-words text-sm text-gray-700">{report.testResultDescription || 'Description not provided'}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{dashboardDate(report.createdAt)} · {report.files?.length ?? 0} attachment{report.files?.length === 1 ? '' : 's'}</p>
    </li>
  ))}</ul>;
}
