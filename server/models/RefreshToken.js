const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Track device/session info (optional but useful)
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
);

/* Auto-expire documents from MongoDB after their expiry date */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/* Convenience: check if token is expired */
refreshTokenSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
