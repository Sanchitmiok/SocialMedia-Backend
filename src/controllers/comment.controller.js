import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  try {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid video id");
    }
    const { page = 1, limit = 10 } = req.query;
    const Page = parseInt(page)
    const Limit = parseInt(limit)
    const skip = (Page - 1)*Limit;
    const comments = await Comment.find({ video: videoId }).skip(skip).limit(Limit);
    const totalComments = await Comment.countDocuments({video: videoId })
    console.log(totalComments)
    const TotalPages = Math.ceil(totalComments / Limit)
    if (!comments) {
      throw new ApiError(400, "Comments not founded");
    }

    res
      .status(200)
      .json(new ApiResponse(200, {comments , TotalPages ,currentPage:Page }, "Comments fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  // console.log(req)

  try {
    const { videoId } = req.params;
    if (!mongoose.isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid video id");
    }
    const userId = req.user?._id;
    console.log(userId);
    const { content } = req.body;
    if (content.trim() === "") {
      throw new ApiError(400, "Content is empty ");
    }

    const comment = await Comment.create({
      content: content,
      owner: userId,
      video: videoId,
    });
    console.log(comment);
    if (!comment) {
      throw new ApiError(500, "Comment could not be added in database");
    }

    res
      .status(200)
      .json(new ApiResponse(200, comment, "Commnet added succesfully"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  try {
    const { commentId } = req.params;
    const userId = req.user?._id;
    const { content } = req.body;
    if (!mongoose.isValidObjectId(commentId)) {
      throw new ApiError(400, "Invalid Comment Id");
    }

    const comment = await Comment.findById(commentId).select("owner");
    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }
    if (comment.owner.toString() !== userId.toString()) {
      throw new ApiError(400, "You are not author of this content");
    }

    const UpdatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { content: content },
      { new: true }
    );
    if (!UpdatedComment) {
      throw new ApiError(404, "UpdatedComment could not be added in database");
    }
    console.log(UpdatedComment);
    res
      .status(200)
      .json(new ApiResponse(200, UpdatedComment, "Comment updated"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  const userId = req.user?._id;
  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const CommentOwner = await Comment.findById(commentId).select("owner");
  if (!CommentOwner) {
    throw new ApiError(404, "Comment not found");
  }
  //   const VideoOwner = await Comment.findById(commentID).select("video")  owner bhi comment ko delete kar sakta hai
  if (CommentOwner.owner.toString() !== userId.toString()) {
    throw new ApiError(400, "You  are not author of this content");
  }

  try {
    await Like.deleteMany({ comment: commentId });
    await Comment.findByIdAndDelete(commentId);
  } catch (error) {
    console.log("Error while deleting file from data base");
    throw new ApiError(500, error.message);
  }

  res.status(200).json(new ApiResponse(200, "Commnet deleted"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
