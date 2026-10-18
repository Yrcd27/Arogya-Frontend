import { DashboardHeader } from '../DashboardHeader';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return <DashboardHeader role="patient" onToggleSidebar={onToggleSidebar} />;
}
