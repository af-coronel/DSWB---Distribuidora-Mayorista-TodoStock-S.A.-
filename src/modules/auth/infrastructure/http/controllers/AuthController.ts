import type { Request, Response } from "express";
import type { LoginUser } from "../../../application/use-cases/LoginUser.js";
import { UserModel } from "../../persistence/UserModel.js";

export class AuthController {
  constructor(private readonly loginUserUseCase: LoginUser) {}

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
      const { email, passwordHash } = req.body ?? {};
      const bypassLogin = true;

      // Bypass temporal: permite entrar con "Ingresar" sin validar credenciales.
      if (bypassLogin) {
        const user =
          (typeof email === "string" && email.trim().length > 0
            ? await UserModel.findOne({ email: email.trim(), active: true })
            : null) ?? (await UserModel.findOne({ active: true }));

        if (!user) {
          return res.status(503).json({
            error: true,
            message: "No hay usuarios activos para el bypass temporal",
          });
        }

        const token = `todostock-fake-jwt-token-for-${user.id}`;

        if (
          req.headers["content-type"]?.includes(
            "application/x-www-form-urlencoded",
          )
        ) {
          res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            maxAge: 3600000,
          });
          return res.redirect("/api/clients");
        }

        return res.status(200).json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          token,
        });
      }

      // Pequeña validación de entrada
      if (!email || !passwordHash) {
        return res.status(400).json({
          error: true,
          message: "Debe ingresar un email y contraseña válidos",
        });
      }

      // Llamamos a nuestra lógica de negocio (Caso de Uso)
      const response = await this.loginUserUseCase.execute(email, passwordHash);
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
        return res.redirect("/api/clients"); // ¡Adentro!
      }
      return res.status(200).json(response);
    } catch (error: any) {
      // Si el caso de uso lanza un error (por ejemplo: "Credenciales inválidas"), devolvemos un 401 (Unauthorized)
      return res.status(401).json({
        error: true,
        message: error.message,
      });
    }
  }
}
