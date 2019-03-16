const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const {generateMessage} = require('./utils/message');
const {generateLocationMessage} = require('./utils/message');
const {isRealString} = require('./utils/validation');
const {Users} = require('./utils/users');

const publicPath = path.join(__dirname,'../public');
const port  = process.env.PORT || 3000;

var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();

app.use(express.static(publicPath));

io.on('connection',(socket)=>{
  console.log('User Connected');


  socket.on('join',(params,callback)=>{
    if(!isRealString(params.name)|| !isRealString(params.room)){
      return callback('Name and room name are required');
    }
    socket.join(params.room);
    users.removeUser(socket.id);
    users.addUser(socket.id,params.name,params.room);

    io.to(params.room).emit('updateUserList',users.getUserList(params.room));
    //Leaving a Room
    //socket.leave('Leave this room')

    // io.emit -> io.to(Room Name).emit
    // socket.broadcast.emit -> socket.broadcast.to(roomname).emit
    // socket.emit

    socket.emit('newMessage',generateMessage('Admin','Welcome To the Chat App'));

    socket.broadcast.to(params.room).emit('newMessage',generateMessage('Admin',`${params.name} has joined.`));


    callback();
  });

  socket.on('createMessage',function(message,callback){
    var user = users.getUser(socket.id);
    if(user&&isRealString(message.text)){
      io.to(user.room).emit('newMessage',generateMessage(user.name,message.text));
    }
    // io.emit emits a message to every single connecton
    
    callback('This is from the Server');
  });

  socket.on('createLocationMessage',(coords)=>{
    // console.log(coords);
    var user = users.getUser(socket.id);
    if(user){
      io.to(user.room).emit('newLocationMessage',generateLocationMessage(user.name,coords.latitude,coords.longitude));
    }
  });

  socket.on('disconnect',()=>{
    var user = users.removeUser(socket.id);
    if(user){
      io.to(user.room).emit('updateUserList',users.getUserList(user.room));
      io.to(user.room).emit('newMessage',generateMessage('Admin',`${user.name} has left.`));
    }
    // console.log('User Disconnected',user);
  });
});

server.listen(port,()=>{
  console.log(`Server is up on port ${port}`);
});
