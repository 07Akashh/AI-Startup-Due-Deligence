declare namespace Express {
  export interface Request {
    requestId?: string;
    userId?: string;
    user?: {
      id: string;
      role: string;
    };
  }
}
