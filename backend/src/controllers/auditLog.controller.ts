import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { AuditLog } from '../models/AuditLog.model';

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find().sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments()
  ]);

  sendSuccess(res, 200, 'Audit logs retrieved successfully', logs, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1
  });
});
