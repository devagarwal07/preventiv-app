import type { Gender, OrganizationType, UserRole } from "./common";

export interface User {
    id: string;
    email: string;
    phone?: string | null;
    role: UserRole;
    isVerified: boolean;
    createdAt: string;
}

export interface UserProfile {
    userId: string;
    name: string;
    dob?: string | null;
    gender?: Gender | null;
    avatarUrl?: string | null;
    address?: string | null;
}

export interface ProfessionalVerification {
    userId: string;
    licenseNo: string;
    specialization?: string | null;
    verifiedAt?: string | null;
}

export interface Organization {
    id: string;
    name: string;
    type: OrganizationType;
    address?: string | null;
    adminUserId: string;
}

export interface OrgMembership {
    orgId: string;
    userId: string;
    role: UserRole;
}
