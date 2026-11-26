import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 16) {
    throw new Error("JWT_SECRET doit contenir au moins 16 caractères");
}

export const config = {
    port: Number(process.env.PORT ?? 3000),
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "2h",
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};