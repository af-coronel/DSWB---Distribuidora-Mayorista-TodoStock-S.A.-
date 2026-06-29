import { describe, it, expect, vi } from "vitest";
import { errorHandler } from "./errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const mockReq = (accept: string): Request =>
  ({
    headers: { accept },
    method: "GET",
    path: "/test",
  }) as unknown as Request;

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn();
  res.render = vi.fn();
  return res as unknown as Response;
};

const mockNext: NextFunction = vi.fn() as unknown as NextFunction;

describe("errorHandler", () => {
  describe("JSON requests", () => {
    it("returns 400 for a CastError (Mongoose)", () => {
      const err = { name: "CastError", statusCode: 500 };
      const req = mockReq("application/json");
      const res = mockRes();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: "El ID proporcionado no es válido.",
      });
    });

    it("returns 400 for a ValidationError with joined messages", () => {
      const err = {
        name: "ValidationError",
        errors: {
          field1: { message: "Field1 is required" },
          field2: { message: "Field2 must be a number" },
        },
      };
      const req = mockReq("application/json");
      const res = mockRes();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: "Field1 is required, Field2 must be a number",
      });
    });

    it("returns 409 for duplicate key error (code 11000)", () => {
      const err = { name: "MongoServerError", code: 11000 };
      const req = mockReq("application/json");
      const res = mockRes();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: "Ya existe un registro con esos datos.",
      });
    });

    it("returns 500 with the error message for a generic error", () => {
      const err = new Error("Something went wrong");
      const req = mockReq("application/json");
      const res = mockRes();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: "Something went wrong",
      });
    });

    it("uses default message when error has no message", () => {
      const err = { name: "Error" };
      const req = mockReq("application/json");
      const res = mockRes();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: "Error interno del servidor",
      });
    });

    it("preserves err.statusCode for non-mapped errors", () => {
      const err = { name: "SomeError", message: "Not found", statusCode: 404 };
      const req = mockReq("application/json");
      const res = mockRes();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: "Not found",
      });
    });
  });

  describe("HTML requests", () => {
    it("renders errors/404 when statusCode is 404", () => {
      const err = { name: "SomeError", message: "Not found", statusCode: 404 };
      const req = mockReq("text/html");
      const res = mockRes();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith("errors/404");
      expect(res.json).not.toHaveBeenCalled();
    });

    it("renders errors/500 with errorMessage for generic errors", () => {
      const err = new Error("Server error");
      const req = mockReq("text/html");
      const res = mockRes();

      errorHandler(err, req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith("errors/500", {
        errorMessage: "Server error",
      });
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
