import React, { useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { Appointment, AppointmentStatus } from '../types';
import { 
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Edit2, CheckCircle2, XCircle, Info, CalendarClock, UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';

export default function AppointmentList({ refreshTrigger }: { refreshTrigger: number }) {
  const { user } = useAuth();
  
  // Search & Filters state
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const limit = 10;

  // Edit / Note Update States
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [editPurpose, setEditPurpose] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<AppointmentStatus>('Scheduled');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['appointments', { search, department, status, startDate, endDate, sortBy, sortOrder, page, refreshTrigger }],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        search,
        department,
        status,
        startDate,
        endDate,
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(limit)
      });
      const res = await apiRequest<Appointment[]>(`/api/v1/appointments?${queryParams.toString()}`);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to fetch appointments.');
      }
      return res;
    }
  });

  const appointments = data?.data || [];
  const totalPages = data?.meta?.totalPages || 1;
  const totalItems = data?.meta?.total || 0;
  const loading = isLoading || isFetching;
  const errorMsg = error ? (error as Error).message : null;

  const handleToggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleMarkArrived = async (id: string) => {
    try {
      const res = await apiRequest(`/api/v1/appointments/${id}/arrive`, {
        method: 'POST'
      });
      if (res.success) {
        refetch();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to mark patient as arrived.');
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment booking?')) return;
    try {
      const res = await apiRequest(`/api/v1/appointments/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        refetch();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment.');
    }
  };

  const handleOpenEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    setEditPurpose(appt.purpose);
    setEditNotes(appt.notes);
    setEditStatus(appt.status);
    setUpdateError(null);
  };

  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppt) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const res = await apiRequest(`/api/v1/appointments/${editingAppt.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          purpose: editPurpose,
          notes: editNotes,
          status: editStatus
        })
      });

      if (res.success) {
        setEditingAppt(null);
        refetch();
      } else {
        setUpdateError(res.message || 'Update failed.');
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to apply updates due to system check.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (s: AppointmentStatus) => {
    const badges = {
      'Scheduled': 'bg-blue-50 text-blue-700 border-blue-100',
      'Arrived': 'bg-amber-50 text-amber-700 border-amber-100',
      'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'Cancelled': 'bg-rose-50 text-rose-700 border-rose-100'
    };
    return `px-2.5 py-1 rounded-full text-xs font-semibold border ${badges[s] || ''}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" id="appointment_list_section">
      {/* Filters and Header Header */}
      <div className="p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-sky-500" />
              Manage Appointments
            </h2>
            <p className="text-sm text-slate-400">
              {totalItems} appointment record{totalItems === 1 ? '' : 's'} registered in the system.
            </p>
          </div>

          {/* Quick Clear */}
          {(search || department || status || startDate || endDate) && (
            <button
              id="clear_filters_btn"
              onClick={() => {
                setSearch('');
                setDepartment('');
                setStatus('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="text-xs text-sky-600 hover:text-sky-800 font-bold self-start md:self-auto"
            >
              Clear Filter Presets
            </button>
          )}
        </div>

        {/* Filter Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
          {/* Combined Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              id="appt_search_input"
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search patient, doctor, mobile..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>

          {/* Department Select */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Filter className="h-4 w-4" />
            </span>
            <select
              id="dept_filter_select"
              value={department}
              onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-600"
            >
              <option value="">All Departments</option>
              <option value="Internal Medicine">Internal Medicine</option>
              <option value="Surgery">Surgery</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="General Medicine">General Medicine</option>
            </select>
          </div>

          {/* Status Select */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Filter className="h-4 w-4" />
            </span>
            <select
              id="status_filter_select"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-600"
            >
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Arrived">Arrived</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Picker Range Start */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">From</span>
            <input
              id="start_date_picker"
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>

          {/* Date Picker Range End */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">To</span>
            <input
              id="end_date_picker"
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Table/Grid */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3" id="appts_loading_indicator">
            <span className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-sky-500"></span>
            <span className="text-sm">Retrieving real-time schedule registers...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-6 text-center text-rose-500 font-semibold" id="appts_error_indicator">
            {errorMsg}
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 text-slate-400" id="appts_empty_state">
            <p className="font-semibold text-lg">No Appointments Found</p>
            <p className="text-sm mt-1">Try modifying your search or filter options.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" id="appointments_table">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleToggleSort('date')}>
                  <div className="flex items-center gap-1.5">
                    Schedule Details
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4">Doctor & Specialty</th>
                <th className="px-6 py-4">Purpose</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/50 transition-all duration-100" id={`appt_row_${appt.id}`}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-slate-900">{appt.patientName}</p>
                      <p className="text-xs text-slate-400">ID: {appt.patientId} • {appt.patientMobile}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-700">{appt.date}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="font-semibold text-slate-500">{appt.time}</span>
                        <span>({appt.duration} mins)</span>
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-700">{appt.doctorName}</p>
                      <p className="text-xs text-slate-400">{appt.department}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="text-slate-800 line-clamp-1">{appt.purpose}</p>
                      {appt.notes && <p className="text-xs text-slate-400 line-clamp-1 italic">Note: {appt.notes}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={getStatusBadge(appt.status)}>{appt.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" id={`appt_actions_${appt.id}`}>
                      {/* Workflow check actions */}
                      
                      {/* Mark Arrived: Available for Super Admin & Receptionist only, and only if Scheduled */}
                      {user && (user.role === 'Super Admin' || user.role === 'Receptionist') && appt.status === 'Scheduled' && (
                        <button
                          id={`arrive_btn_${appt.id}`}
                          title="Mark Arrived"
                          onClick={() => handleMarkArrived(appt.id)}
                          className="p-1.5 hover:bg-amber-100 text-amber-700 rounded-lg transition-all"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                      )}

                      {/* Edit (Update notes, purpose, status): All roles but doctors restricted to their own */}
                      <button
                        id={`edit_btn_${appt.id}`}
                        title="Update details"
                        onClick={() => handleOpenEdit(appt)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-all"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {/* Cancel: Super Admin & Receptionists only, if not terminal */}
                      {user && (user.role === 'Super Admin' || user.role === 'Receptionist') && appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                        <button
                          id={`cancel_btn_${appt.id}`}
                          title="Cancel appointment"
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between" id="appts_pagination_controls">
          <span className="text-xs text-slate-400 font-semibold">
            Showing Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              id="prev_page_btn"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 enabled:hover:bg-white text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              id="next_page_btn"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 enabled:hover:bg-white text-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editing Dialog Modal (Workflow transitions supported) */}
      <AnimatePresence>
        {editingAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="edit_modal_overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-100 w-full max-w-md shadow-2xl overflow-hidden"
              id="edit_modal_card"
            >
              <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display">Update Appointment Case</h3>
                  <p className="text-xs text-slate-400 mt-1">Patient: {editingAppt.patientName}</p>
                </div>
                <button
                  id="close_edit_modal_btn"
                  onClick={() => setEditingAppt(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateAppointment} className="p-6 space-y-4">
                {updateError && (
                  <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg font-semibold border-l-4 border-rose-500 flex items-start gap-2">
                    <Info className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <p>{updateError}</p>
                  </div>
                )}

                {/* Purpose (Super Admin / Receptionist can edit always) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Consultation Purpose
                  </label>
                  <input
                    id="edit_purpose_input"
                    type="text"
                    required
                    value={editPurpose}
                    onChange={(e) => setEditPurpose(e.target.value)}
                    disabled={user?.role === 'Doctor'} // Doctors should focus notes and consultation
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none disabled:bg-slate-100"
                  />
                </div>

                {/* Notes (All roles can edit) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Clinical Consultation Notes
                  </label>
                  <textarea
                    id="edit_notes_input"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none resize-none"
                    placeholder="Enter patient notes or symptoms..."
                  />
                </div>

                {/* Status Workflow select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Workflow Status
                  </label>
                  <select
                    id="edit_status_select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AppointmentStatus)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  >
                    {/* Workflow status options shown based on transition rules */}
                    <option value="Scheduled">Scheduled</option>
                    <option value="Arrived">Arrived</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Workflow states are: Scheduled → Arrived → Completed or Cancelled.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    id="cancel_edit_form_btn"
                    type="button"
                    onClick={() => setEditingAppt(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    id="save_edit_form_btn"
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 rounded-xl transition-all"
                  >
                    {isUpdating ? 'Applying...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
