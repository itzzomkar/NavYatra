import { JWTPayload } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      startTime?: number;
    }
  }
}

declare module 'socket.io' {
  interface Socket {
    userId?: string;
    permissions?: string[];
    analyticsConfig?: {
      metrics: string[];
      interval: number;
    };
  }
}
