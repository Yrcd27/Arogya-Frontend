import { useNavigate } from 'react-router-dom';
import { CalendarIcon, ClipboardListIcon, FileTextIcon, AlertCircleIcon } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

export function SummaryCards() {
  const navigate = useNavigate();
  const { stats, failedFields, loading, error } = useDashboardData();

  const fmt = (value: number, failed: boolean) => (failed ? '—' : value.toLocaleString());

  const cards = [{
    icon: CalendarIcon,
    label: 'Scheduled Clinics',
    value: loading ? '...' : fmt(stats.scheduledClinics, failedFields.scheduledClinics),
    color: '#38a3a5'
  }, {
    icon: ClipboardListIcon,
    label: 'Available Doctors',
    value: loading ? '...' : fmt(stats.totalDoctors, failedFields.totalDoctors),
    color: '#38a3a5'
  }, {
    icon: FileTextIcon,
    label: 'Total Clinics',
    value: loading ? '...' : fmt(stats.totalClinics, failedFields.totalClinics),
    color: '#38a3a5'
  }];

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          <AlertCircleIcon className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {cards.map(card => (
        <button
          key={card.label}
          type="button"
          onClick={() => navigate('/patient/clinics')}
          className="text-left bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-600 text-sm mb-1">{card.label}</p>
              {loading ? (
                <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl sm:text-4xl font-bold text-gray-900">{card.value}</p>
              )}
            </div>
            <div className="p-2 sm:p-3 rounded-lg flex-shrink-0" style={{
              backgroundColor: `${card.color}20`
            }}>
              <card.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{
                color: card.color
              }} />
            </div>
          </div>
        </button>
      ))}
      </div>
    </div>
  );
}