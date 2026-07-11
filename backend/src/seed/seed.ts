/**
 * One-time (idempotent) seed script for default accounts, run via `npm run seed`.
 * Not run automatically on server boot - keeping seeding as an explicit,
 * separate step avoids accidentally reseeding/mutating data in production.
 */
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { DoctorSchedule } from '../models/DoctorSchedule.model';
import { hashPassword } from '../services/auth.service';
import { env } from '../config/env';

async function seed() {
  await connectDB();

  const existingAdmin = await User.findOne({ role: 'Super Admin' });
  if (existingAdmin) {
    console.log('[seed] A Super Admin already exists - skipping seed.');
    await disconnectDB();
    return;
  }

  console.log('[seed] Seeding default accounts...');

  const adminHash = await hashPassword(env.seed.adminPassword);
  await User.create({
    email: env.seed.adminEmail,
    name: 'System Administrator',
    passwordHash: adminHash,
    role: 'Super Admin'
  });
  console.log(`[seed] Created Super Admin: ${env.seed.adminEmail} / ${env.seed.adminPassword}`);

  const receptionistHash = await hashPassword('Receptionist@12345');
  await User.create({
    email: 'receptionist@emr.com',
    name: 'Jane Doe',
    passwordHash: receptionistHash,
    role: 'Receptionist'
  });
  console.log('[seed] Created Receptionist: receptionist@emr.com / Receptionist@12345');

  const doctorHash = await hashPassword('Doctor@12345');
  const doctor = await User.create({
    email: 'doctor@emr.com',
    name: 'Dr. Gregory House',
    passwordHash: doctorHash,
    role: 'Doctor',
    doctorInfo: { specialty: 'Infectious Diseases', department: 'Internal Medicine' }
  });

  await DoctorSchedule.create({
    doctorId: doctor._id,
    workingDays: [1, 2, 3, 4, 5],
    sessions: [
      { name: 'Morning Session', startTime: '09:00', endTime: '12:00' },
      { name: 'Evening Session', startTime: '13:00', endTime: '17:00' }
    ],
    slotDuration: 15,
    breakTimings: [{ name: 'Lunch Break', startTime: '12:00', endTime: '13:00' }]
  });
  console.log('[seed] Created Doctor: doctor@emr.com / Doctor@12345');

  console.log('[seed] Seeding completed successfully.');
  await disconnectDB();
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
