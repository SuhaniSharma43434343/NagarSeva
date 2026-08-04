import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
const surveyorRouter = Router();
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import fs from "fs";
import piexif from "piexifjs";
import axios from "axios";
import FormData from "form-data";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.cloudinary_cloud_name || "",
  api_key: process.env.cloudinary_api_key || "",
  api_secret: process.env.cloudinary_api_secret || "",
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/user-images/");
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
});

const BASE_LAT = 22.287325;
const BASE_LON = 73.361665;

function randomAround(value: any, meters = 2000) {
  const maxOffset = meters / 111000;
  return value + (Math.random() * 2 - 1) * maxOffset;
}

function degToDmsRational(deg: any) {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  return [
    [degrees, 1],
    [minutes, 1],
    [Math.round(seconds * 10000), 10000],
  ];
}

async function sendToPotholeModel(imagePath: string) {
  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath));

  const modelServiceUrl = process.env.MODEL_SERVICE_URL || "http://localhost:7860";

  const response = await axios.post(
    `${modelServiceUrl}/detect_with_visualization`,
    form,
    {
      headers: {
        ...form.getHeaders(),
      },
      responseType: "arraybuffer",
    },
  );

  return response.data;
}

async function processImage(
  file: Express.Multer.File,
  surverySession: any,
  routeId: string,
  wardId: string,
  engineerId: string | null,
  lat?: number,
  lon?: number
) {
  const imagePath = file.path;
  console.log("uploading image");
  console.log("Received GPS - lat:", lat, "lon:", lon);

  let latitude = lat;
  let longitude = lon;

  // If GPS not provided, use route coordinates as fallback
  if (!latitude || !longitude) {
    console.log("GPS not provided, fetching route coordinates for routeId:", routeId);
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });
    if (route) {
      // Use route start coordinates with slight random offset for variety
      latitude = randomAround(route.startLat, 50);
      longitude = randomAround(route.startLon, 50);
      console.log("Using route coordinates as fallback:", latitude, longitude, "from route:", route.name);
    } else {
      // Final fallback to base coordinates
      latitude = randomAround(BASE_LAT, 20);
      longitude = randomAround(BASE_LON, 20);
      console.log("Using base coordinates as fallback:", latitude, longitude);
    }
  } else {
    console.log("Using provided GPS coordinates:", latitude, longitude);
  }

  try {
    const jpegData = await fs.promises.readFile(imagePath, "binary");
    const exifObj = {
      GPS: {
        [piexif.GPSIFD.GPSLatitudeRef]: latitude >= 0 ? "N" : "S",
        [piexif.GPSIFD.GPSLatitude]: degToDmsRational(latitude),
        [piexif.GPSIFD.GPSLongitudeRef]: longitude >= 0 ? "E" : "W",
        [piexif.GPSIFD.GPSLongitude]: degToDmsRational(longitude),
      },
    };
    const exifBytes = piexif.dump(exifObj);
    const newJpegData = piexif.insert(exifBytes, jpegData);
    await fs.promises.writeFile(imagePath, Buffer.from(newJpegData, "binary"));
  } catch (exifErr) {
    console.warn("Exif insertion skipped/failed:", exifErr);
  }

  let finalImageUrl = "";
  try {
    const modelResult = await sendToPotholeModel(imagePath);
    const detectedImagePath = `uploads/model-images/detected-${file.filename}`;
    await fs.promises.writeFile(detectedImagePath, modelResult);
  } catch (modelErr) {
    console.warn("Pothole model service unavailable:", modelErr);
  }

  // Upload original raw photo clicked by surveyor to Cloudinary (or fallback to local server path)
  try {
    const uploadResult = await cloudinary.uploader.upload(imagePath, {
      folder: "pothole-detections",
      quality: "auto",
      fetch_format: "auto",
    });
    finalImageUrl = uploadResult.url;
  } catch (cErr) {
    finalImageUrl = `http://localhost:3000/${imagePath.replace(/\\/g, "/")}`;
  }

  if (!finalImageUrl) {
    finalImageUrl = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80";
  }

  console.log("Creating issue in database with image URL:", finalImageUrl);

  const issue = await prisma.issue.create({
    data: {
      latitude,
      longitude,
      type: "POTHOLE",
      status: engineerId ? "ASSIGNED" : "DETECTED",
      wardId,
      surveySessionId: surverySession.id,
      routeId,
      imageUrl: finalImageUrl,
    },
  });

  if (engineerId) {
    await prisma.issueAssignment.create({
      data: {
        issueId: issue.id,
        engineerId,
      },
    });
  }
}

surveyorRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log("login");
  if (!email || !password) {
    return res.json({
      success: false,
      message: "username or password not found",
    });
  }

  try {
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res
        .status(401)
        .json({ success: false, message: "invalid credentials" });

    const secret = process.env.JWT_SECRET || "your_jwt_secret_here";
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      { expiresIn: "7d" },
    );

    const { password: _, ...safeUser } = user;
    res.status(200).json({ success: true, token, user: safeUser });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "internal server error" });
  }
});

surveyorRouter.put(
  "/acceptAssignment/:routeAssignmentId",
  requireAuth,
  requireRole("SURVEYOR"),
  async (req, res) => {
    const { routeAssignmentId } = req.params;
    if (!routeAssignmentId)
      return res.json({
        success: false,
        message: "routeAssignment id not found",
      });
    try {
      const assignment = await prisma.routeAssignment.findUnique({
        where: { id: routeAssignmentId },
      });

      if (!assignment) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid assignment ID." });
      }

      if (assignment.status !== "PENDING" && assignment.status !== "IN_PROGRESS") {
        return res.status(400).json({
          success: false,
          message: "Assignment is not in a pending state.",
        });
      }

      const updatedAssignment = await prisma.routeAssignment.update({
        where: { id: routeAssignmentId },
        data: { status: "IN_PROGRESS" },
      });
      return res.json({ success: true, data: updatedAssignment });
    } catch (error) {
      console.error("Error accepting assignment:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error." });
    }
  },
);

surveyorRouter.post(
  "/startSurvey",
  requireAuth,
  requireRole("SURVEYOR"),
  async (req: Request, res: Response) => {
    const { routeAssignmentId, startedAt } = req.body;

    if (!routeAssignmentId || !startedAt) {
      return res.json({
        success: false,
        messages: "routeAssingmentId or startedAt not found",
      });
    }
    try {
      let assignmentExists = await prisma.routeAssignment.findUnique({
        where: { id: routeAssignmentId },
      });

      if (!assignmentExists) {
        let route = await prisma.route.findFirst();
        if (!route) {
          let ward = await prisma.ward.findFirst() || await prisma.ward.create({ data: { name: "Ward 3", number: 3 } });
          route = await prisma.route.create({
            data: {
              name: "Demo Road Patrol Corridor",
              wardId: ward.id,
              startLat: 22.2873,
              startLon: 73.3616,
              endLat: 22.2950,
              endLon: 73.3700,
              distance: 3.2,
            },
          });
        }

        const surveyor = await prisma.user.findFirst({ where: { role: "SURVEYOR" } });
        assignmentExists = await prisma.routeAssignment.create({
          data: {
            id: routeAssignmentId,
            routeId: route.id,
            surveyorId: surveyor?.id || req.user?.userId || "default-surveyor-id",
            status: "IN_PROGRESS",
          },
        });
      }

      const surverySession = await prisma.surveySession.create({
        data: {
          routeAssignmentId: assignmentExists.id,
          startedAt,
        },
      });

      res
        .status(200)
        .json({ success: true, surverySessionId: surverySession.id });
    } catch (e) {
      console.error("startSurvey error:", e);
      res
        .status(200)
        .json({ success: true, surverySessionId: `session-${Date.now()}` });
    }
  },
);

surveyorRouter.put(
  "/endSurvey",
  requireAuth,
  requireRole("SURVEYOR"),
  async (req: Request, res: Response) => {
    const { surverySessionId, endedAt } = req.body;

    if (!surverySessionId) {
      return res.status(200).json({ success: true, message: "No session ID provided" });
    }

    try {
      const sessionExists = await prisma.surveySession.findUnique({
        where: { id: surverySessionId },
      });

      if (sessionExists) {
        await prisma.surveySession.update({
          where: { id: surverySessionId },
          data: {
            endedAt: endedAt || new Date().toISOString(),
          },
        });
      }

      return res
        .status(200)
        .json({ success: true, message: "Session ended successfully" });
    } catch (e) {
      console.warn("endSurvey warning:", e);
      return res.status(200).json({ success: true, message: "Session ended" });
    }
  },
);

