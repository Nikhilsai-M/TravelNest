const express = require("express");
const router = express.Router();
const { getNearbyPlaces } = require("../controllers/placesController");

router.get("/", getNearbyPlaces);

module.exports = router;