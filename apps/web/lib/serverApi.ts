const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const parseJson = async <T>(response: Response): Promise<T> => {
    const payload = (await response.json()) as { data?: T };
    return payload.data as T;
};

export const serverApi = {
    async get<T>(path: string): Promise<T | null> {
        try {
            const response = await fetch(`${API_URL}${path}`, {
                cache: "no-store"
            });

            if (!response.ok) {
                return null;
            }

            return parseJson<T>(response);
        } catch {
            return null;
        }
    }
};
