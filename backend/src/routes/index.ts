// src/routes/index.ts
import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import schemeRoutes from './schemeRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import tagRoutes from './tagRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/schemes', schemeRoutes);
router.use('/categories', categoryRoutes);
router.use('/tags', tagRoutes);

export default router;
