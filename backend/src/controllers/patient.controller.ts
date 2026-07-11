import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as patientService from '../services/patient.service';

export const searchPatients = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;
  const user = (req as any).user; 
  const doctorId = user?.role === 'Doctor' ? String(user._id) : undefined;

  const patients = await patientService.searchPatients(
    search ? String(search) : undefined,
    doctorId
  );
  sendSuccess(res, 200, 'Patients retrieved successfully', patients);
});