import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as appointmentService from '../services/appointment.service';
import { createAuditLog } from '../services/audit.service';
import { broadcastAppointmentUpdate } from '../sockets';

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await appointmentService.bookAppointment({
    ...req.body,
    bookedBy: { userId: req.user!._id, name: req.user!.name, role: req.user!.role }
  });

  await createAuditLog(req.user!._id, req.user!.name, req.user!.role, 'Appointment Created', `Appointment: ${appointment._id}`);
  broadcastAppointmentUpdate('CREATED', appointment);

  sendSuccess(res, 201, 'Appointment booked successfully', appointment);
});

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const { search, department, status, startDate, endDate, sortBy, sortOrder } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const { results, meta } = await appointmentService.listAppointments({
    requesterRole: req.user!.role,
    requesterId: req.user!._id,
    search: search ? String(search) : undefined,
    department: department ? String(department) : undefined,
    status: status ? String(status) : undefined,
    startDate: startDate ? String(startDate) : undefined,
    endDate: endDate ? String(endDate) : undefined,
    sortBy: sortBy ? String(sortBy) : undefined,
    sortOrder: (sortOrder as 'asc' | 'desc') || 'asc',
    page,
    limit
  });

  sendSuccess(res, 200, 'Appointments retrieved successfully', results, meta);
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const { purpose, notes, status } = req.body;
  const updated = await appointmentService.updateAppointment(
    req.params.id,
    { _id: req.user!._id, role: req.user!.role },
    { purpose, notes, status }
  );

  await createAuditLog(
    req.user!._id,
    req.user!.name,
    req.user!.role,
    'Appointment Updated',
    `Appointment: ${updated._id} (Status: ${updated.status})`
  );
  broadcastAppointmentUpdate('UPDATED', updated);

  sendSuccess(res, 200, 'Appointment updated successfully', updated);
});

export const cancelAppointment = asyncHandler(async (req: Request, res: Response) => {
  const cancelled = await appointmentService.cancelAppointment(req.params.id);

  await createAuditLog(req.user!._id, req.user!.name, req.user!.role, 'Appointment Cancelled', `Appointment: ${cancelled._id}`);
  broadcastAppointmentUpdate('CANCELLED', cancelled);

  sendSuccess(res, 200, 'Appointment cancelled successfully', cancelled);
});

export const arriveAppointment = asyncHandler(async (req: Request, res: Response) => {
  const updated = await appointmentService.markArrived(req.params.id);

  await createAuditLog(req.user!._id, req.user!.name, req.user!.role, 'Patient Arrived', `Appointment: ${updated._id}`);
  broadcastAppointmentUpdate('UPDATED', updated);

  sendSuccess(res, 200, 'Patient marked as arrived successfully', updated);
});
