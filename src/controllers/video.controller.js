import mongoose, { isValidObjectId, ObjectId } from "mongoose";
import { video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType } = req.query;
  //TODO: get all videos based on query, sort, paginationk
  const userId = req.user?._id;
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: sortBy
      ? { [sortBy]: sortType === "desc" ? -1 : 1 }
      : { createdAt: -1 },
  };

  const conditions = { $regex: query, $options: "i" };

  if (query) {
    conditions.title = { $regex: query, $options: "i" };
    conditions.description = {};
  }

  if (userId) {
    conditions.owner = userId;
  }

  const videos = await video.aggregatePaginate(conditions, options);

  for (let Video of videos.docs) {
    const likes = await Like.find({ video: Video._id }).populate(
      "likedBy",
      "username fullname"
    );

    Video.likes = likes.map((like) => {
      like.likeBy;
    });
    const owner = await User.findById(Video.owner).select("username fullname");

    video.owner = owner;
  }

  if (!videos) {
    throw new ApiError(500, "Error in fetching video");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  try {
    const { title, description } = req.body;
    const userId = req.user?._id;
    if ([title, description].some((field) => field.trim() === "")) {
      throw new ApiError(
        400,
        "All fields (title and description) are required"
      );
    }

    const localPathOfvideo = req.files?.videoFile[0].path;
    const localPathOfthumbnail = req.files?.thumbnail[0].path;

    if (!localPathOfthumbnail && !localPathOfvideo) {
      throw new ApiError(400, "Both video and thumbnail files are required");
    }
    const Videofile = await uploadOncloudinary(localPathOfvideo);
    if (!Videofile) {
      throw new ApiError(400, "Video file is not uploaded on cloudinary");
    }
    const Thumbnailfile = await uploadOncloudinary(localPathOfthumbnail);
    if (!Thumbnailfile) {
      throw new ApiError(400, "Thumbnail file is not uploaded on cloudinary");
    }

    const newvideo = await video.create({
      "owner": userId,
      videoFile: Videofile.url,
      thumbnail: Thumbnailfile.url,
      title: title,
      description: description,
      time: Videofile.duration || 0,
    });

    if (!newvideo) {
      throw new ApiError(400, "New video could not be added to the database");
    }

    res
      .status(200)
      .json(new ApiResponse(200, newvideo, "Video published successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  try {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "VideoId is missing");
    }
    const Video = await video.findById(videoId);
    if (!Video) {
      throw new ApiError(400, "Video is not present in database");
    }
    res
      .status(200)
      .json(new ApiResponse(200, Video, "Video fetched successfully"));
  } catch (error) {
    // console.log(error.message)
    throw new ApiError(500, error.message);
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  try {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "videoID is invalid");
    }
    const isPresent = await video.findById(videoId);
    if (!isPresent) {
      throw new ApiError(400, "Video is not present in data base");
    }
    const { title, description } = req.body;
    if (!title && !description) {
      throw new ApiError(400, "Title or description is missing");
    }
    const localPathOfthumbnail = req.file?.path;
    if (!localPathOfthumbnail) {
      throw new ApiError(400, "thumbnail is missing");
    }
    const Thumbnail = await uploadOncloudinary(localPathOfthumbnail);
    if (!Thumbnail) {
      throw new ApiError(400, "Thumbnail is not uploaded on cloudinary");
    }

    const Video = await video.findByIdAndUpdate(
      videoId,
      {
        title: title,
        description: description,
        thumbnail: Thumbnail.url,
      },
      { new: true }
    );
    if (!Video) {
      throw new ApiError(400, "Video is not created");
    }

    res.status(200).json(new ApiResponse(200, Video, "Video is updated"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    //TODO: delete video
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "videoID is invalid");
    }

    const Video = await video.findByIdAndDelete(videoId);
    if (!Video) {
      throw new ApiError(404, "Video is not present");
    }
    res.status(200).json(new ApiResponse(200, "Video is deleted"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;
  if (!videoId.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const videoOwner = await video.findById(videoId).select("owner").exec();

  if (!videoOwner) {
    throw new ApiError(403, "Video not found");
  }
  if (videoOwner.owner.toString() !== userId.toString()) {
    console.log(videoOwner._id.toString(), userId.toString());
    throw new ApiError(403, "You are not owner of this video");
  }

  const videoFile = await video.findById(videoId).select("-owner").exec();

  if (!videoFile) {
    throw new ApiError(400, "Video not founded");
  }

  videoFile.isPublished = !videoFile.isPublished;

  const updatedVideo = await videoFile.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Publish status updated"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
