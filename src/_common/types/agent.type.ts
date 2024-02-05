import { Agents } from "~/core/agents/_schemas/agents.schema";

export const ExcludeAgentType: (keyof Agents)[] = ['password']

export type AgentType = Partial<Omit<Agents, 'password'>>
