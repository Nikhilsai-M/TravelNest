const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    firstName: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
    },
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    username: {
      type: String,
      trim: true,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    primaryEmailAddressId: {
      type: String,
      default: null,
    },
    primaryPhoneNumberId: {
      type: String,
      default: null,
    },
    lastSignInAt: {
      type: Date,
      default: null,
    },
    clerkCreatedAt: {
      type: Date,
      default: null,
    },
    clerkUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", UserSchema);