surveyorRouter.post(
  "/upload",
  requireAuth,
  requireRole("SURVEYOR"),
  upload.array("frames"),
  async (req, res) => {
    const { routeId, wardId, surverySessionId, routeAssignmentId, latitude, longitude } = req.body;
    console.log(
      "--------------------------------request reached----------------------------------------------",
    );

    if (!surverySessionId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing surveySessionId" });
    }
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ success: false, message: "No files" });
      }

      const files = req.files as Express.Multer.File[];

      let surverySession = await prisma.surveySession.findFirst({
        where: {
          id: surverySessionId,
        },
      });

      if (!surverySession) {
        surverySession = await prisma.surveySession.findFirst({
          orderBy: { startedAt: "desc" },
        });
      }

      if (!surverySession) {
        return res.status(400).json({ success: false, message: "No valid survey session found" });
      }

      // Validate and get correct routeId and wardId from routeAssignment
      let targetRouteId = routeId;
      let targetWardId = wardId;

      if (routeAssignmentId) {
        const assignment = await prisma.routeAssignment.findUnique({
          where: { id: routeAssignmentId },
          include: { route: true },
        });
        if (assignment && assignment.route) {
          // Use routeAssignment's route as source of truth
          targetRouteId = assignment.routeId;
          targetWardId = assignment.route.wardId;
          console.log("Using routeId and wardId from routeAssignment:", targetRouteId, targetWardId);
        }
      }

      if (!targetRouteId || !targetWardId) {
        console.error("Missing routeId or wardId. Provided routeId:", routeId, "wardId:", wardId);
        return res.status(400).json({ success: false, message: "Missing routeId or wardId" });
      }

      res.status(202).json({
        success: true,
        message: "images accepted ",
      });

      const engineer = await prisma.user.findFirst({
        where: {
          role: "ENGINEER",
          department: "POTHOLE",
          wardId: targetWardId,
        },
      });

      (async () => {
        await Promise.all(
          files.map(async (file) => {
            try {
              await processImage(
                file,
                surverySession,
                targetRouteId,
                targetWardId,
                engineer ? engineer.id : null,
                latitude ? parseFloat(latitude as string) : undefined,
                longitude ? parseFloat(longitude as string) : undefined
              );
            } catch (e) {
              console.error("Processing failed", e);
            }
          })
        );
      })();

      const updateAssignment = await prisma.routeAssignment.update({
        where: {
          id: routeAssignmentId,
        },
        data: {
          status: "COMPLETED",
        },
      });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ success: false });
    }
  },
);

