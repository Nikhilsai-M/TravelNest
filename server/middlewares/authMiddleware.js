const mongoose = require("mongoose");
const { clerkClient, getAuth } = require("@clerk/express");
const { syncClerkUserToDatabase } = require("../services/userService");

async function requireUser(req, res, next) {
  const auth = getAuth(req);

  if (!auth.userId) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  try {
    req.auth = auth;
    req.clerkUser = await clerkClient.users.getUser(auth.userId);

    if (mongoose.connection.readyState === 1) {
      req.dbUser = await syncClerkUserToDatabase(req.clerkUser);
    } else {
      req.dbUser = null;
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireUser,
};
