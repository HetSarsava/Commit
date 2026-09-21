import { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
