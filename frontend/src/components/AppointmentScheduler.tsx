import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { User, ApiResponse } from '../types';
import { Calendar as CalendarIcon, Clock, UserPlus, Search, CheckCircle, Info, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Slot {
  time: string;
  available: boolean;
  reason?: string;
}

interface Patient {
  id: string;
  publicId: string; 
  name: string;
  mobile: string;
  email?: string;
}

export default function AppointmentScheduler({ onBookingSuccess }: { onBookingSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Booking Modal States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  
  // Form fields
  const [patientType, setPatientType] = useState<'Existing' | 'New'>('Existing');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected existing patient or new patient form inputs
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Fetch Doctors with React Query
  const { data: doctors = [] } = useQuery<User[]>({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await apiRequest<User[]>('/api/v1/doctors');
      if (!res.success || !res.data) {
        throw new Error('Failed to load doctors.');
      }
      return res.data;
    }
  });

  // Set default selected doctor once doctors list loads
  useEffect(() => {
    if (doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
    }
  }, [doctors, selectedDoctorId]);

  // Fetch Slots with React Query
  const { data: slots = [], isLoading: loadingSlots, error: errorSlotsObj } = useQuery<Slot[]>({
    queryKey: ['slots', selectedDoctorId, selectedDate],
    queryFn: async () => {
      const res = await apiRequest<Slot[]>(
        `/api/v1/slots?doctorId=${selectedDoctorId}&date=${selectedDate}`
      );
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to fetch slots.');
      }
      return res.data;
    },
    enabled: !!selectedDoctorId && !!selectedDate
  });

  const errorSlots = errorSlotsObj ? (errorSlotsObj as Error).message : null;

  // Debounced searchQuery state for patients search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search existing patients with React Query
  const { data: searchResults = [], isFetching: searchingPatients } = useQuery<Patient[]>({
    queryKey: ['patients-search', debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery.trim()) return [];
      const res = await apiRequest<Patient[]>(`/api/v1/patients?search=${debouncedSearchQuery}`);
      if (!res.success || !res.data) return [];
      return res.data;
    },
    enabled: patientType === 'Existing' && !!debouncedSearchQuery.trim()
  });

  const handleOpenBooking = (slotTime: string) => {
    setSelectedSlotTime(slotTime);
    setIsBookingOpen(true);
    setBookingError(null);
    setBookingSuccessMsg(null);
    
    // Reset form fields
    setPatientType('Existing');
    setSearchQuery('');
    setSelectedPatient(null);
    setPatientName('');
    setPatientMobile('');
    setPatientEmail('');
    setPurpose('');
    setNotes('');
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientName(patient.name);
    setPatientMobile(patient.mobile);
    setPatientEmail(patient.email || '');
    setSearchQuery('');
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (patientType === 'Existing' && !selectedPatient) {
      setBookingError('Please select an existing patient first.');
      return;
    }
    if (patientType === 'New' && (!patientName || !patientMobile)) {
      setBookingError('Please fill in patient name and mobile number.');
      return;
    }
    if (!purpose) {
      setBookingError('Please state the purpose of the appointment.');
      return;
    }

    setSubmittingBooking(true);
    setBookingError(null);

    const payload = {
      patientType,
      patientId: patientType === 'Existing' ? selectedPatient?.id : undefined,
      patientName,
      patientMobile,
      patientEmail: patientEmail || undefined,
      doctorId: selectedDoctorId,
      date: selectedDate,
      time: selectedSlotTime,
      purpose,
      notes
    };

    try {
      const res = await apiRequest('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setBookingSuccessMsg('Appointment booked successfully!');
        // Refresh slots immediately in cache
        queryClient.invalidateQueries({ queryKey: ['slots', selectedDoctorId, selectedDate] });
        
        if (onBookingSuccess) {
          onBookingSuccess();
        }

        // Close after brief delay
        setTimeout(() => {
          setIsBookingOpen(false);
        }, 1500);
      } else {
        setBookingError(res.message || 'Booking failed.');
      }
    } catch (err: any) {
      setBookingError(err.message || 'Conflict prevented booking this slot.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Divide slots into Morning (before 12:00) and Afternoon/Evening (after 12:00)
  const morningSlots = slots.filter(s => parseInt(s.time.split(':')[0]) < 12);
  const afternoonSlots = slots.filter(s => parseInt(s.time.split(':')[0]) >= 12);

  const selectedDocDetails = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8" id="appointment_scheduler_section">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-sky-500" />
            Book & Schedule Appointments
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Dynamic EMR slot scheduling with instant double-booking prevention.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Doctor</span>
            <select
              id="scheduler_doctor_select"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            >
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.doctorInfo?.specialty || 'General'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</span>
            <input
              id="scheduler_date_picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid representation */}
      <div className="py-8">
        {loadingSlots ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3" id="slots_loading_indicator">
            <span className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-sky-500"></span>
            <span className="text-sm">Generating available appointment slots...</span>
          </div>
        ) : errorSlots ? (
          <div className="p-6 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-sm rounded-xl flex items-center gap-3" id="slots_error_alert">
            <Info className="h-5 w-5 text-rose-500 shrink-0" />
            <p className="font-medium">{errorSlots}</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200" id="slots_empty_state">
            <Clock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold">No Working Slots Available</p>
            <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
              This doctor is either not scheduled, has no working hours configured for this day of the week, or the date selected is in the past.
            </p>
          </div>
        ) : (
          <div className="space-y-8" id="slots_grid_container">
            {/* Morning Session */}
            {morningSlots.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Morning Session Slots
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {morningSlots.map(slot => (
                    <button
                      key={slot.time}
                      id={`slot_btn_${slot.time.replace(':', '_')}`}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => handleOpenBooking(slot.time)}
                      className={`py-3 px-2 rounded-xl text-center text-sm font-semibold border transition-all duration-150 ${
                        slot.available
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/15 cursor-pointer'
                          : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      }`}
                      title={slot.available ? 'Click to book' : slot.reason || 'Unavailable'}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Afternoon/Evening Session */}
            {afternoonSlots.length > 0 && (
              <div className="pt-4 border-t border-slate-50">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Afternoon & Evening Session Slots
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {afternoonSlots.map(slot => (
                    <button
                      key={slot.time}
                      id={`slot_btn_${slot.time.replace(':', '_')}`}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => handleOpenBooking(slot.time)}
                      className={`py-3 px-2 rounded-xl text-center text-sm font-semibold border transition-all duration-150 ${
                        slot.available
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/15 cursor-pointer'
                          : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      }`}
                      title={slot.available ? 'Click to book' : slot.reason || 'Unavailable'}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Key Legends */}
            <div className="flex items-center gap-5 text-xs text-slate-500 pt-4" id="slots_legend">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 bg-emerald-50 border border-emerald-100 rounded-md"></span>
                <span>Available Slots</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 bg-slate-50 border border-slate-100 rounded-md"></span>
                <span>Booked / Past / Unavailable</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Dialog Modal (AnimatePresence) */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="booking_modal_overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-slate-100 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              id="booking_modal_card"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold font-display">Confirm Appointment Booking</h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sky-400" />
                    {selectedDate} at {selectedSlotTime} with {selectedDocDetails?.name}
                  </p>
                </div>
                <button
                  id="close_booking_modal_btn"
                  onClick={() => setIsBookingOpen(false)}
                  className="text-slate-400 hover:text-white transition-all text-sm font-semibold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleBookAppointment} className="p-6 overflow-y-auto space-y-5 flex-1">
                {bookingSuccessMsg ? (
                  <div className="p-8 text-center space-y-3" id="booking_success_prompt">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-50 rounded-full text-emerald-500">
                      <CheckCircle className="h-10 w-10" />
                    </div>
                    <p className="text-emerald-800 font-bold text-lg">Booking Confirmed</p>
                    <p className="text-slate-500 text-sm">
                      The appointment has been successfully scheduled and added to the patient record.
                    </p>
                  </div>
                ) : (
                  <>
                    {bookingError && (
                      <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs rounded-lg font-semibold flex items-start gap-2.5" id="booking_form_error">
                        <Info className="h-5 w-5 text-rose-500 shrink-0" />
                        <p>{bookingError}</p>
                      </div>
                    )}

                    {/* Patient Type Select */}
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Patient Status
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          id="btn_existing_patient"
                          type="button"
                          onClick={() => {
                            setPatientType('Existing');
                            setSelectedPatient(null);
                            setPatientName('');
                            setPatientMobile('');
                            setPatientEmail('');
                          }}
                          className={`py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                            patientType === 'Existing'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <UserCheck className="h-4 w-4" />
                          Existing Patient
                        </button>
                        <button
                          id="btn_new_patient"
                          type="button"
                          onClick={() => {
                            setPatientType('New');
                            setSelectedPatient(null);
                            setPatientName('');
                            setPatientMobile('');
                            setPatientEmail('');
                          }}
                          className={`py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                            patientType === 'New'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <UserPlus className="h-4 w-4" />
                          New Patient
                        </button>
                      </div>
                    </div>

                    {/* Conditional inputs */}
                    {patientType === 'Existing' ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Search Existing Patient
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                              <Search className="h-4 w-4" />
                            </span>
                            <input
                              id="patient_search_input"
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search by ID, name, or mobile..."
                              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                            />
                          </div>
                        </div>

                        {searchingPatients && (
                          <p className="text-xs text-slate-400 animate-pulse">Searching patient records...</p>
                        )}

                        {searchResults.length > 0 && (
                          <div className="border border-slate-100 rounded-xl bg-slate-50 max-h-40 overflow-y-auto divide-y divide-slate-100" id="patient_search_results">
                            {searchResults.map(p => (
                              <button
                                key={p.id}
                                id={`select_patient_btn_${p.id}`}
                                type="button"
                                onClick={() => handleSelectPatient(p)}
                                className="w-full text-left px-4 py-2.5 hover:bg-white text-xs font-medium text-slate-700 flex justify-between items-center"
                              >
                                <div>
                                  <span className="font-bold text-slate-900 block">{p.name}</span>
                                  <span className="text-slate-400">ID: {p.publicId}</span>
                                </div>
                                <span className="text-slate-400">{p.mobile}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {selectedPatient && (
                          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex justify-between items-center" id="selected_patient_badge">
                            <div>
                              <p className="font-bold">Selected: {selectedPatient.name}</p>
                              <p>ID: {selectedPatient.publicId} • {selectedPatient.mobile}</p>
                            </div>
                            <button
                              id="clear_selected_patient_btn"
                              type="button"
                              onClick={() => setSelectedPatient(null)}
                              className="text-emerald-600 hover:text-emerald-800 font-bold"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                              Patient Full Name *
                            </label>
                            <input
                              id="new_patient_name_input"
                              type="text"
                              required
                              value={patientName}
                              onChange={(e) => setPatientName(e.target.value)}
                              placeholder="Arthur Dent"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                              Mobile Number *
                            </label>
                            <input
                              id="new_patient_mobile_input"
                              type="tel"
                              required
                              value={patientMobile}
                              onChange={(e) => setPatientMobile(e.target.value)}
                              placeholder="+1 234-5678"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            Email Address (Optional)
                          </label>
                          <input
                            id="new_patient_email_input"
                            type="email"
                            value={patientEmail}
                            onChange={(e) => setPatientEmail(e.target.value)}
                            placeholder="arthur@galaxy.com"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Purpose of Appointment */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Consultation Purpose *
                      </label>
                      <input
                        id="booking_purpose_input"
                        type="text"
                        required
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="Routine general health checkup"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Clinical/Special Notes
                      </label>
                      <textarea
                        id="booking_notes_input"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Patient requested wheelchair accessibility..."
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
                      />
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        id="cancel_booking_form_btn"
                        type="button"
                        onClick={() => setIsBookingOpen(false)}
                        className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        id="confirm_booking_form_btn"
                        type="submit"
                        disabled={submittingBooking}
                        className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-xl transition-all shadow-md flex items-center gap-2"
                      >
                        {submittingBooking ? (
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        ) : (
                          'Confirm Appointment'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
