import mongoose, { Schema } from "mongoose";
const playListSchema = new Schema(
  {
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: "video",
      },
    ],
    name: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playListSchema);
