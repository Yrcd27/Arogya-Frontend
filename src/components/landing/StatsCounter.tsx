import { UsersIcon, ActivityIcon, MapPinIcon, AwardIcon } from 'lucide-react';
export function StatsCounter() {
  const stats = [{
    icon: UsersIcon,
    value: '50,000+',
    label: 'Patients Served'
  }, {
    icon: ActivityIcon,
    value: '1,200+',
    label: 'Clinics Conducted'
  }, {
    icon: MapPinIcon,
    value: '85',
    label: 'Rural Areas Covered'
  }, {
    icon: AwardIcon,
    value: '98%',
    label: 'Satisfaction Rate'
  }];
  return <section className="py-20 px-6 bg-[#38A3A5]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map(stat => <div key={stat.label} className="text-center text-white">
              <div className="flex justify-center mb-4">
                <stat.icon className="w-12 h-12" />
              </div>
              <div className="text-4xl font-bold mb-2">{stat.value}</div>
              <div className="text-lg opacity-90">{stat.label}</div>
            </div>)}
        </div>
      </div>
    </section>;
}