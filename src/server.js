import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const PORT = process.env.PORT || 3000;
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing. Copy .env.example to .env and configure it.");
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");
  app.listen(PORT, "0.0.0.0", () => console.log(`ARF API listening on port ${PORT}`));
} catch (error) {
  console.error("Unable to start ARF API:", error.message);
  process.exit(1);
}