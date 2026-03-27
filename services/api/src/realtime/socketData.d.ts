import "socket.io";

declare module "socket.io" {
    interface SocketData {
        user?: {
            id: string;
            role: string;
            orgId?: string | null;
        };
    }
}
