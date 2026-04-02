const mongoose = require("mongoose");
const User = require("../models/User");

function toDate(value) {
  if (!value) {
    return null;
  }

  return new Date(value);
}

function mapClerkUser(clerkUser) {
  const primaryEmail =
    clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress || null;

  const primaryPhone =
    clerkUser.phoneNumbers.find(
      (phone) => phone.id === clerkUser.primaryPhoneNumberId,
    )?.phoneNumber || null;

  return {
    clerkId: clerkUser.id,
    email: primaryEmail,
    firstName: clerkUser.firstName || "",
    lastName: clerkUser.lastName || "",
    fullName:
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "",
    username: clerkUser.username || "",
    imageUrl: clerkUser.imageUrl || "",
    phoneNumber: primaryPhone,
    primaryEmailAddressId: clerkUser.primaryEmailAddressId || null,
    primaryPhoneNumberId: clerkUser.primaryPhoneNumberId || null,
    lastSignInAt: toDate(clerkUser.lastSignInAt),
    clerkCreatedAt: toDate(clerkUser.createdAt),
    clerkUpdatedAt: toDate(clerkUser.updatedAt),
  };
}

async function syncClerkUserToDatabase(clerkUser) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  const userPayload = mapClerkUser(clerkUser);

  const dbUser = await User.findOneAndUpdate(
    { clerkId: clerkUser.id },
    { $set: userPayload },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return dbUser;
}

module.exports = {
  mapClerkUser,
  syncClerkUserToDatabase,
};
