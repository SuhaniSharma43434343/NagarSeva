import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Response, Request, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  let token = header.split(" ")[1];
  if (token) {
    token = token.replace(/^"|"$/g, "").trim();
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error("JWT_SECRET not configured"));
  }

  try {
    const payload = jwt.verify(
      token,
      secret,
    ) as JwtPayload & { userId: string; role: string };
    req.user = payload;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

export function requireRole(allowedRoles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  };
}

