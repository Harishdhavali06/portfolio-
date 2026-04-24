/**
 * ============================================
 * HARISH PORTFOLIO — Backend Server
 * Express + MongoDB for Contact Form
 * ============================================
 *
 * Usage:
 *   1. Install dependencies:  npm install
 *   2. (Optional) Create a .env file with MONGO_URI
 *   3. Start the server:      npm start
 *   4. Open in browser:       http://localhost:3000
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Load environment variables (optional .env file)
try { require('dotenv').config(); } catch (e) { /* dotenv is optional */ }

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// ──────────────────────────────────────────
// MongoDB Connection
// ──────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/harish_portfolio';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.warn('⚠️  MongoDB not available — contact form will work in demo mode.');
    console.warn('   To enable persistence, start MongoDB and set MONGO_URI in .env');
    console.warn('   Error:', err.message);
  });

// ──────────────────────────────────────────
// Contact Message Schema
// ──────────────────────────────────────────
const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Contact = mongoose.model('Contact', contactSchema);

// ──────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────

/**
 * POST /api/contact
 * Save a new contact message to MongoDB
 */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Server-side validation
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'All fields (name, email, message) are required.'
      });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Demo mode — accept the message but don't persist
      console.log('📨 Contact received (demo mode):', { name, email, message: message.substring(0, 50) + '...' });
      return res.status(200).json({
        success: true,
        message: 'Message received! (Running in demo mode — MongoDB not connected)',
        demo: true
      });
    }

    // Save to MongoDB
    const contact = new Contact({ name, email, message });
    await contact.save();

    console.log('📨 New contact saved:', { name, email });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully!'
    });

  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }

    console.error('❌ Contact save error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

/**
 * GET /api/contacts
 * Retrieve all contact messages (admin endpoint)
 */
app.get('/api/contacts', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'MongoDB not connected.' });
    }

    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ count: contacts.length, contacts });
  } catch (err) {
    console.error('❌ Fetch contacts error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ──────────────────────────────────────────
// Catch-all: Serve index.html for SPA routing
// ──────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ──────────────────────────────────────────
// Error handling middleware
// ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ──────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🚀 Harish Portfolio Server Running     ║
  ║                                          ║
  ║   Local:  http://localhost:${PORT}          ║
  ║                                          ║
  ║   Endpoints:                             ║
  ║   POST /api/contact  — Submit message    ║
  ║   GET  /api/contacts — View messages     ║
  ╚══════════════════════════════════════════╝
  `);
});
