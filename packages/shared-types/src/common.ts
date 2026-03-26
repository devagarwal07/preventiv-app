export const UserRole = {
    Patient: "patient",
    Doctor: "doctor",
    Dietician: "dietician",
    Physiotherapist: "physiotherapist",
    OrgAdmin: "org_admin",
    PlatformAdmin: "platform_admin"
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrganizationType = {
    Hospital: "hospital",
    Clinic: "clinic"
} as const;

export type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType];

export const Gender = {
    Male: "male",
    Female: "female",
    Other: "other",
    PreferNotToSay: "prefer_not_to_say"
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface APIResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    meta?: PaginationMeta;
}
