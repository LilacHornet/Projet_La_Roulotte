import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { detectImageType, receiveImage } from "../../../src/modules/menu/image-upload.js";
import { errorHandler } from "../../../src/errors/error.middleware.js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

describe("detectImageType (signature binaire)", () => {
  it("reconnaît un PNG", () => {
    expect(detectImageType(PNG)).toBe("png");
  });

  it("reconnaît un JPEG", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
  });

  it("reconnaît un WebP", () => {
    expect(detectImageType(Buffer.from("RIFF0000WEBPVP8 ", "ascii"))).toBe("webp");
  });

  it("refuse un faux PNG (du texte renommé)", () => {
    expect(detectImageType(Buffer.from("je ne suis pas une image"))).toBeNull();
  });
});

function uploadApp() {
  const app = express();
  app.put("/upload", receiveImage, (req, res) => {
    res.json({ size: req.file!.size });
  });
  app.use(errorHandler);
  return app;
}

describe("receiveImage (multer)", () => {
  it("accepte une image envoyée dans le champ « image »", async () => {
    const res = await request(uploadApp()).put("/upload").attach("image", PNG, "burger.png");
    expect(res.status).toBe(200);
    expect(res.body.size).toBe(PNG.length);
  });

  it("sans fichier → 400 VALIDATION_ERROR", async () => {
    const res = await request(uploadApp()).put("/upload").field("autre", "x");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("plus de 2 Mo → 413 PAYLOAD_TOO_LARGE", async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2.5 * 1024 * 1024)]);
    const res = await request(uploadApp()).put("/upload").attach("image", big, "gros.png");
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});