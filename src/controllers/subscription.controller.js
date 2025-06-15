import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400 , "Invalid channel ID ")
    }
    // TODO: toggle subscription
    try {
        const userId = req.user._id;
        const isSubscribed = await Subscription.findOne({subscriber:userId , channel:channelId})
    
        if(isSubscribed){
            await Subscription.deleteOne({_id:isSubscribed._id});
            
            res.status(200)
            .json(
                new ApiResponse(200 , "Unsubscribed succesfully")
            )
        } else{
            const newSubscriber = new Subscription({channel:channelId , subscriber:userId})
            await newSubscriber.save();
    
            res.status(200)
            .json(
                new ApiResponse(200 , "Subscribed succesfully")
            )
        }
    } catch (error) {
        throw new ApiError(500 , "Something went wrong during toggling" , error.message)
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    try {
        const {channelId} = req.params;
        if(!isValidObjectId(channelId)){
            throw new ApiError(400 , "Invalid channel ID ")
        }
        const Subscribers = await Subscription.find({channel:channelId});
        
        const subscriberDetails = await Promise.all(Subscribers.map(async (subs)=>{
            const user = await User.findById(subs.subscriber);
            return {
                userId:user._id,
                username:user.username,
                email:user.email
            }
        })) 
        res.status(200)
        .json(
            new ApiResponse(200 , subscriberDetails , "subscribers Details fetched successfully")
        )
    } catch (error) {
        throw new ApiError(500 , "Something went wrong during data  fetching" , error.message);
    }
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    try {
        const { subscriberId } = req.params;
        if(!isValidObjectId(subscriberId)){
            throw new ApiError(400 , "Invalid Subscriber ID ")
        }
        const subscriptions = await Subscription.find({subscriber:subscriberId});
        const channelDetails = await Promise.all(subscriptions.map(async (subscription)=>{
            const channel = User.findById(subscription.channel);
            return {
                channelId:channel._id,
                fullname:channel.fullname
            }
        }))
         
        res.status(200).json(
            new ApiResponse(200 , channelDetails , "Subscribed Channel Details fetched succesfully")
        )
    } catch (error) {
        throw new ApiError(500 , "Something went wrong during data fetching" , error.message)
    } 
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}