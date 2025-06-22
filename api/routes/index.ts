import { Router } from 'express';
import { router as adventureRouter } from './adventure/index.js';
import { router as jsonToolsRouter } from './json-tools/index.js';
import { router as generateContentRouter } from './generate-content/index.js';
import { router as generateImageRouter } from './generate-image/index.js';

export const router = Router();

router.use('/adventure', adventureRouter);
router.use('/json-tools', jsonToolsRouter);
router.use('/generate-content', generateContentRouter);
router.use('/generate-images', generateImageRouter);
