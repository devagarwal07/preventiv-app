import { z } from "zod";
import {
    type OrgMembership,
    type Organization,
    type ProfessionalVerification,
    type User,
    type UserProfile
} from "@prevntiv/shared-types";
import {
    EmailSchema,
    GenderSchema,
    IdSchema,
    OrganizationTypeSchema,
    PhoneSchema,
    UserRoleSchema
} from "./common";

export const UserSchema = z.object({
    id: IdSchema,
    email: EmailSchema,
    phone: PhoneSchema.nullish(),
    role: UserRoleSchema,
    isVerified: z.boolean(),
    createdAt: z.string().datetime({ offset: true })
});

export const CreateUserSchema = z.object({
    email: EmailSchema,
    phone: PhoneSchema.optional(),
    role: UserRoleSchema,
    name: z.string().min(2).max(120),
    password: z.string().min(8).max(128)
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

export const UserProfileSchema = z.object({
    userId: IdSchema,
    name: z.string().min(2).max(120),
    dob: z.string().date().nullish(),
    gender: GenderSchema.nullish(),
    avatarUrl: z.string().url().nullish(),
    address: z.string().max(400).nullish()
});

export const CreateUserProfileSchema = UserProfileSchema.omit({ userId: true });
export const UpdateUserProfileSchema = CreateUserProfileSchema.partial();

export const ProfessionalVerificationSchema = z.object({
    userId: IdSchema,
    licenseNo: z.string().min(4).max(120),
    specialization: z.string().max(120).nullish(),
    verifiedAt: z.string().datetime({ offset: true }).nullish()
});

export const CreateProfessionalVerificationSchema = ProfessionalVerificationSchema.omit({
    verifiedAt: true
});
export const UpdateProfessionalVerificationSchema = CreateProfessionalVerificationSchema.partial();

export const OrganizationSchema = z.object({
    id: IdSchema,
    name: z.string().min(2).max(180),
    type: OrganizationTypeSchema,
    address: z.string().max(400).nullish(),
    adminUserId: IdSchema
});

export const CreateOrganizationSchema = OrganizationSchema.omit({ id: true });
export const UpdateOrganizationSchema = CreateOrganizationSchema.partial();

export const OrgMembershipSchema = z.object({
    orgId: IdSchema,
    userId: IdSchema,
    role: UserRoleSchema
});

export const CreateOrgMembershipSchema = OrgMembershipSchema;
export const UpdateOrgMembershipSchema = OrgMembershipSchema.partial();

export type UserDTO = z.infer<typeof UserSchema> & User;
export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;
export type UserProfileDTO = z.infer<typeof UserProfileSchema> & UserProfile;
export type CreateUserProfileDTO = z.infer<typeof CreateUserProfileSchema>;
export type UpdateUserProfileDTO = z.infer<typeof UpdateUserProfileSchema>;
export type ProfessionalVerificationDTO = z.infer<typeof ProfessionalVerificationSchema> &
    ProfessionalVerification;
export type OrganizationDTO = z.infer<typeof OrganizationSchema> & Organization;
export type OrgMembershipDTO = z.infer<typeof OrgMembershipSchema> & OrgMembership;