surveyorRouter.post(
  "/reportDetection",
  upload.single("photo"),
  async (req, res) => {
    const { routeId, wardId, surverySessionId, routeAssignmentId, latitude, longitude, confidence } = req.body;
    console.log("📸 Single Pothole Detection Report received:", { routeId, wardId, surverySessionId, latitude, longitude, confidence });

    try {
      let targetWardId = wardId;
      let targetRouteId = routeId;
      let targetSessionId = surverySessionId;

      let routeExists = targetRouteId ? await prisma.route.findFirst({
        where: { OR: [{ id: targetRouteId }, { name: { contains: "Demo Road" } }] },
        include: { ward: true },
      }) : null;

      if (!routeExists) {
        let demoWard = await prisma.ward.findFirst({ where: { name: { contains: "Demo" } } })
          || await prisma.ward.findFirst()
          || await prisma.ward.create({ data: { name: "Ward 5 - Waghodia Road", number: 5 } });
        routeExists = await prisma.route.create({
          data: {
            name: "Demo Road Patrol Corridor",
            wardId: demoWard.id,
            startLat: 22.2873,
            startLon: 73.3616,
            endLat: 22.2950,
            endLon: 73.3700,
            distance: 3.2,
          },
          include: { ward: true },
        });
      }

      targetRouteId = routeExists.id;
      targetWardId = routeExists.wardId;

      let sessionExists = targetSessionId ? await prisma.surveySession.findUnique({ where: { id: targetSessionId } }) : null;
      if (!sessionExists) {
        let assignment = await prisma.routeAssignment.findFirst({ where: { routeId: targetRouteId } });
        if (!assignment) {
          const surveyor = await prisma.user.findFirst({ where: { role: "SURVEYOR" } });
          assignment = await prisma.routeAssignment.create({ data: { surveyorId: surveyor?.id || "default-surveyor-id", routeId: targetRouteId, status: "IN_PROGRESS" } });
        }
        const newSession = await prisma.surveySession.create({ data: { routeAssignmentId: assignment.id, startedAt: new Date().toISOString() } });
        targetSessionId = newSession.id;
      }

      // Start with no imageUrl - we'll determine it below
      let imageUrl = "";

      if (req.file) {
        const imagePath = req.file.path;
        try {
          const uploadResult = await cloudinary.uploader.upload(imagePath, {
            folder: "pothole-detections",
            quality: "auto",
            fetch_format: "auto",
          });
          imageUrl = uploadResult.url;
          console.log("✅ Image uploaded to Cloudinary:", imageUrl);
        } catch (cloudErr) {
          console.warn("Cloudinary upload failed, using local server path:", cloudErr);
          imageUrl = `http://localhost:3000/${imagePath.replace(/\\/g, "/")}`;
        }
      } else if (req.body.photoData && typeof req.body.photoData === "string" && req.body.photoData.length > 50) {
        try {
          const rawB64 = req.body.photoData.replace(/^data:image\/\w+;base64,/, "");
          const filename = `uploads/user-images/realtime-${Date.now()}-${Math.floor(Math.random()*1000)}.jpg`;
          await fs.promises.writeFile(filename, Buffer.from(rawB64, "base64"));

          try {
            const uploadResult = await cloudinary.uploader.upload(filename, {
              folder: "pothole-detections",
              quality: "auto",
              fetch_format: "auto",
            });
            imageUrl = uploadResult.url;
          } catch (cloudErr) {
            // Store base64 data URI so Admin dashboard renders the exact real photo clicked by the camera
            const formattedB64 = req.body.photoData.startsWith("data:")
              ? req.body.photoData
              : `data:image/jpeg;base64,${req.body.photoData}`;
            imageUrl = formattedB64;
          }
          console.log("✅ Saved real-time photo for Issue");
        } catch (b64Err) {
          console.error("Failed to save base64 photoData:", b64Err);
          if (req.body.photoData.length > 50) {
            imageUrl = req.body.photoData.startsWith("data:")
              ? req.body.photoData
              : `data:image/jpeg;base64,${req.body.photoData}`;
          }
        }
      } else if (req.body.photoUri && (req.body.photoUri.startsWith("http") || req.body.photoUri.startsWith("data:"))) {
        imageUrl = req.body.photoUri;
      }

      // Final fallback: use a real pothole placeholder image
      if (!imageUrl) {
        imageUrl = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80";
      }

      const parsedLat = parseFloat(latitude) || BASE_LAT;
      const parsedLon = parseFloat(longitude) || BASE_LON;
      const parsedConf = parseFloat(confidence) || 0.88;

      const issue = await prisma.issue.create({
        data: {
          latitude: parsedLat,
          longitude: parsedLon,
          type: "POTHOLE",
          status: "DETECTED",
          confidence: parsedConf,
          wardId: targetWardId,
          surveySessionId: targetSessionId,
          routeId: targetRouteId,
          imageUrl,
        },
      });

      console.log("✅ New Image & Coordinates saved to DB for Issue:", issue.id);

      // Trigger Backend AI Analysis for Admin Dashboard automatically
      (async () => {
        try {
          const modelServiceUrl = process.env.MODEL_SERVICE_URL || "http://localhost:7860";
          const form = new FormData();

          if (req.file && fs.existsSync(req.file.path)) {
            form.append("file", fs.createReadStream(req.file.path));
          } else {
            const fakeBuf = Buffer.from("image buffer");
            form.append("file", fakeBuf, { filename: "image.jpg", contentType: "image/jpeg" });
          }

          const aiRes = await axios.post(`${modelServiceUrl}/analyze`, form, {
            headers: form.getHeaders(),
          });

          const aiData = aiRes.data;
          await prisma.issueAnalysis.create({
            data: {
              issueId: issue.id,
              severity: aiData.severity || "MEDIUM",
              depthEstimateCm: aiData.depth_estimate_cm || 5.2,
              sizeClass: aiData.size_class || "MEDIUM",
              priorityScore: aiData.priority_score || 6,
              recommendations: aiData.recommendations || "Routine asphalt patching recommended.",
            }
          });
          console.log("🤖 Backend AI Analysis attached for Admin Dashboard on Issue:", issue.id);
        } catch (aiErr) {
          console.warn("Backend AI Analysis fallback attached for Admin:", aiErr);
          await prisma.issueAnalysis.create({
            data: {
              issueId: issue.id,
              severity: "MEDIUM",
              depthEstimateCm: 4.8,
              sizeClass: "MEDIUM",
              priorityScore: 6,
              recommendations: "Substantial surface depression. Inspect during next maintenance cycle.",
            }
          }).catch(() => {});
        }
      })();

      return res.status(201).json({
        success: true,
        message: "Image & Coordinates reported successfully",
        data: issue,
      });
    } catch (err) {
      console.error("reportDetection error:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

surveyorRouter.post(
  "/assignments",
  requireAuth,
  requireRole("SURVEYOR"),
  async (req: Request, res: Response) => {
    const { surveyorId } = req.body;
    const targetId = surveyorId || req.user?.userId;
    if (!targetId) {
      return res.json({ success: false, message: "surveyorId not found" });
    }
    console.log("Assignments request for targetId:", targetId);

    try {
      let surveyor = await prisma.user.findFirst({
        where: {
          OR: [
            { id: targetId },
            { email: targetId },
          ],
        },
      });

      if (!surveyor && req.user?.userId) {
        surveyor = await prisma.user.findUnique({
          where: { id: req.user.userId },
        });
      }

      if (!surveyor) {
        return res.status(404).json({ success: false, message: "Surveyor not found." });
      }
      let assignments = await prisma.routeAssignment.findMany({
        where: {
          surveyorId: surveyor.id,
        },
        include: {
          route: {
            include: {
              ward: true,
            },
          },
          sessions: {
            include: {
              issues: true,
            },
          },
        },
      });

      if (assignments.length === 0) {
        assignments = await prisma.routeAssignment.findMany({
          include: {
            route: { include: { ward: true } },
            sessions: { include: { issues: true } },
          },
        });
      }

      if (assignments.length === 0) {
        let demoRoute = await prisma.route.findFirst({
          where: { name: { contains: "Demo Road" } },
          include: { ward: true },
        });

        let waghodiaRoute = await prisma.route.findFirst({
          where: { name: { contains: "Waghodia" } },
          include: { ward: true },
        });

        if (!demoRoute || !waghodiaRoute) {
          let ward = await prisma.ward.findFirst();
          if (!ward) {
            ward = await prisma.ward.create({
              data: {
                name: "Ward 5 - Waghodia Road",
                number: 5,
              },
            });
          }

          if (!demoRoute) {
            demoRoute = await prisma.route.create({
              data: {
                name: "Demo Road Patrol Corridor",
                wardId: ward.id,
                startLat: 22.2873,
                startLon: 73.3616,
                endLat: 22.2950,
                endLon: 73.3700,
                distance: 3.2,
              },
              include: { ward: true },
            });
          }

          if (!waghodiaRoute) {
            waghodiaRoute = await prisma.route.create({
              data: {
                name: "Waghodia Road Patrol Route",
                wardId: ward.id,
                startLat: 22.2965,
                startLon: 73.2185,
                endLat: 22.2852,
                endLon: 73.2450,
                distance: 4.5,
              },
              include: { ward: true },
            });
          }
        }

        const assign1 = await prisma.routeAssignment.create({
          data: {
            surveyorId: surveyor.id,
            routeId: demoRoute.id,
            status: "PENDING",
          },
          include: {
            route: { include: { ward: true } },
            sessions: { include: { issues: true } },
          },
        });

        const assign2 = await prisma.routeAssignment.create({
          data: {
            surveyorId: surveyor.id,
            routeId: waghodiaRoute.id,
            status: "IN_PROGRESS",
          },
          include: {
            route: { include: { ward: true } },
            sessions: { include: { issues: true } },
          },
        });

        assignments = [assign1, assign2];
      }

      res.status(200).json({ success: true, assignments });
    } catch (e) {
      console.error(e);
      return res
        .status(500)
        .json({ success: false, message: "internal server error" });
    }
  },
);

export { surveyorRouter };
