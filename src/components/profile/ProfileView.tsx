import { PencilIcon, UserRoundIcon } from 'lucide-react';

export interface ProfileDetail {
  label: string;
  value?: string | number | null;
}

export interface ProfileSection {
  title: string;
  details: ProfileDetail[];
}

interface ProfileViewProps {
  role: string;
  name: string;
  sections: ProfileSection[];
  incomplete?: boolean;
  onEdit: () => void;
}

const displayValue = (value: ProfileDetail['value']) => {
  if (value === undefined || value === null || value === '') return 'Not provided';
  return String(value);
};

export function ProfileView({ role, name, sections, incomplete = false, onEdit }: ProfileViewProps) {
  return (
    <section className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex flex-col gap-4 border-b border-gray-100 bg-[#f7fbfb] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#38A3A5] text-lg font-bold text-white" aria-hidden="true">
            {name ? name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() : <UserRoundIcon className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#2d8284]">{role}</p>
            <h2 className="break-words text-xl font-bold leading-tight text-gray-900 sm:text-2xl">{name || 'Profile details'}</h2>
            {incomplete && <p className="mt-1 text-sm text-amber-700">Complete your profile to keep your information up to date.</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#38A3A5] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#2d8284] focus:outline-none focus:ring-2 focus:ring-[#38A3A5] focus:ring-offset-2"
        >
          <PencilIcon className="h-4 w-4" />
          {incomplete ? 'Complete Profile' : 'Edit Profile'}
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {sections.map((section, index) => (
          <div key={section.title} className={index === 0 ? '' : 'mt-6 border-t border-gray-100 pt-6'}>
            <h3 className="mb-4 text-base font-semibold text-gray-800">{section.title}</h3>
            <dl className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
              {section.details.map(detail => (
                <div key={detail.label} className="min-w-0">
                  <dt className="text-sm text-gray-500">{detail.label}</dt>
                  <dd className={`mt-1 break-words text-sm font-medium leading-6 ${displayValue(detail.value) === 'Not provided' ? 'text-gray-400' : 'text-gray-900'}`}>
                    {displayValue(detail.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
