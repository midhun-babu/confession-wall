const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Filter = require('bad-words');
const { addConfession, getConfessions, addEcho, addReaction, deleteExpiredConfessions } = require('./db');

const app = express();
// ... (cors and middleware config)

// ...

// Socket.io
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('post-confession', ({ content, vibe }) => {
        if (!content || content.length > 500) return;

        const validVibes = ['neutral', 'secret', 'love', 'hot', 'regret', 'support'];
        const selectedVibe = validVibes.includes(vibe) ? vibe : 'neutral';

        // Simple profanity filtering
        const cleanContent = filter.isProfane(content) ? filter.clean(content) : content;

        const confession = addConfession(cleanContent, selectedVibe);
        io.emit('new-confession', confession);
    });

    socket.on('post-echo', ({ confessionId, content }) => {
        if (!content || content.length > 200) return;

        const cleanContent = filter.isProfane(content) ? filter.clean(content) : content;
        const echo = addEcho(confessionId, cleanContent);

        io.emit('new-echo', echo);
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
