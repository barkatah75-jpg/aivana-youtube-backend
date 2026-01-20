// ===============================
// AIVANA YouTube Backend (PRODUCTION FINAL – CLEAN)
// ===============================

import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const app = express();
app.use(express.json());

// ===============================
// ENV
// ===============================
const PORT = process.env.PORT || 10000;
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

// ===============================
// UPLOAD DIR
// ===============================
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// ===============================
// MULTER
// ===============================
const upload = multer({ dest: UPLOAD_DIR });

// ===============================
// OAUTH CLIENT (ENV BASED)
// ===============================
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

// ===============================
// AUTH ROUTES (OPTIONAL)
// ===============================
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ],
  });
  res.redirect(url);
});

app.get("/auth/callback", (req, res) => {
  res.send("✅ Already connected. You can close this tab.");
});

// ===============================
// YOUTUBE CLIENT
// ===============================
const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client,
});

// ===============================
// MANUAL UPLOAD
// ===============================
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const response = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: "AIVANA Upload",
          description: "Manual upload",
          categoryId: "28",
        },
        status: { privacyStatus: "public" },
      },
      media: {
        body: fs.createReadStream(req.file.path),
      },
    });

    res.json({
      success: true,
      videoId: response.data.id,
      url: `https://www.youtube.com/watch?v=${response.data.id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// GENERATE + UPLOAD (SMOKE TEST)
// ===============================
app.post("/generate-and-upload", async (req, res) => {
  try {
    const videoPath = path.join(process.cwd(), "test.mp4");

    const response = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: "AIVANA Smoke Test",
          description: "Smoke test successful",
          categoryId: "28",
        },
        status: { privacyStatus: "public" },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    res.json({
      success: true,
      videoId: response.data.id,
      url: `https://www.youtube.com/watch?v=${response.data.id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// HEALTH
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 AIVANA YouTube Backend running (CLEAN PROD)");
});

// ===============================
// START
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
