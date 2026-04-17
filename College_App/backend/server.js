const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// === General Endpoints ===

// Get all rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const [rooms] = await db.execute('SELECT * FROM Room');
        res.json({ success: true, rooms });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Basic Auth Logic for DEMO (In real apps, use bcrypt and tokens)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM User WHERE email = ? AND password = ?', [email, password]);
        if (rows.length > 0) {
            const user = rows[0];
            res.json({ 
                success: true, 
                user: { id: user.user_id, name: user.name, email: user.email, role: user.role } 
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// === Student Endpoints ===

// Get bookings for a specific user
app.get('/api/bookings/user/:id', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT b.*, r.room_number, r.type as room_type 
            FROM Booking b 
            JOIN Room r ON b.room_id = r.room_id 
            WHERE b.user_id = ?
            ORDER BY b.booking_date DESC
        `, [req.params.id]);
        res.json({ success: true, bookings: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create a booking
app.post('/api/bookings', async (req, res) => {
    const { booking_date, time_slot, user_id, room_id } = req.body;
    try {
        const [existing] = await db.execute(
            'SELECT * FROM Booking WHERE room_id = ? AND booking_date = ? AND time_slot = ? AND status = "Confirmed"',
            [room_id, booking_date, time_slot]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Room already booked for this slot' });
        }

        await db.execute(
            'INSERT INTO Booking (booking_date, time_slot, user_id, room_id, status) VALUES (?, ?, ?, ?, "Confirmed")',
            [booking_date, time_slot, user_id, room_id]
        );

        res.json({ success: true, message: 'Booking successful!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Cancel a booking
app.put('/api/bookings/:id/cancel', async (req, res) => {
    try {
        await db.execute('UPDATE Booking SET status = "Cancelled" WHERE booking_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Booking cancelled' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// === Admin Endpoints ===

// Get all bookings (System-wide)
app.get('/api/admin/bookings', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT b.*, r.room_number, u.name as user_name 
            FROM Booking b 
            JOIN Room r ON b.room_id = r.room_id 
            JOIN User u ON b.user_id = u.user_id
            ORDER BY b.created_at DESC
        `);
        res.json({ success: true, bookings: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update room status
app.put('/api/rooms/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await db.execute('UPDATE Room SET status = ? WHERE room_id = ?', [status, req.params.id]);
        res.json({ success: true, message: 'Room status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin Dashboard Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [rooms] = await db.execute('SELECT COUNT(*) as total, status FROM Room GROUP BY status');
        const [bookings] = await db.execute('SELECT COUNT(*) as count FROM Booking WHERE status = "Confirmed"');
        
        // Mocking some trend data for charts
        const trend = [12, 19, 15, 22, 18, 10]; 
        
        res.json({ 
            success: true, 
            stats: { 
                roomDistribution: rooms, 
                activeBookings: bookings[0].count,
                occupancyTrend: trend 
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
