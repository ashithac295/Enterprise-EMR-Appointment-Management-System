import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/authContext';
import Login from './components/Login';
import AppointmentScheduler from './components/AppointmentScheduler';
import AppointmentList from './components/AppointmentList';
import DoctorSchedules from './components/DoctorSchedules';
import AuditLogs from './components/AuditLogs';
import { 
  Activity, LogOut, User, Shield, Briefcase, Calendar, 
  Users, RefreshCw, Terminal, Bell, FileSpreadsheet, Menu, X
} from 'lucide-react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';

// Instantiate Query Client outside of the component to prevent recreation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes stale cache duration
    },
  },
});

// Helper component for role-based route guard
function RoleGuard({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <span className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></span>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Public/Login Route Wrapper
function LoginRoute() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <span className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></span>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Login />;
}

// Navigation sidebar items setup
const navItems = [
  { id: 'dashboard', label: 'Clinical Hub', icon: Activity, roles: ['Super Admin', 'Receptionist', 'Doctor'], path: '/dashboard' },
  { id: 'scheduler', label: 'Book Scheduler', icon: Calendar, roles: ['Super Admin', 'Receptionist'], path: '/scheduler' },
  { id: 'list', label: 'Appointments Registry', icon: FileSpreadsheet, roles: ['Super Admin', 'Receptionist', 'Doctor'], path: '/appointments' },
  { id: 'schedules', label: 'Practitioners & Shifts', icon: Users, roles: ['Super Admin'], path: '/schedules' },
  { id: 'logs', label: 'Security Audit', icon: Terminal, roles: ['Super Admin'], path: '/audit-logs' },
];

function AppShell() {
  const { user, logout } = useAuth();
  const [liveNotification, setLiveNotification] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const queryClientInstance = useQueryClient();
  const location = useLocation();

  // Initialize Socket.IO connection for real-time state synchronization
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL);  // Connects to host origin

    socket.on('connect', () => {
      console.log('Socket.IO connected for live updates.');
    });

    socket.on('appointment_updated', (data: { action: string; appointment: any }) => {
      console.log('Real-time appointment notification received:', data);
      
      // Leverage React Query client to automatically invalidate affected caches
      queryClientInstance.invalidateQueries({ queryKey: ['appointments'] });
      queryClientInstance.invalidateQueries({ queryKey: ['slots'] });
      queryClientInstance.invalidateQueries({ queryKey: ['audit-logs'] });
      
      // Trigger live banner toast
      let verb = 'modified';
      if (data.action === 'CREATED') verb = 'booked';
      if (data.action === 'CANCELLED') verb = 'cancelled';
      if (data.action === 'UPDATED') verb = 'updated';

      setLiveNotification(`Live Update: Appointment was successfully ${verb}!`);
      setTimeout(() => {
        setLiveNotification(null);
      }, 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClientInstance]);

  if (!user) return <Login />;

  const allowedNavs = navItems.filter(item => item.roles.includes(user.role));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300">
      {/* Brand logo & title */}
      <div className="p-4 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold font-display shrink-0">
          E
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-sm font-display block">Enterprise EMR</span>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Clinical Portal</span>
        </div>
      </div>

      {/* Main menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 px-2">Main Menu</div>
        {allowedNavs.map(nav => {
          const Icon = nav.icon;
          return (
            <NavLink
              key={nav.id}
              id={`nav_tab_${nav.id}`}
              to={nav.path}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) => 
                `w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{nav.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate leading-none">{user.name}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate flex items-center gap-1 mt-1 leading-none">
                {user.role === 'Super Admin' && <Shield className="h-2.5 w-2.5 text-rose-400" />}
                {user.role === 'Doctor' && <Briefcase className="h-2.5 w-2.5 text-violet-400" />}
                {user.role === 'Receptionist' && <User className="h-2.5 w-2.5 text-teal-400" />}
                {user.role}
              </p>
            </div>
          </div>
          
          <button
            id="header_logout_btn"
            onClick={logout}
            className="p-1.5 hover:bg-slate-800 hover:text-rose-400 rounded text-slate-400 transition-all shrink-0 cursor-pointer"
            title="Sign Out of Portal"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#F1F5F9] text-slate-900 font-sans overflow-hidden" id="app_shell">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-slate-800 bg-[#0F172A]" id="desktop_sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible only when mobileSidebarOpen is true) */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex" id="mobile_sidebar_overlay">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            
            {/* Sidebar container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="relative w-64 max-w-[80vw] h-full z-10 flex flex-col shadow-2xl"
            >
              {sidebarContent}
              {/* Close Button inside Drawer */}
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute top-4 right-[-44px] bg-slate-900 text-white p-2 rounded-r-md hover:text-rose-400 focus:outline-none animate-none"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" id="main_content_area">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-xs" id="header_navbar">
          <div className="flex items-center gap-3">
            {/* Hamburger menu for mobile */}
            <button
              id="mobile_menu_toggle"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-1.5 hover:bg-slate-100 rounded text-slate-600 focus:outline-none"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h1 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">
              {allowedNavs.find(n => n.path === location.pathname)?.label || 'EMR Hub'}
            </h1>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <div className="flex gap-2 text-[10px]">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-bold">Online</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold hidden sm:inline-block">v2.5.0-Router-Query</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Real-time Active
            </div>
          </div>
        </header>

        {/* Content body wrapper with nested router and transition animations */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4" id="main_content_body_scroller">
          
          {/* Live Updates Notification Toast */}
          <AnimatePresence>
            {liveNotification && (
              <div className="fixed bottom-6 right-6 z-50 max-w-sm" id="live_update_toast">
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 flex items-start gap-3"
                >
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 shrink-0">
                    <Bell className="h-4.5 w-4.5 animate-bounce" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-xs">Real-time update</p>
                    <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">{liveNotification}</p>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Status Bar / Footer */}
        <footer className="h-8 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0" id="app_footer">
          <div className="flex items-center gap-6 text-[9px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span>Database Connection Stable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <span>SSL Encrypted Session</span>
            </div>
          </div>
          <div className="text-[9px] text-slate-400 font-semibold">
            React Router & TanStack Query Enabled Enterprise Portal
          </div>
        </footer>
      </main>
    </div>
  );
}

// Sub-component for Dashboard screen
function Dashboard() {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <div className="space-y-4" id="clinical_hub_dashboard">
      {/* Visual Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4 shadow-xs">
          <div className="p-2 bg-blue-50 text-blue-600 rounded">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Dynamic Scheduler</span>
            <span className="block text-slate-700 text-xs mt-0.5 font-bold">Available for Booking</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4 shadow-xs">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Practitioners Onboard</span>
            <span className="block text-slate-700 text-xs mt-0.5 font-bold">Active Schedules Configured</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4 shadow-xs">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Security State</span>
            <span className="block text-slate-700 text-xs mt-0.5 font-bold">RBAC Token Authorization</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Screen Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar booking shortcut if role is receptionist or super admin */}
        {(user.role === 'Super Admin' || user.role === 'Receptionist') ? (
          <div className="lg:col-span-2">
            <AppointmentScheduler />
          </div>
        ) : (
          // Doctors see their consultations directly
          <div className="lg:col-span-3">
            <AppointmentList refreshTrigger={0} />
          </div>
        )}

        {/* Right side list shortcut if scheduler is on the left */}
        {(user.role === 'Super Admin' || user.role === 'Receptionist') && (
          <div className="lg:col-span-1 bg-white rounded-lg border border-slate-200 p-4 h-fit shadow-xs">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-blue-500" />
              Clinical Guidance Notes
            </h4>
            <div className="space-y-3 text-[11px] text-slate-500 leading-relaxed">
              <p className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <strong>Existing Patients:</strong> Simply lookup using their Patient ID, mobile number, or full name in the booking scheduler to prevent redundant records.
              </p>
              <p className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <strong>Real-Time Updates:</strong> This system uses Socket.IO. When other receptionists book, cancel, or modify appointments, your active list and slot grid refreshes immediately without any manual reload!
              </p>
              <p className="bg-slate-50 p-2.5 rounded border border-slate-100">
                <strong>Double Booking Check:</strong> Backed by atomicity, simultaneous booking attempts on the exact same slots trigger safe rollbacks preventing overlap.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main application setup with QueryClient and BrowserRouter
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Login Route Guard */}
            <Route path="/login" element={<LoginRoute />} />

            {/* Protected Routes Layout */}
            <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              {/* Default Redirect to Dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              {/* View Components mapping */}
              <Route path="dashboard" element={<Dashboard />} />
              
              <Route path="scheduler" element={
                <RoleGuard allowedRoles={['Super Admin', 'Receptionist']}>
                  <AppointmentScheduler />
                </RoleGuard>
              } />
              
              <Route path="appointments" element={<AppointmentList refreshTrigger={0} />} />
              
              <Route path="schedules" element={
                <RoleGuard allowedRoles={['Super Admin']}>
                  <DoctorSchedules />
                </RoleGuard>
              } />
              
              <Route path="audit-logs" element={
                <RoleGuard allowedRoles={['Super Admin']}>
                  <AuditLogs />
                </RoleGuard>
              } />
            </Route>

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
