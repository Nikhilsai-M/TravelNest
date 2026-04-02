const express = require("express");
const {
  getTripHistoryItem,
  listTripHistory,
  optimizeItinerary,
  updateTripJournal,
} = require("../controllers/itineraryController");
const { requireUser } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/history", requireUser, listTripHistory);
router.get("/history/:tripId", requireUser, getTripHistoryItem);
router.patch("/history/:tripId/journal", requireUser, updateTripJournal);
router.post("/", requireUser, optimizeItinerary);

module.exports = router;
