
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import  Jwt  from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req , _ , next)=>{
  try {
    // console.log(req)

   //this is one method  (error aa raha hai)

    // const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
   
    // isme error nahi aa rha 
    const token =req.headers['cookie'].split(';').find(row => row.startsWith('accessToken=')).split('=')[1];
    // console.log("Token:", token);

    if(!token){
      throw new ApiError(401 , "Unauthorized request: No access token provided")
    }
  
   const decodedToken = Jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
  //  console.log("Decoded Token:", decodedToken);

  
  const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
  // console.log("User:", user);

  if(!user){
      //TOFO:
      throw new ApiError(401 , "Invalid Access Token")
    }
  
    req.user = user;
    next()
  } catch (error) {
    throw new ApiError(401 , error?.message || "Invalid Access Token")
  }

})