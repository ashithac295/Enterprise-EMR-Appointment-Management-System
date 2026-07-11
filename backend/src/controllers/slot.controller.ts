import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as slotService from '../services/slot.service';

export const getSlots = asyncHandler(async (req: Request, res: Response) => {
  const { doctorId, date } = req.query;
  const slots = await slotService.generateSlots(String(doctorId), String(date));
  sendSuccess(res, 200, 'Slots generated successfully', slots);
});
