const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    userSnapshot: {
      clerkId: String,
      fullName: String,
      email: String,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    mode: {
      type: String,
      enum: ["business", "leisure"],
    },
    location: {
      label: String,
      lat: Number,
      lng: Number,
    },
    preferences: [String],
    notes: String,
    scheduleText: String,
    scheduleData: mongoose.Schema.Types.Mixed,
    freeSlots: [mongoose.Schema.Types.Mixed],
    rawPois: [mongoose.Schema.Types.Mixed],
    itinerary: mongoose.Schema.Types.Mixed,
    sourceDocumentName: String,
    travelerProfile: mongoose.Schema.Types.Mixed,
    journalEntries: [
      {
        content: {
          type: String,
          trim: true,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    transportMode: {
      type: String,
      enum: ["auto", "walking", "cycling", "driving"],
      default: "auto",
    },
    expenseMode: {
      type: String,
      enum: ["budget", "balanced", "premium"],
      default: "balanced",
    },
  },
  {
    timestamps: true,
  }
);

TripSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("Trip", TripSchema);
