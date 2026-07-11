import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User.model';
import { RefreshToken } from '../models/RefreshToken.model';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { createAuditLog } from './audit.service';

const SALT_ROUNDS = 10;

function msFromExpiry(expiresIn: string): number {
  // Supports simple "15m" / "7d" style strings used in .env
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 15 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[unit];
}

function buildTokenPayload(user: IUser) {
  return { _id:user._id.toString(), email: user.email, role: user.role, name: user.name };
}

function signAccessToken(user: IUser): string {
  return jwt.sign(buildTokenPayload(user), env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn
  } as SignOptions);
}

function signRefreshToken(user: IUser): string {
  return jwt.sign({ _id:user._id.toString() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn
  } as SignOptions);
}

export async function login(email: string, password: string) {
  // select('+passwordHash') needed since the schema excludes it by default
  const user = await User.findOne({ email: email.trim().toLowerCase(), isActive: true }).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Invalid credentials.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid credentials.');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt: new Date(Date.now() + msFromExpiry(env.jwt.refreshExpiresIn))
  });

  await createAuditLog(user._id, user.name, user.role, 'Login', `User: ${user._id}`);

  return {
    accessToken,
    refreshToken,
    user: {
      _id:user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      doctorInfo: user.doctorInfo || null
    }
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const stored = await RefreshToken.findOne({ token: refreshToken });
  if (!stored) {
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }

  let payload: { _id:string };
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as { _id:string };
  } catch {
    // Token is malformed/expired at the JWT level - clean up the stale DB record too
    await RefreshToken.deleteOne({ token: refreshToken });
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }

  const user = await User.findOne({ _id: payload._id, isActive: true });
  if (!user) {
    throw ApiError.unauthorized('User not found.');
  }

  return { accessToken: signAccessToken(user) };
}

export async function logout(refreshToken: string): Promise<void> {
  await RefreshToken.deleteOne({ token: refreshToken });
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}
