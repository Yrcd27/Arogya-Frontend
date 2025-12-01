import { CalendarIcon, ClipboardListIcon, FileTextIcon } from 'lucide-react';
import { useDashboardData } from '../../hooks/useDashboardData';

export function SummaryCards() {
  const { stats, loading } = useDashboardData();

  const cards = [{
    icon: CalendarIcon,
    label: 'Scheduled Clinics',
    value: loading ? '...' : (stats?.scheduledClinics?.toString() || '0'),
    color: '#38a3a5'
  }, {
    icon: ClipboardListIcon,
    label: 'Available Doctors',
    value: loading ? '...' : (stats?.totalDoctors?.toString() || '0'),
    color: '#38a3a5'
  }, {
    icon: FileTextIcon,
    label: 'Total Clinics',
    value: loading ? '...' : (stats?.totalClinics?.toString() || '0'),
    color: '#38a3a5'
  }];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
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
        </div>
      ))}
    </div>
  );
}