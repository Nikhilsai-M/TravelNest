const express = require("express");
const { fetchPois, geocodePlace } = require("../controllers/poiController");
const { requireUser } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/geocode", requireUser, geocodePlace);
router.get("/", requireUser, fetchPois);

module.exports = router;
