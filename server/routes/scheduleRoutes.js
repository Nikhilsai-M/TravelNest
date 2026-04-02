const express = require("express");
const upload = require("../middlewares/uploadMiddleware");
const { extractSchedule } = require("../controllers/scheduleController");
const { requireUser } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", requireUser, upload.single("schedulePdf"), extractSchedule);

module.exports = router;
