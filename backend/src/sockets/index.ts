import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';

let io: Server | null = null;

/**
 * Engineering Challenge: Real-Time Appointment Updates.
 *
 * Approach: a single global Socket.IO server is attached to the same HTTP
 * server as Express. Any connected client (typically viewing the scheduler)
 * automatically receives 'appointment_updated' events whenever an
 * appointment is created, updated, or cancelled - no polling required.
 *
 * We keep this intentionally simple (broadcast to all connected clients)
 * because appointment views are shared across receptionists/admins/doctors
 * for the same clinic; for a multi-tenant deployment this would be upgraded
 * to Socket.IO "rooms" scoped per clinic/department (see
 * ENGINEERING_DECISIONS.md for the scaling discussion).
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[socket] client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function broadcastAppointmentUpdate(action: 'CREATED' | 'UPDATED' | 'CANCELLED', appointment: unknown): void {
  if (!io) return;
  io.emit('appointment_updated', { action, appointment });
}
