import { CHANNELS, channelOn, type ChannelKey, type ChannelSettings } from "./channels";

// Where a vacancy is live (F9). Salary is optional (21.11.2026) and no longer blocks any channel.

export type ChannelState = "online" | "offline" | "off" | "customerOff" | "setup";
export type ChannelStatus = { key: ChannelKey | "jobboard"; name: string; state: ChannelState };

export function channelStatuses(v: { status: string; organizationId: string }, s: ChannelSettings): ChannelStatus[] {
  const live = v.status === "active";
  return [
    { key: "jobboard", name: "recrewted-Jobbörse", state: live ? "online" : "offline" },
    ...CHANNELS.map((c): ChannelStatus => {
      if (!c.ready) return { key: c.key, name: c.name, state: "setup" };
      if (!s.global[c.key]) return { key: c.key, name: c.name, state: "off" };
      if (!channelOn(s, c.key, v.organizationId)) return { key: c.key, name: c.name, state: "customerOff" };
      return { key: c.key, name: c.name, state: live ? "online" : "offline" };
    }),
  ];
}
