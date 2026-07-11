import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as doctorService from '../services/doctor.service';
import { createAuditLog } from '../services/audit.service';

export const getDoctors = asyncHandler(async (_req: Request, res: Response) => {
  const doctors = await doctorService.listDoctors();
  sendSuccess(res, 200, 'Doctors retrieved successfully', doctors);
});

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, specialty, department } = req.body;
  const doctor = await doctorService.createDoctor({ email, password, name, specialty, department });
  await createAuditLog(req.user!._id, req.user!.name, req.user!.role, 'Create Doctor', `Doctor: ${doctor._id}`);
  sendSuccess(res, 201, 'Doctor account created successfully', doctor);
});

export const createReceptionist = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const receptionist = await doctorService.createReceptionist({ email, password, name });
  await createAuditLog(
    req.user!._id,
    req.user!.name,
    req.user!.role,
    'Create Receptionist',
    `Receptionist: ${receptionist._id}`
  );
  sendSuccess(res, 201, 'Receptionist account created successfully', receptionist);
});
