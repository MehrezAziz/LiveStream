const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000","http://localhost:3001"], // Allow requests from the viewer app
        methods: ["GET", "POST"],
        credentials: true,
    }
});

const users = {}; // To keep track of users and their streams

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    socket.on('start-call', (key) => {
        users[key] = socket.id; // Save the caller's socket ID with the key
        console.log(`Call started with key: ${key} by user ${socket.id}`);
    });

    socket.on('signal', (data) => {
        // Forward the signaling data to the intended recipient
        socket.to(data.to).emit('signal', { signal: data.signal, from: socket.id });
    });

    socket.on('join-viewer', ({ key }) => {
        const callerId = users[key]; // Get the caller's socket ID from the key
        console.log(`Viewer attempting to join with key: ${key}`);
        console.log('Current users:', users); // Log current users
        if (callerId) {
            socket.join(callerId); // Join the room of the caller
            console.log(`Viewer ${socket.id} joined the call with key: ${key}`);
            socket.to(callerId).emit('viewer-joined', { viewerId: socket.id });
        } else {
            socket.emit('error', 'Invalid key or no active call with this key.');
        }
    });

    socket.on('disconnect', () => {
        // Clean up on disconnect
        Object.keys(users).forEach((key) => {
            if (users[key] === socket.id) {
                delete users[key];
            }
        });
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
server.listen(4000, () => {
    console.log('Socket.io server running on port 4000');
});