import { Request } from "express";
export type Role = "user" | "admin" | "co_admin";
export interface AuthRequest extends Request { 
  user?: { id: string; role: Role; email?: string; name?: string; avatar?: string; isMainAdmin?: boolean; sessionId?: string } 
}
