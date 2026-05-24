import api from "@/lib/axios";
import type { Session, SessionTurn } from "@/types/session.types";

interface PaginatedTurns {
  items: SessionTurn[];
  total: number;
  skip: number;
  limit: number;
}

export const SessionService = {
  listAll: async (skip = 0, limit = 50): Promise<Session[]> => {
    const res = await api.get("/api/sessions", { params: { skip, limit } });
    return res.data;
  },

  create: async (config_id: string): Promise<Session> => {
    const res = await api.post("/api/sessions", { config_id });
    return res.data;
  },

  listByConfig: async (config_id: string): Promise<Session[]> => {
    const res = await api.get(`/api/sessions/by-config/${config_id}`);
    return res.data;
  },

  getById: async (session_id: string): Promise<Session> => {
    const res = await api.get(`/api/sessions/${session_id}`);
    return res.data;
  },

  getTurns: async (
    session_id: string,
    skip = 0,
    limit = 20
  ): Promise<PaginatedTurns> => {
    const res = await api.get(`/api/sessions/${session_id}/turns`, {
      params: { skip, limit },
    });
    return res.data;
  },
};
