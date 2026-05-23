'use client';

// ── AppSidebar ────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MicIcon,
  BotIcon,
  ClockIcon,
  BarChart2Icon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useUIStore } from '@/store/useUIStore';

const NAV_ITEMS = [
  { href: '/configs',  label: 'Agents',  icon: BotIcon },
  { href: '/history',  label: 'History', icon: ClockIcon },
  { href: '/metrics',  label: 'Metrics', icon: BarChart2Icon },
] as const;

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center rounded-md py-2 text-sm transition-colors',
        collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

// ── AppSidebar ─────────────────────────────────────────────────────────────────
export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  // Cmd+B (Mac) / Ctrl+B (Win) toggles sidebar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200',
        sidebarCollapsed ? 'w-[52px]' : 'w-[220px]'
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-border py-3.5',
          sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-foreground">
              <MicIcon className="size-4 text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Voice Lab</span>
          </div>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {sidebarCollapsed
            ? <PanelLeftOpenIcon className="size-4" />
            : <PanelLeftCloseIcon className="size-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname.startsWith(item.href)}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          'flex shrink-0 items-center border-t border-border py-3',
          sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
        )}
      >
        {!sidebarCollapsed && (
          <span className="text-xs text-muted-foreground">Theme</span>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}
