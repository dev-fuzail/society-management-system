import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();
const app = express();

// Middlewares
app.use(express.json());

app.use(cors({
  origin: '*', // open for all during development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// DB connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 8001;

app.get('/', (req, res) => {
  res.send('✅ Backend reachable');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
