require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 4000;

app.set("trust proxy", 1); // for Render/Vercel cookies

/* ── Database ── */
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/authsystem")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

/* ── Middleware ── */
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // allow cookies
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(morgan("dev"));

/* ── Routes ── */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/protected", require("./routes/protected"));

/* ── Health check ── */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ── 404 ── */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* ── Error handler ── */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Auth API running at http://localhost:${PORT}`);
});
