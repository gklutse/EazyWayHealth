const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const pgp = require('pg-promise')();

dotenv.config();

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json());

const db = pgp({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test endpoint
app.get('/test', (req, res) => {
    res.send({ message: 'Server is running' });
});

//Start of Map
// Dummy ambulance data
const ambulances = [
    { id: 1, latitude: 12.9716, longitude: 77.5946 }, // Example coordinates
    { id: 2, latitude: 12.9719, longitude: 77.5938 },
  ];
  
  app.post('/request-ambulance', (req, res) => {
    const { latitude, longitude } = req.body;
  
    // Find the nearest ambulance
    let nearestAmbulance = null;
    let minDistance = Number.MAX_VALUE;
  
    ambulances.forEach(ambulance => {
      const distance = getDistanceFromLatLonInKm(latitude, longitude, ambulance.latitude, ambulance.longitude);
      if (distance < minDistance) {
        nearestAmbulance = ambulance;
        minDistance = distance;
      }
    });
  
    if (nearestAmbulance) {
      res.send({ ambulanceLocation: nearestAmbulance });
    } else {
      res.status(404).send({ error: 'No ambulance available' });
    }
  });
  
  // Helper function to calculate distance between two coordinates (Haversine formula)
  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }
  
  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
  
 //End of Map

app.post('/signup', async (req, res) => {
    const { email, password, name, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.none('INSERT INTO users(email, password, name, role) VALUES($1, $2, $3, $4)', [email, hashedPassword, name, role]);
        res.status(201).send({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error signing up:', error);
        res.status(500).send({ error: 'Error signing up' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
        console.log('User fetched from DB:', user);
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.send({ token });
        } else {
            res.status(400).send({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send({ error: 'Error logging in' });
    }
});
``

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
        if (user) {
            res.status(200).send({ message: 'Password reset link sent to your email.' });
        } else {
            res.status(400).send({ error: 'User not found.' });
        }
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).send({ error: 'Error resetting password' });
    }
});

app.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.none('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
        res.status(200).send({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).send({ error: 'Error resetting password' });
    }
});

app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    next();
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});