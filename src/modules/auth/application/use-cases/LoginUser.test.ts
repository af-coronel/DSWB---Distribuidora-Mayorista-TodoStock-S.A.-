import { describe, it, expect, vi, beforeEach } from "vitest";

const { bcryptCompareMock, jwtSignMock } = vi.hoisted(() => ({
  bcryptCompareMock: vi.fn(),
  jwtSignMock: vi.fn(),
}));

vi.mock("bcrypt", () => ({
  default: { compare: bcryptCompareMock },
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: jwtSignMock },
}));

import { LoginUser } from "./LoginUser.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";

interface UserFixture {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

const makeUser = (overrides?: Partial<UserFixture>): UserFixture => ({
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  passwordHash: "$2b$10$hashedpassword",
  role: "ADMIN",
  active: true,
  created_at: new Date("2025-01-01"),
  updated_at: new Date("2025-01-01"),
  ...overrides,
});

describe("LoginUser", () => {
  let userRepository: IUserRepository;
  let loginUser: LoginUser;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository = { findByEmail: vi.fn(), findById: vi.fn(), save: vi.fn() };
    loginUser = new LoginUser(userRepository);
    process.env.JWT_SECRET = "test-secret";
  });

  it("should login successfully with valid credentials", async () => {
    const user = makeUser();
    vi.mocked(userRepository.findByEmail!).mockResolvedValue(user as any);
    bcryptCompareMock.mockResolvedValue(true);
    jwtSignMock.mockReturnValue("jwt-token");

    const result = await loginUser.execute("test@example.com", "password123");

    expect(result).toEqual({
      user: { id: "user-1", username: "testuser", email: "test@example.com", role: "ADMIN" },
      token: "jwt-token",
    });
    expect(jwtSignMock).toHaveBeenCalledWith(
      { id: "user-1", role: "ADMIN" },
      "test-secret",
      { expiresIn: "1h" },
    );
  });

  it("should throw 'Credenciales inválidas' when user is not found", async () => {
    vi.mocked(userRepository.findByEmail!).mockResolvedValue(null);

    await expect(loginUser.execute("unknown@example.com", "password123")).rejects.toThrow(
      "Credenciales inválidas",
    );
  });

  it("should throw 'Credenciales inválidas' when password is wrong", async () => {
    vi.mocked(userRepository.findByEmail!).mockResolvedValue(makeUser() as any);
    bcryptCompareMock.mockResolvedValue(false);

    await expect(loginUser.execute("test@example.com", "wrongpassword")).rejects.toThrow(
      "Credenciales inválidas",
    );
  });

  it("should throw 'El usuario se encuentra desactivado' for inactive user", async () => {
    vi.mocked(userRepository.findByEmail!).mockResolvedValue(makeUser({ active: false }) as any);
    bcryptCompareMock.mockResolvedValue(true);

    await expect(loginUser.execute("test@example.com", "password123")).rejects.toThrow(
      "El usuario se encuentra desactivado",
    );
  });

  it("should throw error when JWT_SECRET env var is missing", async () => {
    delete process.env.JWT_SECRET;
    vi.mocked(userRepository.findByEmail!).mockResolvedValue(makeUser() as any);
    bcryptCompareMock.mockResolvedValue(true);

    await expect(loginUser.execute("test@example.com", "password123")).rejects.toThrow(
      "JWT_SECRET no configurado",
    );
  });
});
