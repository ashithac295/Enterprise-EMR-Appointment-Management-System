import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as scheduleService from '../services/schedule.service';
import { createAuditLog } from '../services/audit.service';

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await scheduleService.getSchedule(req.params.doctorId);
  sendSuccess(res, 200, 'Schedule retrieved successfully', schedule);
});

export const upsertSchedule = asyncHandler(async (req: Request, res: Response) => {
  const { doctorId, workingDays, sessions, slotDuration, breakTimings } = req.body;
  const schedule = await scheduleService.upsertSchedule({
    doctorId,
    workingDays,
    sessions,
    slotDuration,
    breakTimings
  });
  await createAuditLog(req.user!._id, req.user!.name, req.user!.role, 'Configure Schedule', `Doctor: ${doctorId}`);
  sendSuccess(res, 200, 'Doctor schedule configured successfully', schedule);
});
