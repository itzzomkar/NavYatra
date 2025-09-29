import { Request, Response, NextFunction } from 'express';

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void | Response>;

export interface UserPermission {
  permission: {
    name: string;
    description?: string;
    module?: string;
  };
}

export interface PrismaUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  permissions: UserPermission[];
}
