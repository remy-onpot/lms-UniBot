import { z } from 'zod';

export const quizConfigSchema = z.object({
  documentText: z.string().min(50, 'Document text too short'),
  topic: z.string().min(1).max(100),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  numQuestions: z.number().int().min(1).max(20),
  type: z.string().default('Multiple Choice'),
});

export const assignmentSubmissionSchema = z.object({
  assignmentTitle: z.string().min(1),
  assignmentDescription: z.string().min(1),
  studentText: z.string().min(20, 'Submission too short'),
  maxPoints: z.number().int().min(1).max(1000),
});