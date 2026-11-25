import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

import customerRoutes from "./routes/customerRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { notFound, errorHandler } from "./middleware/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve uploaded PDF documents
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
  })
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ARF API is running",
  });
});

// API routes
app.use("/api/customers", customerRoutes);
app.use("/api/payments", paymentRoutes);

// Handle Multer and PDF upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "PDF size must not exceed 10 MB."
          : err.message,
    });
  }

  if (err.message === "Only PDF files are allowed.") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
});

// Handle unknown routes
app.use(notFound);

// General error handler - always last
app.use(errorHandler);

export default app;
