import { getApiConfig, FOOTBALL_DATA_CONFIG, type DataSourceStatus } from './apiConfig';

// ============================================================================
// football-data.org API 封装
// 免费层：12个联赛/杯赛，10请求/分钟
// 世界杯代码：WC (FIFA World Cup)
// 文档：https://www.football-data.org/documentation/quickstart
// 注册：http://api.football-data.org/register
// ============================================================================

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

interface FootballDataTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface FootballDataStanding {
  position: number;
  team: FootballDataTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface FootballDataGroup {
  letter: string;
  table: FootballDataStanding[];
}

interface FootballDataCompetition {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string;
}

interface FootballDataMatchesResponse {
  competition: FootballDataCompetition;
  matches: FootballDataMatch[];
}

interface FootballDataStandingsResponse {
  competition: FootballDataCompetition;
  standings: FootballDataGroup[];
}

class FootballDataApi {
  private async fetch<T>(endpoint: string): Promise<{ data: T | null; error: string | null; status: number }> {
    const config = getApiConfig();
    if (!config.footballDataApiKey) {
      return { data: null, error: 'football-data.org API key not configured', status: 401 };
    }

    try {
      const url = `${FOOTBALL_DATA_CONFIG.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: FOOTBALL_DATA_CONFIG.headers(config.footballDataApiKey),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          data: null,
          error: `football-data.org API error: ${response.status} ${errorText}`,
          status: response.status,
        };
      }

      const data = await response.json() as T;
      return { data, error: null, status: response.status };
    } catch (err) {
      return { data: null, error: `Network error: ${err instanceof Error ? err.message : String(err)}`, status: 0 };
    }
  }

  async getMatches(): Promise<{ data: FootballDataMatch[] | null; error: string | null; status: DataSourceStatus }> {
    const result = await this.fetch<FootballDataMatchesResponse>(`/competitions/${FOOTBALL_DATA_CONFIG.competitionCode}/matches`);

    const status: DataSourceStatus = {
      source: 'football-data.org',
      connected: result.status === 200,
      lastFetch: result.status === 200 ? new Date().toISOString() : null,
      error: result.error,
      matchesAvailable: !!result.data && result.data.matches.length > 0,
      oddsAvailable: false, // football-data.org free tier doesn't include odds
    };

    return { data: result.data?.matches || null, error: result.error, status };
  }

  async getStandings(): Promise<{ data: FootballDataGroup[] | null; error: string | null; status: DataSourceStatus }> {
    const result = await this.fetch<FootballDataStandingsResponse>(`/competitions/${FOOTBALL_DATA_CONFIG.competitionCode}/standings`);

    const status: DataSourceStatus = {
      source: 'football-data.org',
      connected: result.status === 200,
      lastFetch: result.status === 200 ? new Date().toISOString() : null,
      error: result.error,
      matchesAvailable: false,
      oddsAvailable: false,
    };

    return { data: result.data?.standings || null, error: result.error, status };
  }

  async getMatch(matchId: number): Promise<{ data: FootballDataMatch | null; error: string | null }> {
    const result = await this.fetch<FootballDataMatch>(`/matches/${matchId}`);
    return { data: result.data, error: result.error };
  }

  async getTeams(): Promise<{ data: FootballDataTeam[] | null; error: string | null }> {
    const result = await this.fetch<{ teams: FootballDataTeam[] }>(`/competitions/${FOOTBALL_DATA_CONFIG.competitionCode}/teams`);
    return { data: result.data?.teams || null, error: result.error };
  }
}

export const footballDataApi = new FootballDataApi();
export type { FootballDataMatch, FootballDataTeam, FootballDataStanding, FootballDataGroup };
