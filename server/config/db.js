const mongoose = require("mongoose");

function looksLikePlaceholder(uri) {
  if (!uri) {
    return true;
  }

  return [
    "<username>",
    "<password>",
    "@cluster.mongodb.net",
    "cluster.mongodb.net/travel_app",
  ].some((fragment) => uri.includes(fragment));
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri || looksLikePlaceholder(mongoUri)) {
      console.warn(
        "MONGO_URI is missing or still using placeholder Atlas values. Skipping MongoDB connection."
      );
      return;
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.warn("Server will continue without database connection until MONGO_URI is fixed.");
  }
};

module.exports = connectDB;
