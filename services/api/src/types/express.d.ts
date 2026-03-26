import type { UserRole } from "@prevntiv/shared-types";

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            user?: {
                id: string;
                role: UserRole;
                orgId?: string | null;
            };
        }
    }
}

export { };
