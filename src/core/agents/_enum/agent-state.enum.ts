export enum AgentState {
  DISABLED = -1,
  PENDING = 0,
  ACTIVE = 1,
}

export const AgentStateList: number[] = Object.keys(AgentState)
  // eslint-disable-next-line
  .filter((k) => typeof AgentState[k as any] === 'number')
  // eslint-disable-next-line
  .map((k) => parseInt(AgentState[k as any], 10))
