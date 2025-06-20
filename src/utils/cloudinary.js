import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"    

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key:process.env.CLOUDINARY_API_KEY, 
  api_secret:process.env.CLOUDINARY_API_SECRET
});
const uploadOncloudinary = async (localfilepath) =>{
    try {
        if(!localfilepath) return null
        //upload the file on cloudinary
       const response = await cloudinary.uploader.upload(localfilepath , {
            resource_type:'auto'
        })
        console.log(response)
        console.log("File is uploaded on cloudinary " ,response.url);
        fs.unlinkSync(localfilepath)
        return response;
    } catch (error) {
        console.log("Error occurred during file upload or deletion:")
        fs.unlinkSync(localfilepath)
        return null;
    }
}

export {uploadOncloudinary}