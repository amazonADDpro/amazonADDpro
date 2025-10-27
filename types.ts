
export enum Status {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
}

export interface ConversationTurn {
  speaker: 'user' | 'model';
  text: string;
}
