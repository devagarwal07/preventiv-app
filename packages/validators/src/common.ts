import { z } from "zod";
import {
    Gender,
    OrganizationType,
    UserRole,
    type APIResponse,
    type PaginationMeta
} from "@prevntiv/shared-types";

const enumValues = <T extends string>(obj: Record<string, T>) => Object.values(obj) as [T, ...T[]];

export const IdSchema = z.string().uuid();
export const ISODateSchema = z.string().datetime({ offset: true });
export const EmailSchema = z.string().email();
export const PhoneSchema = z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, "Phone must be in E.164 or international format");

export const UserRoleSchema = z.enum(enumValues(UserRole));
export const OrganizationTypeSchema = z.enum(enumValues(OrganizationType));
export const GenderSchema = z.enum(enumValues(Gender));

export const PaginationMetaSchema = z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
});

export const APIResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
        success: z.boolean(),
        data: dataSchema,
        error: z.string().optional(),
        meta: PaginationMetaSchema.optional()
    });

export type PaginationMetaDTO = z.infer<typeof PaginationMetaSchema> & PaginationMeta;
export type APIResponseDTO<T> = APIResponse<T>;
