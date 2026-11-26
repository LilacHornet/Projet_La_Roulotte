import multer from "multer";
import type { RequestHandler } from "express";
import { AppError } from "../../errors/app-error.js";

const MAX_SIZE = 2 * 1024 * 1024; // 2 Mo

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
}).single("image");

export const receiveImage: RequestHandler = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(413, "PAYLOAD_TOO_LARGE", "Image trop lourde (2 Mo maximum)"));
    }
    if (err) return next(new AppError(400, "VALIDATION_ERROR", "Formulaire invalide"));
    if (!req.file) return next(new AppError(400, "VALIDATION_ERROR", "Champ « image » manquant"));
    next();
  });
};

export function detectImageType(buf: Buffer): "png" | "jpg" | "webp" | null {
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && PNG.every((byte, i) => buf[i] === byte)) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}