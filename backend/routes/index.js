import express from 'express';
import apartmentRoutes from './apartmentRoutes.js';
import authRoutes from './authRoutes.js';
import societyRoutes from './societyRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = express.Router();

const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/societies', societyRoutes);
apiRouter.use('/apartments', apartmentRoutes);
apiRouter.use("/chat", chatRoutes);

router.use('/api', apiRouter);

export default router;
