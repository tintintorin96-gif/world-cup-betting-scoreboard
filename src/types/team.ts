export type TeamId = string;

export interface Team {
  id: TeamId;
  name: string;
  fifaName?: string;
  emoji?: string;
  aliases: string[];
  group?: string;
}

export interface TeamRegistry {
  teams: Team[];
}
