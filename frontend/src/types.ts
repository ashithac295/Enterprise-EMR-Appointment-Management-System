/**
 * Enterprise EMR Appointment Management System
 * Shared Types & Interfaces
 */

export type UserRole = 'Super Admin' | 'Receptionist' | 'Doctor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  doctorInfo?: {
    specialty: string;
    department: string;
  };
  createdAt: string;
}

export interface Session {
  name: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

export interface BreakTiming {
  name: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

export interface DoctorSchedule {
  doctorId: string;
  doctorName: string;
  workingDays: number[]; // 0 for Sunday, 1 for Monday, etc.
  sessions: Session[];
  slotDuration: number; // in minutes
  breakTimings: BreakTiming[];
  updatedAt: string;
}

export type AppointmentStatus = 'Scheduled' | 'Arrived' | 'Completed' | 'Cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  patientType: 'Existing' | 'New';
  doctorId: string;
  doctorName: string;
  department: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  purpose: string;
  notes: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  bookedBy: {
    userId: string;
    name: string;
    role: UserRole;
  };
}

export interface Patient {
  id: string;
  publicId: string;
  name: string;
  mobile: string;
  email?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}
