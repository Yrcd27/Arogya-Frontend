import React from 'react';
import { CalendarIcon, ClipboardListIcon, FileTextIcon } from 'lucide-react';
export function SummaryCards() {
  const cards = [{
    icon: CalendarIcon,
    label: 'Next Appointment',
    value: 'Jun 20',
    color: '#38a3a5'
  }, {
    icon: ClipboardListIcon,
    label: 'Prescriptions',
    value: '8',
    color: '#38a3a5'
  }, {
    icon: FileTextIcon,
    label: 'Lab Results',
    value: '5',
    color: '#38a3a5'
  }];
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map(card => <div key={card.label} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">{card.label}</p>
              <p className="text-4xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className="p-3 rounded-lg" style={{
          backgroundColor: `${card.color}20`
        }}>
              <card.icon className="w-6 h-6" style={{
            color: card.color
          }} />
            </div>
          </div>
        </div>)}
    </div>;
}