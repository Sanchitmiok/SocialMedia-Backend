import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import Jwt  from "jsonwebtoken";
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Vedio",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshTokens: {
      type: String,
    },
  },
  { timestamps: true }
);
//MiddleWare 
userSchema.pre("save", async function (next) {
  
  if (this.isModified("password")) {
    this.password =await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
 return Jwt.sign({
    _id: this._id,
    email: this.email,
    username: this.username,
    fullname: this.fullname,
  },
  process.env.ACCESS_TOKEN_SECRET,
  {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY 
  }
  
  );
};
userSchema.methods.generateRefreshToken = function () {
    return Jwt.sign({
        _id: this._id
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
          expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    
      }
      
      );

};

export const User = mongoose.model("User", userSchema);
