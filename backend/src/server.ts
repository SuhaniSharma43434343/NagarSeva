import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import fs from "fs";
import piexif from "piexifjs";
import { prisma } from "./lib/prisma.js";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import axios from "axios";
import FormData from "form-data";
import { adminRouter } from "./routes/adminRoutes.js";
import { surveyorRouter } from "./routes/surveyorRoutes.js";
import { engineerRouter } from "./routes/engineerRoutes.js";
import { requireAuth, requireRole } from "./middlewares/authMiddleware.js";

dotenv.config();

// Ensure upload directories exist before Multer tries to write to them
["uploads/user-images", "uploads/model-images", "uploads/issues"].forEach(
  (dir) => fs.mkdirSync(dir, { recursive: true }),
);

cloudinary.config({
  cloud_name: process.env.cloudinary_cloud_name || "",
  api_key: process.env.cloudinary_api_key || "",
  api_secret: process.env.cloudinary_api_secret || "",
});

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({ message: "NagarSeva Backend API operational", status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/admin", adminRouter);
app.use("/api/surveyor", surveyorRouter);
app.use("/api/engineer", engineerRouter);

app.listen(3000, "0.0.0.0", () => {
  console.log("NagarSeva backend listening on http://0.0.0.0:3000");
});
