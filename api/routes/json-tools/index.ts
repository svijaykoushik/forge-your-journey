import { Router } from 'express';
import { router as fixJsonRouter } from './fix-json/index.js';

export const router = Router();

router.use('/fix', fixJsonRouter);
