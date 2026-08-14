import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { createApiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Initialize Database schema
await initDb();

// Register API Routes
app.use('/api', createApiRouter(io));

// Serve static frontend files in production if needed
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// SPA wildcard fallback route for production domain deployment
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Socket.IO signaling and real-time events
io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  // User room registration
  socket.on('register_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} registered to room user_${userId}`);
  });

  // Call room join
  socket.on('join_call_room', (callId) => {
    socket.join(`call_${callId}`);
    console.log(`Socket joined call room call_${callId}`);
  });

  // WebRTC signaling passthrough
  socket.on('webrtc_offer', (data) => {
    socket.to(`call_${data.callId}`).emit('webrtc_offer', data);
  });

  socket.on('webrtc_answer', (data) => {
    socket.to(`call_${data.callId}`).emit('webrtc_answer', data);
  });

  socket.on('webrtc_ice_candidate', (data) => {
    socket.to(`call_${data.callId}`).emit('webrtc_ice_candidate', data);
  });

  socket.on('disconnect', () => {
    console.log('Socket client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Friendly Dating Server running on http://localhost:${PORT}`);
});
