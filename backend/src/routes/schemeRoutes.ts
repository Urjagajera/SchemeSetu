import { Router } from 'express';
import {
  getSchemes,
  getSchemeById,
  getCategories,
  getStates,
  getTags,
  getFeaturedSchemes
} from '../controllers/schemeController.js';

export const schemeRouter = Router();

schemeRouter.get('/schemes', getSchemes);
schemeRouter.get('/schemes/featured', getFeaturedSchemes);
schemeRouter.get('/schemes/:id', getSchemeById);
schemeRouter.get('/categories', getCategories);
schemeRouter.get('/states', getStates);
schemeRouter.get('/tags', getTags);
