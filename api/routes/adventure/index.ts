import { Router } from 'express';
import { router as adventureOutlineRouter } from './adventure-outline/index.js';
import { router as worldDetailsRouter } from './world-details/index.js';
import { router as storySegmentRouter } from './story-segment/index.js';
import { router as customActionRouter } from './custom-action/index.js';
import { router as sceneExamniationRouter } from './scene-examination/index.js';

export const router = Router();

router.use('/outline', adventureOutlineRouter);
router.use('/world-details', worldDetailsRouter);
router.use('/story-segment', storySegmentRouter);
router.use('/custom-action', customActionRouter);
router.use('/scene-examination', sceneExamniationRouter);
