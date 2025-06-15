import express  from "express";
import cors from "cors";

const app = express();

app.use(cors({ 
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))//give limit
app.use(express.urlencoded({extended:true , limit:"16kb"}))
app.use(express.static("public"))

//Routes
import UserRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"
import SubscriptionRouter from "./routes/subscription.routes.js"
import commentRouter from "./routes/comment.routes.js"
//Assignment
app.use("/api/v1/videos", videoRouter)
//routes declaration 
app.use("/api/v1/users",UserRouter)
app.use("/api/v1/subscription",SubscriptionRouter)
app.use("/api/v1/comments",commentRouter)
export {app}

