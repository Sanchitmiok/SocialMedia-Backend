import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOncloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import Jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //step1::get user details from frontend
  const { fullname, email, username, password } = req.body;
  // console.log("email: ", password);

  //Step 2:: Validation

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "") //agar koi bhi fiels khali hai tph error ayega
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Step 3:: check weather user is already present or not
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(400, "User with email or username already existed");
  }
  // Step 4 ::Check for image and avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //Step 5 :: Upload on cloudinary
  const avatar = await uploadOncloudinary(avatarLocalPath);
  const coverImage = await uploadOncloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  //step 6:: create user object - create entry in db

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  //step 7::for user creation
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registring the user");
  }

  //step 8 :: return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered succesfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data

  const { email, username, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  //username or email
  //find the user

  const user = await User.findOne({
    //User used when operation have to perform from mongoose
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  //password check

  const isPassvalid = await user.isPasswordCorrect(password); //isPasswordCorrect is user defined operation

  if (!isPassvalid) {
    throw new ApiError(401, "Invalid user credential");
  }

  //access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = User.findById(user._id).select(
    "-password -refreshToken"
  );
  // console.log(loggedInUser);
  //send cookies

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: {
            email: loggedInUser.email,
            id: loggedInUser._id,
            username: loggedInUser.username,
            fullname: loggedInUser.fullname,
          },
          accessToken,
          refreshToken,
        },
        "User logged in succesfully "
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out "));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // console.log(req)
  //chai aur code m
  // const incomingRefreshToken =(req.cookies.refreshToken || req.body.refreshToken);

  const incomingRefreshToken = req.headers["cookie"]
    .split("; ")
    .find((row) => row.startsWith("refreshToken="))
    .split("=")[1];

  console.log(incomingRefreshToken);
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  try {
    const decodedToken = Jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh Token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    try {
      const { accessToken, newrefreshToken } =
        await generateAccessAndRefreshTokens(user._id);

      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
          new ApiResponse(
            200,
            {
              accessToken,
              refreshToken: newrefreshToken,
            },
            "Access token refreshed"
          )
        );
    } catch (error) {
      throw new ApiError(
        401,
        error?.message || "Failed to generate new tokens"
      );
    }
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPassCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPassCorrect) {
    throw new ApiError(401, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Your password is changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const udateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(401, "All fields are required ");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated succesfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOncloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated succesfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const CoverImagelocalPath = req.file?.path;
  if (!CoverImagelocalPath) {
    throw new ApiError(400, "Cover image is required ");
  }

  const coverImage = await uploadOncloudinary(CoverImagelocalPath);
  if (!coverImage) {
    throw new ApiError(400, "Error while uploading CoverImage on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated succesfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match:{
        username: username?.toLowerCase()
      }
    },
    {
      $lookup:{
        from:"subscription",//<collection to join>
        localField:"_id", //<field from the input documents>
        foreignField:"channel",//<field from the documents of the "from" collection>
        as:"subscribers"//<output array field>
      }
    },
    {
      $lookup:{
        from:"subscription",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }
    },
    {
      $addFields:{
         subsribersCount:{
          $size:"$subscribers"
         },
         channelSubscribedToCount:{
          $size:"$subscribedTo"
         },
         isSubscribed:{
          $cond:{
            if:{$in:[req.user?._id , "$subscribers.subscriber"]},
            then:true,
            else:false
          }
         }
      }
    },
    {
      $project:{
        fullname:1,
        username:1,
        subsribersCount:1,
        channelSubscribedToCount:1,
        isSubscribed:1,
        avatar:1,
        email:1,
        coverImage:1
      }
    }
  ]);
  
  console.log(channel);
  if(!channel?.length){
    throw new ApiError(404 , "Channel does not exist");
  }

  return res
  .status(200)
  .json(
    new ApiResponse(200 , channel , "User channel fetched succesfully")
  )
});

const getUserWatchHistry = asyncHandler(async(req , res)=>{
  const user = await User.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    fullname:1,
                    username:1,
                    avatar:1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }
    }
  ])


  return res.status(200)
  .json(
    new ApiResponse(
      200 , 
      user[0].wathcHistory,
      "Watch History fetch successfuly"
    )
  )
})



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  udateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistry
};
