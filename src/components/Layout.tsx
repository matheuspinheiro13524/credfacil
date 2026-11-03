import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FilePlus2, Menu, X } from 'lucide-react';

export type Page = 'dashboard' | 'clientes' | 'novo-contrato';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'novo-contrato', label: 'Novo Contrato', icon: FilePlus2 },
  ];

  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 h-screen lg:h-auto z-40 w-64 bg-[#111113] border-r border-white/5 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-6 py-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00] flex items-center justify-center font-bold text-lg">
              C
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">CredFácil</span>
              <p className="text-[10px] text-white/40 uppercase tracking-widest -mt-0.5">
                Loan Manager
              </p>
            </div>
          </div>
          <button
            className="lg:hidden text-white/40 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-white/5">
          <p className="text-[11px] text-white/30">
CredFácil v1.0
            <br />
            Gestão de Empréstimos
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-[#111113] border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <button
            className="text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF6B00] flex items-center justify-center font-bold text-sm">
              C
            </div>
            <span className="font-bold">CredFácil</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
