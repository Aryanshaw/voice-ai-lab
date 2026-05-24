import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SessionService } from "@/services/session.service";

export const allSessionsKey = () => ["sessions", "all"] as const;

export function useAllSessions() {
  return useQuery({
    queryKey: allSessionsKey(),
    queryFn: () => SessionService.listAll(),
  });
}

export const configSessionsKey = (config_id: string) =>
  ["sessions", "config", config_id] as const;

export const sessionTurnsKey = (session_id: string) =>
  ["session-turns", session_id] as const;

export function useConfigSessions(config_id: string) {
  return useQuery({
    queryKey: configSessionsKey(config_id),
    queryFn: () => SessionService.listByConfig(config_id),
    enabled: Boolean(config_id),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config_id: string) => SessionService.create(config_id),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: configSessionsKey(session.config_id) });
    },
  });
}

export const sessionKey = (session_id: string) =>
  ["session", session_id] as const;

export function useSession(session_id: string) {
  return useQuery({
    queryKey: sessionKey(session_id),
    queryFn: () => SessionService.getById(session_id),
    enabled: Boolean(session_id),
  });
}

export function useSessionTurns(
  session_id: string | null,
  opts?: { skip?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...sessionTurnsKey(session_id ?? ""), opts?.skip ?? 0, opts?.limit ?? 20],
    queryFn: () => SessionService.getTurns(session_id!, opts?.skip, opts?.limit),
    enabled: Boolean(session_id),
    select: (data) => data.items,
  });
}
