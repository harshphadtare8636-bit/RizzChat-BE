require("dotenv").config();

let express = require("express");
let cors = require("cors");
let http = require("http");
let { Server } = require("socket.io");
let { ObjectId } = require("mongodb");

let { messageCollec, photoCollec } = require("./config/db");
let { upload, cloudinary } = require("./config/cloudinary");

let app = express();
app.use(express.json());
app.use(cors()); //hi

app.post("/upload",upload.single("file"),(req,res)=> //photo aya backend mai{/upload se},aur phir cloudinary se lena ka with using link,isse upload hoga
{
  let obj={     // photo means obj bheja fe se be tak change hota hain req.body main
    username:req.body.username, //yeh dono given by fe
    caption:req.body.caption,
    file_url:req.file.path,  // given by  multer for cloudinary
    file_name:req.file.name   // this is unique id for photo to delete also
  }
  photoCollec.insertOne(obj) //db photo collec, photos cloudinary pe jayega wo link dega mongo ke backend ko phir kabhibhi delete nhi hota,multer use kargea (oackage.json main hain)
  .then((result)=>res.send(result))
  .catch((err)=>res.send(err))
}
);


app.get("/files",(req,res)=>{
  photoCollec.find().toArray()
  .then((result)=>res.send(result))
  .catch((err)=>res.send(err))
})

app.delete("/delete/:id",(req,res)=>{
  let id=req.params.id;
  let _id= new ObjectId(id);
  photoCollec.findOne({_id})  //promise chaining , 2 baar .then aya hai  har promise ko then catch hota hain aur .findone aur deleteone is promise
  .then((obj)=>{
    cloudinary.uploader.destroy(obj.file_name)
    photoCollec.deleteOne({_id})
  })
  .then((result)=>res.send(result))
  .catch((err)=>res.send(err))
})


let httpServer = http.createServer(app);
let io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {    //io pe connection bheja tho socket mila
  console.log("Connected:", socket.id); //


  //db name = message collection

  socket.on("getHistory",()=>{
    messageCollec.find().toArray()  
    .then((result)=>socket.emit("history",result))
    .catch((err)=>console.log(err))
  })


  socket.on("message", (data) => {
    messageCollec.insertOne(data)
    .then(()=>console.log("saved"))
    .catch((err)=>console.log(err));
    io.emit("message", data);  // Socket.emit means = signal bhejta hai
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

httpServer.listen(3000, () => console.log("Server is alive at 3000"));