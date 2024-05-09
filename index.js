const express = require("express");
const socket = require("socket.io");
const cors = require('cors')
const app = express();

//Starts the server
app.use(cors())
app.use(express.static("public"));
let server = app.listen(4000, function () {
  console.log("Server is running");
});

let io = socket(server)

io.on('connection',function(socket) {
    console.log(`user connected ${socket.id}`)
    socket.on('join',function(roomName) {
        let rooms = io.sockets.adapter.rooms
        let room = rooms.get(roomName)
        if(room == undefined) {
          socket.join(roomName)
          socket.emit('created')
        }else if(room.size == 1) {
          socket.join(roomName)
          socket.emit('joined')
        }else{
          socket.emit('full')
        }
        console.log(rooms)
    })
    socket.on('ready',function(roomName) {
      console.log('Ready')
      io.to(roomName).emit('ready')
    })
    socket.on('candidate',function(candidate,roomName) {
      console.log('Candidate')
      io.to(roomName).emit('candidate',candidate)
    })
    socket.on('offer',function(offer,roomName) {
      console.log(offer)
      console.log('working')
      io.to(roomName).emit('offer',offer)
    })
    socket.on('answer',function(answer,roomName) {
      console.log('Answer')
      io.to(roomName).emit('answer',answer)
      console.log(answer,'answer')
    })
    socket.on('leave',function(roomName) {
      socket.leave(roomName)
      io.to(roomName).emit('leave')
    })
})



