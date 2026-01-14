import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";
import open from "open";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- OAuth2 Setup ----------
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// ---------- Load tokens if exist ----------
const TOKEN_PATH = "tokens.json";
if (fs.existsSync(TOKEN_PATH)) {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oauth2Client.setCredentials(tokens);
  console.log("✅ Tokens loaded");
}

// ---------- Multer setup ----------
const upload = multer({ dest: "uploads/" });

// ---------- AUTH ROUTE ----------
app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ],
  });
  open(authUrl);
  res.send("🔐 Authorizing with Google...");
});

// ---------- CALLBACK ----------
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("✅ TOKENS RECEIVED:", tokens);
  res.send("✅ YouTube Connected Successfully. You can close this tab.");
});

// ---------- UPLOAD ----------
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: req.body.title,
          description: req.body.description,
        },
        status: {
          privacyStatus: "public",
        },
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

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
