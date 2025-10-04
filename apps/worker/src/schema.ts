import { z } from 'zod';

export const submissionBodySchema = z.object({
  assignmentId: z.string().uuid(),
  repoUrl: z.string().url()
});

export const assignmentQuerySchema = z.object({
  assignmentId: z.string().uuid()
});

export const gradeParamSchema = z.object({
  submissionId: z.string().uuid()
});

export const assignmentBodySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullish(),
  dueAt: z.string().datetime()
});
