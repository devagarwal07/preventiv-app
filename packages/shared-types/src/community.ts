export const CommunityCategory = {
    General: "general",
    Nutrition: "nutrition",
    MentalHealth: "mental_health",
    ChronicDisease: "chronic_disease",
    Fitness: "fitness",
    Symptoms: "symptoms"
} as const;

export type CommunityCategory = (typeof CommunityCategory)[keyof typeof CommunityCategory];

export const CommunityReactionType = {
    Helpful: "helpful",
    NotAlone: "not_alone",
    Important: "important"
} as const;

export type CommunityReactionType =
    (typeof CommunityReactionType)[keyof typeof CommunityReactionType];

export interface CommunityPost {
    id: string;
    authorId: string;
    category: CommunityCategory;
    content: string;
    isVerifiedProfessional: boolean;
    createdAt: string;
}

export interface CommunityComment {
    id: string;
    postId: string;
    authorId: string;
    content: string;
    createdAt: string;
}
