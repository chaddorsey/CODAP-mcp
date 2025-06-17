import { z } from "zod";

/**
 * Session creation request schema
 */
export const CreateSessionRequestSchema = z.object({});

/**
 * Session creation response schema
 */
export const CreateSessionResponseSchema = z.object({
  code: z.string().regex(/^[A-Z2-7]{8}$/, "Invalid session code format"),
  ttl: z.number().int().positive(),
  expiresAt: z.string().datetime()
});

/**
 * Tool request schema
 */
export const ToolRequestSchema = z.object({
  code: z.string().regex(/^[A-Z2-7]{8}$/, "Invalid session code format"),
  id: z.string().min(1, "Request ID is required"),
  tool: z.string().min(1, "Tool name is required"),
  args: z.record(z.any()).optional().default({})
});

/**
 * Tool response schema
 */
export const ToolResponseSchema = z.object({
  code: z.string().regex(/^[A-Z2-7]{8}$/, "Invalid session code format"),
  id: z.string().min(1, "Request ID is required"),
  result: z.object({
    content: z.array(z.object({
      type: z.literal("text"),
      text: z.string()
    }))
  })
});

/**
 * Session data stored in KV
 */
export const SessionDataSchema = z.object({
  code: z.string(),
  createdAt: z.string().datetime(),
  ttl: z.number().int().positive(),
  lastActivity: z.string().datetime()
});

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional()
}); 

