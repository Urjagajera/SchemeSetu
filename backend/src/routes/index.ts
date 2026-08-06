// src/routes/index.ts
import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);

export default router;
