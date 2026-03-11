const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Filter = require('bad-words');
const { addConfession, getConfessions, addReaction, reportConfession, deleteExpiredConfessions } = require('./db');

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
    const { search, tag } = req.query;
    let confessions = getConfessions();

    if (search) {
        const query = search.toLowerCase();
        confessions = confessions.filter(c => c.content.toLowerCase().includes(query));
    }

    if (tag) {
        // Basic tagging logic (looking for #tag in content)
        confessions = confessions.filter(c => c.content.includes(`#${tag}`));
    }

    res.json(confessions);
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

    socket.on('report-confession', (id) => {
        const count = reportConfession(id);
        if (count !== null) {
            if (count >= 5) {
                // If highly reported, tell all clients to refresh and hide it
                io.emit('refresh-feed');
            } else {
                // Just update that specific confession's reported status for UI visibility
                io.emit('confession-reported', id);
            }
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
