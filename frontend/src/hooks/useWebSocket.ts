"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface SystemEvent {
    id: string;
    event_type: "batch_registered" | "custody_handoff" | "telemetry_logged" | "excursion_alert" | "batch_quarantined" | "batch_recalled";
    batch_id?: string;
    timestamp: string;
    payload: any;
}

export interface UseWebSocketReturn {
    status: "connecting" | "connected" | "disconnected" | "error";
    events: SystemEvent[];
    latestAlert: SystemEvent | null;
    clearEvents: () => void;
    reconnect: () => void;
}

export function useWebSocket(customUrl?: string): UseWebSocketReturn {
    const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [latestAlert, setLatestAlert] = useState<SystemEvent | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

    const getWsUrl = useCallback(() => {
        if (customUrl) return customUrl;
        const envUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
        if (envUrl) return envUrl;
        if (typeof window !== "undefined") {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const host = window.location.hostname;
            return `${protocol}//${host}:8080/ws`;
        }
        return "ws://localhost:8080/ws";
    }, [customUrl]);

    const connect = useCallback(() => {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        setStatus("connecting");
        const url = getWsUrl();

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus("connected");
                console.log("[WebSocket] Connected to event stream:", url);
            };

            ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    const systemEvt: SystemEvent = {
                        id: parsed.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        event_type: parsed.event_type || "batch_registered",
                        batch_id: parsed.batch_id,
                        timestamp: parsed.timestamp || new Date().toISOString(),
                        payload: parsed.payload || parsed,
                    };

                    setEvents((prev) => [systemEvt, ...prev.slice(0, 49)]);

                    if (systemEvt.event_type === "excursion_alert" || systemEvt.event_type === "batch_quarantined" || systemEvt.event_type === "batch_recalled") {
                        setLatestAlert(systemEvt);
                    }
                } catch (e) {
                    console.warn("[WebSocket] Failed to parse message:", event.data);
                }
            };

            ws.onerror = () => {
                setStatus("error");
            };

            ws.onclose = () => {
                setStatus("disconnected");
                wsRef.current = null;
                reconnectTimerRef.current = setTimeout(() => {
                    connect();
                }, 5000);
            };
        } catch (e) {
            setStatus("error");
        }
    }, [getWsUrl]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const clearEvents = useCallback(() => {
        setEvents([]);
        setLatestAlert(null);
    }, []);

    return {
        status,
        events,
        latestAlert,
        clearEvents,
        reconnect: connect,
    };
}
