"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

let socketRef: Socket | null = null;

export const getSocket = (token?: string): Socket => {
    if (!socketRef) {
        socketRef = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
            transports: ["websocket"],
            auth: {
                token: token || ""
            }
        });
    }

    return socketRef;
};

export const useSocket = (): void => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    useEffect(() => {
        const token = session?.accessToken || session?.user?.accessToken;
        if (!token) return;

        const socket = getSocket(token);

        socket.on("vital:added", () => {
            queryClient.invalidateQueries({ queryKey: ["vitals"] });
        });

        socket.on("alert:new", () => {
            queryClient.invalidateQueries({ queryKey: ["alerts"] });
        });

        socket.on("care-plan:updated", () => {
            queryClient.invalidateQueries({ queryKey: ["care-plans"] });
        });

        return () => {
            socket.off("vital:added");
            socket.off("alert:new");
            socket.off("care-plan:updated");
        };
    }, [queryClient, session?.accessToken, session?.user?.accessToken]);
};
