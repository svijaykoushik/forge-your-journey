import { Router } from 'express';
import { router as customActionEvaluationRouter } from './evaluation/index.js';
import { router as customActionOutcomeRouter } from './outcome/index.js';

export const router = Router();

router.use('/evaluation', customActionEvaluationRouter);
router.use('/outcome', customActionOutcomeRouter);
