import type { Request, Response } from "express";
import type { LoginUser } from "../../../application/use-cases/LoginUser.js";
import type { UserRole } from "../../../domain/interfaces/IUser.js";

export class AuthController {
  constructor(private readonly loginUserUseCase: LoginUser) {}

  private getLandingPathByRole(role: UserRole): string {
    if (role === "INVENTORY") return "/api/inventory";
    if (role === "FINANCE") return "/api/transactions?type=PAYMENT";

    // ADMIN y perfil comercial arrancan en Clientes.
    return "/api/clients";
  }

  async renderLogin(req: Request, res: Response) {
    res.render("auth/login", {
      sessionExpired: req.query.sessionExpired === "true",
    });
  }
  async logout(req: Request, res: Response) {
    res.clearCookie("token", { httpOnly: true, secure: false });
    if (req.headers["accept"]?.includes("text/html")) {
      return res.redirect("/");
    }
    return res.status(200).json({ message: "Sesión cerrada correctamente" });
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          error: true,
          message: "Debe ingresar un email y contraseña válidos",
        });
      }

      const response = await this.loginUserUseCase.execute(email, password);
      const landingPath = this.getLandingPathByRole(
        response.user.role as UserRole,
      );
      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        res.cookie("token", response.token, {
          httpOnly: true, // Protege contra robos de scripts (XSS)
          secure: false, // Ponelo en 'true' cuando uses HTTPS
          maxAge: 3600000, // 1 hora de sesión
        });
        return res.redirect(landingPath);
      }
      return res.status(200).json({ ...response, landingPath });
    } catch (error: any) {
      if (
        req.headers["content-type"]?.includes(
          "application/x-www-form-urlencoded",
        )
      ) {
        return res.status(401).render("auth/login", {
          sessionExpired: false,
          error: error.message,
        });
      }

      return res.status(401).json({
        error: true,
        message: error.message,
      });
    }
  }
}
