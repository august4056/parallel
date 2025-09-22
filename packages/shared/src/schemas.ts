import { z } from 'zod';

export const userRoleEnum = z.enum(['STUDENT', 'INSTRUCTOR']);
export type UserRole = z.infer<typeof userRoleEnum>;

export const submissionStatusEnum = z.enum(['QUEUED', 'RUNNING', 'PASSED', 'FAILED']);
export type SubmissionStatus = z.infer<typeof submissionStatusEnum>;

export const userSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: userRoleEnum,
    createdAt: z.string().datetime()
  })
  .strict();
export type User = z.infer<typeof userSchema>;

export const assignmentSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().default(''),
    dueAt: z.string().datetime(),
    createdBy: z.string().uuid(),
    createdAt: z.string().datetime()
  })
  .strict();
export type Assignment = z.infer<typeof assignmentSchema>;

export const submissionSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    assignmentId: z.string().uuid(),
    repoUrl: z.string().url(),
    status: submissionStatusEnum,
    score: z.number().nullable(),
    feedback: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict();
export type Submission = z.infer<typeof submissionSchema>;

export const gradeSchema = z
  .object({
    id: z.string().uuid(),
    submissionId: z.string().uuid(),
    rubric: z.unknown(),
    totalScore: z.number(),
    gradedAt: z.string().datetime()
  })
  .strict();
export type Grade = z.infer<typeof gradeSchema>;

export const createSubmissionInputSchema = z
  .object({
    assignmentId: z.string().uuid(),
    repoUrl: z.string().url()
  })
  .strict();
export type CreateSubmissionInput = z.infer<typeof createSubmissionInputSchema>;

export const createAssignmentInputSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueAt: z.string().datetime()
  })
  .strict();
export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;
