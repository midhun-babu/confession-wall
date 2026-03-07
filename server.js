const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Filter = require('bad-words');
const { addConfession, getConfessions, addReaction, deleteExpiredConfessions } = require('./db');

const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST']
    }
});

const filter = new Filter();
filter.addWords('badword');

// API Routes
app.get('/api/confessions', (req, res) => {
    res.json(getConfessions());
});

// Socket.io
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('post-confession', (content) => {
        if (!content || content.length > 500) return;

        // Simple profanity filtering
        const isProfane = filter.isProfane(content);
        const cleanContent = isProfane ? filter.clean(content) : content;

        const confession = addConfession(cleanContent, isProfane);
        io.emit('new-confession', confession);
    });

    socket.on('react', ({ id, emoji }) => {
        const updatedReactions = addReaction(id, emoji);
        if (updatedReactions) {
            io.emit('update-reactions', { id, reactions: updatedReactions });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Expiry loop (every hour)
setInterval(() => {
    const deleted = deleteExpiredConfessions();
    if (deleted > 0) {
        console.log(`Deleted ${deleted} expired confessions.`);
        io.emit('refresh-feed'); // Tell clients to refresh if data changed significantly
    }
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
