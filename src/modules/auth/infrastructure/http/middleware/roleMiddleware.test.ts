import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorizeRoles } from "./roleMiddleware.js";
import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "../../../domain/interfaces/IUser.js";

const mockJson = vi.fn();
const mockStatus = vi.fn().mockReturnThis();
const mockRes = { status: mockStatus, json: mockJson } as unknown as Response;
const mockNext: NextFunction = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockStatus.mockReturnValue(mockRes);
});

describe("authorizeRoles", () => {
  it("should call next() when user role is in allowedRoles", () => {
    const middleware = authorizeRoles(["ADMIN", "FINANCE"] as UserRole[]);
    const mockReq = { user: { role: "ADMIN" } } as unknown as Request;

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockStatus).not.toHaveBeenCalled();
    expect(mockJson).not.toHaveBeenCalled();
  });

  it("should return 401 when there is no user on request", () => {
    const middleware = authorizeRoles(["ADMIN"] as UserRole[]);
    const mockReq = {} as Request;

    middleware(mockReq, mockRes, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      error: true,
      message: "Usuario no autenticado.",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 403 when user role is not in allowedRoles", () => {
    const middleware = authorizeRoles(["ADMIN"] as UserRole[]);
    const mockReq = { user: { role: "VENDOR" } } as unknown as Request;

    middleware(mockReq, mockRes, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({
      error: true,
      message: "Acceso denegado. Se requiere ser: ADMIN",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
