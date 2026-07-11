import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { User, Session, BreakTiming } from '../types';
import { Shield, Plus, Clock, Save, UserCheck, CalendarDays, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function DoctorSchedules() {
  const [doctors, setDoctors] = useState<User[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Create Doctor Account States
  const [docEmail, setDocEmail] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docDepartment, setDocDepartment] = useState('Internal Medicine');

  const [creatingDoc, setCreatingDoc] = useState(false);
  const [createDocSuccess, setCreateDocSuccess] = useState<string | null>(null);
  const [createDocError, setCreateDocError] = useState<string | null>(null);

  // Configure Schedule States
  const [workingDays, setWorkingDays] = useState<number[]>([]);
  const [slotDuration, setSlotDuration] = useState(15);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [breaks, setBreaks] = useState<BreakTiming[]>([]);

  const [configuringSched, setConfiguringSched] = useState(false);
  const [schedSuccess, setSchedSuccess] = useState<string | null>(null);
  const [schedError, setSchedError] = useState<string | null>(null);

  const [recepName, setRecepName] = useState('');
  const [recepEmail, setRecepEmail] = useState('');
  const [recepPassword, setRecepPassword] = useState('');
  const [creatingRecep, setCreatingRecep] = useState(false);
  const [createRecepSuccess, setCreateRecepSuccess] = useState<string | null>(null);
  const [createRecepError, setCreateRecepError] = useState<string | null>(null);

  const loadDoctors = async () => {
    try {
      const res = await apiRequest<User[]>('/api/v1/doctors');
      if (res.success && res.data) {
        setDoctors(res.data);
        if (res.data.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(res.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  // Fetch Schedule for selected doctor
  useEffect(() => {
    if (!selectedDoctorId) return;

    async function loadDoctorSchedule() {
      setSchedError(null);
      setSchedSuccess(null);
      try {
        const res = await apiRequest(`/api/v1/admin/schedules/${selectedDoctorId}`);
        if (res.success && res.data) {
          const { workingDays: days, slotDuration: dur, sessions: sess, breakTimings: brk } = res.data;
          setWorkingDays(days || []);
          setSlotDuration(dur || 15);
          setSessions(sess || []);
          setBreaks(brk || []);
        }
      } catch (err: any) {
        // If not found, reset with default template
        setWorkingDays([1, 2, 3, 4, 5]);
        setSlotDuration(15);
        setSessions([
          { name: 'Morning Session', startTime: '09:00', endTime: '12:00' },
          { name: 'Evening Session', startTime: '13:00', endTime: '17:00' }
        ]);
        setBreaks([
          { name: 'Lunch Break', startTime: '12:00', endTime: '13:00' }
        ]);
      }
    }
    loadDoctorSchedule();
  }, [selectedDoctorId]);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docEmail || !docPassword || !docName || !docSpecialty || !docDepartment) {
      setCreateDocError('All fields are required.');
      return;
    }

    setCreatingDoc(true);
    setCreateDocError(null);
    setCreateDocSuccess(null);

    try {
      const res = await apiRequest('/api/v1/admin/doctors', {
        method: 'POST',
        body: JSON.stringify({
          email: docEmail,
          password: docPassword,
          name: docName,
          specialty: docSpecialty,
          department: docDepartment
        })
      });

      if (res.success) {
        setCreateDocSuccess('Doctor account created successfully!');
        // Reset inputs
        setDocEmail('');
        setDocPassword('');
        setDocName('');
        setDocSpecialty('');
        setDocDepartment('Internal Medicine');
        // Reload list
        loadDoctors();
      } else {
        setCreateDocError(res.message || 'Failed to create doctor account.');
      }
    } catch (err: any) {
      setCreateDocError(err.message || 'Failed to create doctor account.');
    } finally {
      setCreatingDoc(false);
    }
  };
  const handleCreateReceptionist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recepEmail || !recepPassword || !recepName) {
      setCreateRecepError('All fields are required.');
      return;
    }

    setCreatingRecep(true);
    setCreateRecepError(null);
    setCreateRecepSuccess(null);

    try {
      const res = await apiRequest('/api/v1/admin/receptionists', {
        method: 'POST',
        body: JSON.stringify({ email: recepEmail, password: recepPassword, name: recepName })
      });

      if (res.success) {
        setCreateRecepSuccess('Receptionist account created successfully!');
        setRecepEmail('');
        setRecepPassword('');
        setRecepName('');
      } else {
        setCreateRecepError(res.message || 'Failed to create receptionist account.');
      }
    } catch (err: any) {
      setCreateRecepError(err.message || 'Failed to create receptionist account.');
    } finally {
      setCreatingRecep(false);
    }
  };
  const handleToggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setSchedError('Please select a doctor to configure.');
      return;
    }
    if (workingDays.length === 0) {
      setSchedError('Please select at least one working day.');
      return;
    }
    if (sessions.length === 0) {
      setSchedError('Please configure at least one working session.');
      return;
    }

    setConfiguringSched(true);
    setSchedError(null);
    setSchedSuccess(null);

    const payload = {
      doctorId: selectedDoctorId,
      workingDays,
      sessions,
      slotDuration,
      breakTimings: breaks
    };

    try {
      const res = await apiRequest('/api/v1/admin/schedules', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setSchedSuccess('Doctor schedule updated successfully!');
      } else {
        setSchedError(res.message || 'Failed to update schedule.');
      }
    } catch (err: any) {
      setSchedError(err.message || 'Error configuring schedule.');
    } finally {
      setConfiguringSched(false);
    }
  };

  const handleAddSession = () => {
    setSessions([...sessions, { name: 'New Session', startTime: '13:00', endTime: '17:00' }]);
  };

  const handleRemoveSession = (index: number) => {
    setSessions(sessions.filter((_, i) => i !== index));
  };

  const handleUpdateSession = (index: number, field: keyof Session, val: string) => {
    const updated = [...sessions];
    updated[index] = { ...updated[index], [field]: val };
    setSessions(updated);
  };

  const handleAddBreak = () => {
    setBreaks([...breaks, { name: 'New Break', startTime: '12:00', endTime: '13:00' }]);
  };

  const handleRemoveBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const handleUpdateBreak = (index: number, field: keyof BreakTiming, val: string) => {
    const updated = [...breaks];
    updated[index] = { ...updated[index], [field]: val };
    setBreaks(updated);
  };

  const weekdays = [
    { label: 'S', value: 0 },
    { label: 'M', value: 1 },
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'T', value: 4 },
    { label: 'F', value: 5 },
    { label: 'S', value: 6 }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="doctor_schedule_management_view">
      {/* 1. Create Doctor Account */}
      <div className="bg-white rounded border border-slate-200 p-4 flex flex-col h-fit shadow-sm">
        <h3 className="text-xs font-bold font-display text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-wider">
          <Shield className="h-4 w-4 text-blue-600" />
          Onboard Medical Practitioner
        </h3>
        <p className="text-[10px] text-slate-400 mb-4">
          Provision credential logins and clinical portfolios for new Doctors.
        </p>

        {createDocSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] rounded font-semibold flex items-center gap-2" id="create_doc_success_banner">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p>{createDocSuccess}</p>
          </div>
        )}

        {createDocError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[10px] rounded font-semibold flex items-center gap-2" id="create_doc_error_banner">
            <Shield className="h-4 w-4 text-rose-500" />
            <p>{createDocError}</p>
          </div>
        )}

        <form onSubmit={handleCreateDoctor} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Doctor Full Name</label>
              <input
                id="onboard_name_input"
                type="text"
                required
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Dr. Gregory House"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none transition-all text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
              <input
                id="onboard_email_input"
                type="email"
                required
                value={docEmail}
                onChange={(e) => setDocEmail(e.target.value)}
                placeholder="doctor@emr.com"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none transition-all text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Practitioner Password</label>
              <input
                id="onboard_password_input"
                type="password"
                required
                value={docPassword}
                onChange={(e) => setDocPassword(e.target.value)}
                placeholder="Securepassword"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none transition-all text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Clinical Department</label>
              <select
                id="onboard_dept_select"
                value={docDepartment}
                onChange={(e) => setDocDepartment(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none transition-all text-slate-700"
              >
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Surgery">Surgery</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="General Medicine">General Medicine</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Medical Specialty</label>
            <input
              id="onboard_specialty_input"
              type="text"
              required
              value={docSpecialty}
              onChange={(e) => setDocSpecialty(e.target.value)}
              placeholder="Infectious Diseases / Neurosurgeon"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none transition-all text-slate-800"
            />
          </div>

          <button
            id="onboard_submit_btn"
            type="submit"
            disabled={creatingDoc}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {creatingDoc ? 'Onboarding...' : 'Onboard Doctor & Create Login'}
          </button>
        </form>
      </div>
      {/* 1b. Create Receptionist Account */}
      <div className="bg-white rounded border border-slate-200 p-4 flex flex-col h-fit shadow-sm">
        <h3 className="text-xs font-bold font-display text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-wider">
          <UserCheck className="h-4 w-4 text-teal-600" />
          Onboard Receptionist
        </h3>
        <p className="text-[10px] text-slate-400 mb-4">
          Provision front-desk login credentials for a new Receptionist.
        </p>

        {createRecepSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] rounded font-semibold flex items-center gap-2" id="create_recep_success_banner">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p>{createRecepSuccess}</p>
          </div>
        )}

        {createRecepError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[10px] rounded font-semibold flex items-center gap-2" id="create_recep_error_banner">
            <Shield className="h-4 w-4 text-rose-500" />
            <p>{createRecepError}</p>
          </div>
        )}

        <form onSubmit={handleCreateReceptionist} className="space-y-3">
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
            <input
              id="recep_onboard_name_input"
              type="text"
              required
              value={recepName}
              onChange={(e) => setRecepName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none transition-all text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
              <input
                id="recep_onboard_email_input"
                type="email"
                required
                value={recepEmail}
                onChange={(e) => setRecepEmail(e.target.value)}
                placeholder="receptionist@emr.com"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none transition-all text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password (min. 8 chars)</label>
              <input
                id="recep_onboard_password_input"
                type="password"
                required
                minLength={8}
                value={recepPassword}
                onChange={(e) => setRecepPassword(e.target.value)}
                placeholder="Securepassword"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none transition-all text-slate-800"
              />
            </div>
          </div>

          <button
            id="recep_onboard_submit_btn"
            type="submit"
            disabled={creatingRecep}
            className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold text-xs transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {creatingRecep ? 'Onboarding...' : 'Onboard Receptionist & Create Login'}
          </button>
        </form>
      </div>
      {/* 2. Configure Doctor Schedule */}
      <div className="bg-white rounded border border-slate-200 p-4 flex flex-col shadow-sm">
        <h3 className="text-xs font-bold font-display text-slate-800 flex items-center gap-2 mb-1 uppercase tracking-wider">
          <CalendarDays className="h-4 w-4 text-teal-600" />
          Doctor Shift & Schedule Config
        </h3>
        <p className="text-[10px] text-slate-400 mb-4">
          Set up working days, sessions, slot intervals, and break intervals.
        </p>

        {/* Doctor Select */}
        <div className="mb-4">
          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Doctor</label>
          <select
            id="schedule_config_doctor_select"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none transition-all"
          >
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.doctorInfo?.specialty || 'General'})</option>
            ))}
          </select>
        </div>

        {schedSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] rounded font-semibold flex items-center gap-2" id="sched_success_banner">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p>{schedSuccess}</p>
          </div>
        )}

        {schedError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[10px] rounded font-semibold flex items-center gap-2" id="sched_error_banner">
            <Shield className="h-4 w-4 text-rose-500" />
            <p>{schedError}</p>
          </div>
        )}

        <form onSubmit={handleSaveSchedule} className="space-y-4">
          {/* Working Days Checkbox Row */}
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shift Working Days</label>
            <div className="flex gap-1.5" id="weekday_bubble_selector">
              {weekdays.map(day => (
                <button
                  key={day.value}
                  id={`bubble_day_${day.value}`}
                  type="button"
                  onClick={() => handleToggleDay(day.value)}
                  className={`w-7 h-7 rounded font-bold text-[10px] border flex items-center justify-center transition-all cursor-pointer ${workingDays.includes(day.value)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slot Duration */}
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Slot Interval Duration (Minutes)</label>
            <select
              id="config_slot_duration_select"
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none transition-all text-slate-700"
            >
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={20}>20 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes</option>
            </select>
          </div>

          {/* Sessions List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Consultation Working Sessions</label>
              <button
                id="add_session_btn"
                type="button"
                onClick={handleAddSession}
                className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-2.5 w-2.5" /> Add Session
              </button>
            </div>

            {sessions.map((sess, idx) => (
              <div key={idx} className="grid grid-cols-10 gap-1.5 items-center" id={`session_row_${idx}`}>
                <input
                  type="text"
                  value={sess.name}
                  onChange={(e) => handleUpdateSession(idx, 'name', e.target.value)}
                  placeholder="Morning / Evening Session"
                  className="col-span-4 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                />
                <input
                  type="time"
                  value={sess.startTime}
                  onChange={(e) => handleUpdateSession(idx, 'startTime', e.target.value)}
                  className="col-span-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                />
                <span className="col-span-1 text-center text-slate-400 text-xs">to</span>
                <input
                  type="time"
                  value={sess.endTime}
                  onChange={(e) => handleUpdateSession(idx, 'endTime', e.target.value)}
                  className="col-span-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSession(idx)}
                  className="col-span-1 text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Breaks List */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Break Timing Intervals</label>
              <button
                id="add_break_btn"
                type="button"
                onClick={handleAddBreak}
                className="text-[9px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-2.5 w-2.5" /> Add Break Period
              </button>
            </div>

            {breaks.map((brk, idx) => (
              <div key={idx} className="grid grid-cols-10 gap-1.5 items-center" id={`break_row_${idx}`}>
                <input
                  type="text"
                  value={brk.name}
                  onChange={(e) => handleUpdateBreak(idx, 'name', e.target.value)}
                  placeholder="Lunch Break"
                  className="col-span-4 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                />
                <input
                  type="time"
                  value={brk.startTime}
                  onChange={(e) => handleUpdateBreak(idx, 'startTime', e.target.value)}
                  className="col-span-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                />
                <span className="col-span-1 text-center text-slate-400 text-xs">to</span>
                <input
                  type="time"
                  value={brk.endTime}
                  onChange={(e) => handleUpdateBreak(idx, 'endTime', e.target.value)}
                  className="col-span-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveBreak(idx)}
                  className="col-span-1 text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            id="schedule_save_submit_btn"
            type="submit"
            disabled={configuringSched}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-xs"
          >
            {configuringSched ? 'Saving Config...' : 'Apply & Save Schedule Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}
