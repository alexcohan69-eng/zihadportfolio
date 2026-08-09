/**
 * Shared Zod schemas for the client auth forms (login/register) and their
 * matching API routes. Keeping one schema per action means the client-side
 * validation message and the server-side rejection message can never drift
 * apart.
 */
import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .email('Enter a valid email address.')
  .toLowerCase()

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
})

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(80, 'Full name is too long.'),
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password is too long.')
    .regex(/[a-z]/, 'Password needs at least one lowercase letter.')
    .regex(/[A-Z0-9]/, 'Password needs at least one uppercase letter or number.'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

/** Flattens the first Zod issue per field into a simple `{ field: message }` map for form UIs. */
export function firstFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? '_form'
    if (!out[key]) out[key] = issue.message
  }
  return out
}
