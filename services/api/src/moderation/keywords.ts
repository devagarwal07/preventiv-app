export const BLOCKED_KEYWORDS = [
    "self-harm method",
    "buy illegal drugs",
    "hate speech",
    "violent threat",
    "medical scam"
] as const;

export const hasBlockedKeyword = (content: string): boolean => {
    const normalized = content.toLowerCase();
    return BLOCKED_KEYWORDS.some((word) => normalized.includes(word));
};
