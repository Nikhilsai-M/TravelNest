const express = require("express");
const { requireUser } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/sync", requireUser, async (req, res, next) => {
  try {
    res.json({
      message: "User synced successfully.",
      mongoConnected: Boolean(req.dbUser),
      databaseUser: req.dbUser
        ? {
            id: req.dbUser._id,
            clerkId: req.dbUser.clerkId,
            email: req.dbUser.email,
            firstName: req.dbUser.firstName,
            lastName: req.dbUser.lastName,
            fullName: req.dbUser.fullName,
            imageUrl: req.dbUser.imageUrl,
            createdAt: req.dbUser.createdAt,
            updatedAt: req.dbUser.updatedAt,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireUser, async (req, res, next) => {
  try {
    const { userId, sessionId } = req.auth;
    const user = req.clerkUser;
    const dbUser = req.dbUser;

    res.json({
      authStatus: "authenticated",
      sessionId,
      user: {
        id: user.id,
        fullName: [user.firstName, user.lastName].filter(Boolean).join(" "),
        primaryEmailAddress:
          user.emailAddresses.find(
            (email) => email.id === user.primaryEmailAddressId,
          )?.emailAddress || null,
      },
      databaseUser: dbUser
        ? {
            id: dbUser._id,
            clerkId: dbUser.clerkId,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            fullName: dbUser.fullName,
            imageUrl: dbUser.imageUrl,
            lastSignInAt: dbUser.lastSignInAt,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
          }
        : null,
      mongoConnected: Boolean(dbUser),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
