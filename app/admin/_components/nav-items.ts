import { LayoutDashboard, CalendarDays, Users, Scissors, UsersRound, ListTodo, Settings } from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

/** Única fuente de verdad del nav — usada por el sidebar (desktop) y los tabs inferiores (mobile). */
export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Inicio', href: '/admin', icon: LayoutDashboard },
  { key: 'agenda', label: 'Agenda', href: '/admin/agenda', icon: CalendarDays },
  { key: 'clientes', label: 'Clientes', href: '/admin/clientes', icon: Users },
  { key: 'staff', label: 'Staff', href: '/admin/staff', icon: UsersRound },
  { key: 'servicios', label: 'Servicios', href: '/admin/servicios', icon: Scissors },
  { key: 'lista-espera', label: 'Lista de espera', href: '/admin/lista-espera', icon: ListTodo },
  { key: 'config', label: 'Config', href: '/admin/config', icon: Settings },
];
