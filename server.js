const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const {
  S3Client,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Root route
app.get("/", (req, res) => {
  res.send(`Server is running on port ${PORT}`);
});

// ✅ Multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG and PNG images are allowed"));
    }
  },
});

// ✅ S3 Client (v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

// ✅ Upload Route
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    console.log(`Handled by server on port ${PORT}`);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileName = `${uuidv4()}-${Date.now()}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);

    const url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    return res.status(200).json({ url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message,
    });
  }
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});