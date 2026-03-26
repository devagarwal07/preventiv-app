import { z } from "zod";
import {
    CommunityCategory,
    CommunityReactionType,
    type CommunityComment,
    type CommunityPost
} from "@prevntiv/shared-types";
import { IdSchema } from "./common";

const enumValues = <T extends string>(obj: Record<string, T>) => Object.values(obj) as [T, ...T[]];

export const CommunityCategorySchema = z.enum(enumValues(CommunityCategory));
export const CommunityReactionTypeSchema = z.enum(enumValues(CommunityReactionType));

export const CommunityPostSchema = z.object({
    id: IdSchema,
    authorId: IdSchema,
    category: CommunityCategorySchema,
    content: z.string().min(2).max(5000),
    isVerifiedProfessional: z.boolean(),
    createdAt: z.string().datetime({ offset: true })
});

export const CreateCommunityPostSchema = CommunityPostSchema.omit({
    id: true,
    isVerifiedProfessional: true,
    createdAt: true
}).extend({
    optionalAnonymous: z.boolean().optional()
});

export const UpdateCommunityPostSchema = z.object({
    category: CommunityCategorySchema.optional(),
    content: z.string().min(2).max(5000).optional()
});

export const CommunityCommentSchema = z.object({
    id: IdSchema,
    postId: IdSchema,
    authorId: IdSchema,
    content: z.string().min(1).max(2000),
    createdAt: z.string().datetime({ offset: true })
});

export const CreateCommunityCommentSchema = CommunityCommentSchema.omit({
    id: true,
    createdAt: true
});

export const UpdateCommunityCommentSchema = z.object({
    content: z.string().min(1).max(2000).optional()
});

export const CommunityReactionSchema = z.object({
    postId: IdSchema,
    userId: IdSchema,
    type: CommunityReactionTypeSchema
});

export const CreateCommunityReactionSchema = CommunityReactionSchema;
export const UpdateCommunityReactionSchema = z.object({ type: CommunityReactionTypeSchema.optional() });

export type CommunityPostDTO = z.infer<typeof CommunityPostSchema> & CommunityPost;
export type CommunityCommentDTO = z.infer<typeof CommunityCommentSchema> & CommunityComment;
