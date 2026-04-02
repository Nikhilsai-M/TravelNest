const path = require("path");
const express = require("express");
const cors = require("cors");
const { clerkMiddleware } = require("@clerk/express");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
}

const connectDB = require("./config/db");

const app = express();
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_ORIGIN,
  ...(process.env.CLIENT_URLS || "").split(","),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]
  .map((origin) => origin?.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(clerkMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/extract-schedule", require("./routes/scheduleRoutes"));
app.use("/api/fetch-pois", require("./routes/poiRoutes"));
app.use("/api/optimize-itinerary", require("./routes/itineraryRoutes"));

app.get("/", (req, res) => {
  res.json({
    name: "Travel Nest API",
    status: "running",
    freeApis: ["Gemini API", "Overpass API", "OSRM", "Nominatim", "Browser Geolocation"],
    endpoints: [
      "GET /api/auth/me",
      "POST /api/extract-schedule",
      "GET /api/fetch-pois",
      "GET /api/optimize-itinerary/history",
      "GET /api/optimize-itinerary/history/:tripId",
      "POST /api/optimize-itinerary",
    ],
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.status || 500).json({
    message: error.message || "Internal server error.",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
