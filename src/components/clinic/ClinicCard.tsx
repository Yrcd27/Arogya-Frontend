import type { ReactNode } from 'react';
import { CalendarClockIcon, MapPinIcon } from 'lucide-react';
import type { Clinic } from '../../types/clinic';
import { formatDate, formatTime } from '../../utils/clinic';
import { StatusBadge } from '../StatusBadge';

interface ClinicCardProps {
  clinic: Clinic;
  additionalInfo?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function ClinicCard({ clinic, additionalInfo, footer, className = '' }: ClinicCardProps) {
  const area = [clinic.district, clinic.province].filter(Boolean).join(', ');
  const schedule = [formatDate(clinic.scheduledDate), formatTime(clinic.scheduledTime)].filter(Boolean).join(' at ');

  return (
    <article className={`flex h-full min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words text-base font-semibold text-gray-900">{clinic.clinicName}</h3>
        <StatusBadge status={clinic.status} className="shrink-0" />
      </div>

      <div className="mt-3 space-y-2 text-sm text-gray-600">
        <p className="flex items-start gap-2">
          <MapPinIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span className="min-w-0 break-words">{area || 'Area not provided'}</span>
        </p>
        <p className="flex items-start gap-2">
          <CalendarClockIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span className="min-w-0 break-words">{schedule}</span>
        </p>
        {clinic.location && <p className="pl-6 text-gray-500">{clinic.location}</p>}
      </div>

      {additionalInfo && <div className="mt-3">{additionalInfo}</div>}
      {footer && <div className="mt-auto pt-4">{footer}</div>}
    </article>
  );
}
