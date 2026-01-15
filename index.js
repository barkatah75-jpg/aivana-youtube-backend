import express from "express";
import fs from "fs";
import multer from "multer";
import cron from "node-cron";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------- MIDDLEWARE ----------------
app.use(express.json());

// ---------------- OAUTH SETUP ----------------
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// ---------------- LOAD TOKENS ----------------
const TOKEN_PATH = "tokens.json";
if (fs.existsSync(TOKEN_PATH)) {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oauth2Client.setCredentials(tokens);
  console.log("✅ Tokens loaded");
}

// ---------------- HELPERS ----------------
function generateUniverseScript() {
  const facts = [
    "Black holes can slow down time.",
    "There are more stars in the universe than grains of sand on Earth.",
    "Light from the Sun takes 8 minutes to reach Earth.",
    "A day on Venus is longer than its year.",
    "Neutron stars are so dense that one spoon weighs billions of tons.",
    "The universe is expanding faster every second.",
    "Saturn could float in water if a bathtub was big enough."
  ];
  const pick = facts[Math.floor(Math.random() * facts.length)];
  return `🌌 Universe Fact:\n${pick}`;
}

// NOTE: For now we reuse a small safe video already on server
function generateVideoPlaceholder(outputPath) {
  fs.copyFileSync("test.mp4", outputPath);
}

// ---------------- AUTH ROUTES ----------------
app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.force-ssl"
    ]
  });
  res.redirect(authUrl);
});

app.get("/auth/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("✅ TOKENS RECEIVED & SAVED");
    res.send("✅ YouTube Connected Successfully. You can close this tab.");
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth failed");
  }
});

// ---------------- CORE API (AI + UPLOAD) ----------------
app.post("/generate-and-upload", async (req, res) => {
  try {
    const videoPath = path.join("uploads", "aivana-auto.mp4");

    // 🔥 अगर video मौजूद नहीं है → dummy create करो
    if (!fs.existsSync(videoPath)) {
      fs.writeFileSync(videoPath, Buffer.from("000000")); // placeholder
    }

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: "AIVANA Auto Upload Test",
          description: "Uploaded automatically by AIVANA Universe",
        },
        status: {
          privacyStatus: "public",
        },
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

    res.json({
      success: true,
      videoId: response.data.id,
      url: `https://www.youtube.com/watch?v=${response.data.id}`
    });
  } catch (err) {
    console.error("❌ GENERATE+UPLOAD ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- DAILY AUTO SCHEDULER ----------------
// Runs at: 6am, 10am, 2pm, 6pm, 10pm (server timezone)
cron.schedule("0 6,10,14,18,22 * * *", async () => {
  console.log("⏰ AIVANA DAILY AUTO JOB STARTED");

  try {
    const script = generateUniverseScript();
    const videoPath = "uploads/aivana-auto.mp4";
    generateVideoPlaceholder(videoPath);

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client
    });

    const response = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: "🌌 Universe Fact | AIVANA",
          description: script
        },
        status: { privacyStatus: "public" }
      },
      media: {
        body: fs.createReadStream(videoPath)
      }
    });

    console.log("✅ AUTO UPLOADED:", response.data.id);
  } catch (err) {
    console.error("❌ AUTO JOB FAILED:", err.message);
  }
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});