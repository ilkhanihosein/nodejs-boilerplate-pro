import { Schema, model } from "mongoose";

/**
 * Stores refresh-token sessions for revocation and rotation.
 * We persist only a token hash (never the raw token) to reduce leak impact.
 */
const refreshTokenSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    /** SHA-256 hash of refresh token (raw value is never persisted). */
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      // TTL index lets MongoDB remove expired session records automatically.
      index: { expires: 0 },
    },

    revokedAt: { type: Date, default: null },

    replacedBySessionId: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const RefreshTokenSessionModel = model("RefreshTokenSession", refreshTokenSessionSchema);
