import { z } from "zod";

/**
 * Validates Brazilian CPF using checksum algorithm
 */
export function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, "");
  
  // Check length
  if (cleanCPF.length !== 11) return false;
  
  // Check for known invalid CPFs (all same digits)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cleanCPF[9])) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  if (checkDigit !== parseInt(cleanCPF[10])) return false;
  
  return true;
}

// ============= Auth Schemas =============

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email muito longo"),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(128, "Senha muito longa"),
});

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  email: z
    .string()
    .trim()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email muito longo"),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(128, "Senha muito longa"),
});

export const signupPaymentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  email: z
    .string()
    .trim()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email muito longo"),
  cpf: z
    .string()
    .trim()
    .min(1, "CPF é obrigatório")
    .refine(isValidCPF, "CPF inválido"),
  phone: z
    .string()
    .trim()
    .min(10, "Telefone inválido")
    .max(15, "Telefone inválido")
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Formato de telefone inválido: (00) 00000-0000"),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(128, "Senha muito longa"),
});

// ============= CRM Schemas =============

export const emailSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  primary: z.boolean(),
});

export const phoneSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, "Telefone é obrigatório")
    .max(20, "Telefone muito longo")
    .regex(/^\+?[\d\s()-]+$/, "Formato de telefone inválido"),
  type: z.enum(["mobile", "work", "home"]),
});

export const contactSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome muito longo"),
  last_name: z
    .string()
    .trim()
    .max(100, "Sobrenome muito longo")
    .optional(),
  account_id: z.string().uuid().optional().or(z.literal("")),
  position: z
    .string()
    .trim()
    .max(100, "Cargo muito longo")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(5000, "Notas muito longas (máximo 5000 caracteres)")
    .optional(),
  tags: z.string().trim().max(500, "Tags muito longas").optional(),
});

// ============= AI Edge Function Schemas =============

export const generateAppSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, "Prompt deve ter pelo menos 10 caracteres")
    .max(5000, "Prompt muito longo (máximo 5000 caracteres)"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().max(10000),
      })
    )
    .max(50, "Histórico muito longo")
    .optional(),
});

export const suggestFeaturesSchema = z.object({
  projectDescription: z
    .string()
    .trim()
    .min(10, "Descrição deve ter pelo menos 10 caracteres")
    .max(2000, "Descrição muito longa (máximo 2000 caracteres)")
    .optional(),
  fullContext: z
    .string()
    .trim()
    .max(10000, "Contexto muito longo (máximo 10000 caracteres)")
    .optional(),
});

export const googleBusinessSearchSchema = z.object({
  location: z
    .string()
    .trim()
    .min(2, "Localização deve ter pelo menos 2 caracteres")
    .max(200, "Localização muito longa"),
  businessType: z
    .string()
    .trim()
    .min(2, "Tipo de negócio deve ter pelo menos 2 caracteres")
    .max(200, "Tipo de negócio muito longo"),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SignupPaymentInput = z.infer<typeof signupPaymentSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type PhoneInput = z.infer<typeof phoneSchema>;
export type GenerateAppInput = z.infer<typeof generateAppSchema>;
export type SuggestFeaturesInput = z.infer<typeof suggestFeaturesSchema>;
export type GoogleBusinessSearchInput = z.infer<typeof googleBusinessSearchSchema>;
