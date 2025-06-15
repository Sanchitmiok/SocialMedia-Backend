import  Multer  from "multer";

const storage = Multer.diskStorage({
    destination: function (req, file, cb) {//call back
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null , file.originalname)
    }
  })
  
 export const upload = Multer({ 
    storage
})


