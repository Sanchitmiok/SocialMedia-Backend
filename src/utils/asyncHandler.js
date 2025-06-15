// Yeh code ek Express.js middleware function define karta hai jo async operations ko handle karta hai aur errors ko catch karke Express ke error handling middleware ko bhejta hai.

const asyncHandler = (reqHandler) => {
  return (req , res , next) => {
        Promise.resolve(reqHandler(req , res , next)).catch((err)=> next(err))
    }
    
}
export { asyncHandler }


// By using try and catch ::
 
// const asynHandler = (fn) => async (req , res , next) =>{
//     try {
//         await fn(req , res , next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             succes:false ,
//             message: err.message
//         })
//     }
// }

