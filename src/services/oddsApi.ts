import { getApiConfig, ODDS_API_CONFIG, API_FOOTBALL_CONFIG, type DataSourceStatus } from './apiConfig';

// ============================================================================
// 赔率 API 聚合层
// 支持多源聚合：The Odds API + API-Football
// 用户可配置任意一个或多个数据源
// 如果均未配置，回退到基于静态数据的推算赔率
// ============================================================================

// The Odds API 格式
interface OddsApiOdd {
  key: string;
  title: string;
  last_update: string;
  markets: {
    key: string;
    last_update: string;
    outcomes: {
      name: string;
      price: number;
    }[];
  }[];
}

interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiOdd[];
}

// API-Football 赔率格式
interface ApiFootballOdd {
  league: { id: number; name: string; country: string };
  fixture: { id: number; timestamp: number; date: string; time: string };
  update: string;
  bookmakers: {
    id: number;
    name: string;
    bets: {
      id: number;
      name: string;
      values: { value: string; odd: string }[];
    }[];
  }[];
}

// 标准化赔率格式（内部使用）
export interface StandardizedOdds {
  source: string;
  sourceName: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  timestamp: string;
  history: { homeWin: number; draw: number; awayWin: number; timestamp: string }[];
}

export interface MatchOddsResponse {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  odds: StandardizedOdds[];
}

// ============================================================================
// The Odds API 封装
// ============================================================================
class TheOddsApi {
  async fetchOdds(): Promise<{ data: OddsApiEvent[] | null; error: string | null; status: DataSourceStatus }> {
    const config = getApiConfig();
    if (!config.oddsApiKey) {
      return {
        data: null,
        error: 'The Odds API key not configured. Get free key at https://theoddsapi.com/',
        status: {
          source: 'the-odds-api',
          connected: false,
          lastFetch: null,
          error: 'API key not configured',
          matchesAvailable: false,
          oddsAvailable: false,
        },
      };
    }

    try {
      const url = new URL(`${ODDS_API_CONFIG.baseUrl}/sports/${ODDS_API_CONFIG.sport}/odds`);
      url.searchParams.set('apiKey', config.oddsApiKey);
      url.searchParams.set('regions', ODDS_API_CONFIG.regions);
      url.searchParams.set('markets', ODDS_API_CONFIG.markets);
      url.searchParams.set('oddsFormat', ODDS_API_CONFIG.oddsFormat);
      url.searchParams.set('dateFormat', 'iso');

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          data: null,
          error: `The Odds API error: ${response.status} ${errorText}`,
          status: {
            source: 'the-odds-api',
            connected: false,
            lastFetch: null,
            error: `HTTP ${response.status}`,
            matchesAvailable: false,
            oddsAvailable: false,
          },
        };
      }

      const data = await response.json() as OddsApiEvent[];
      return {
        data,
        error: null,
        status: {
          source: 'the-odds-api',
          connected: true,
          lastFetch: new Date().toISOString(),
          error: null,
          matchesAvailable: data.length > 0,
          oddsAvailable: data.some(e => e.bookmakers.length > 0),
        },
      };
    } catch (err) {
      return {
        data: null,
        error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
        status: {
          source: 'the-odds-api',
          connected: false,
          lastFetch: null,
          error: err instanceof Error ? err.message : String(err),
          matchesAvailable: false,
          oddsAvailable: false,
        },
      };
    }
  }

  // 将 The Odds API 格式转换为标准化格式
  convertToStandardized(event: OddsApiEvent): StandardizedOdds[] {
    return event.bookmakers.map((bookmaker) => {
      const h2hMarket = bookmaker.markets.find((m) => m.key === 'h2h');
      const outcomes = h2hMarket?.outcomes || [];
      const homeOutcome = outcomes.find((o) => o.name === event.home_team);
      const awayOutcome = outcomes.find((o) => o.name === event.away_team);
      const drawOutcome = outcomes.find((o) => o.name === 'Draw');

      // Note: The Odds API h2h may not include draw for some sports
      // For soccer, we need 1X2. Some regions provide it as 'draw' in h2h
      return {
        source: bookmaker.key,
        sourceName: bookmaker.title,
        homeWin: homeOutcome?.price || 2.0,
        draw: drawOutcome?.price || 3.2,
        awayWin: awayOutcome?.price || 2.0,
        timestamp: bookmaker.last_update || new Date().toISOString(),
        history: [],
      };
    }).filter((o) => o.homeWin > 0 && o.awayWin > 0);
  }
}

// ============================================================================
// API-Football 赔率封装（需要付费 addon）
// ============================================================================
class ApiFootballOddsApi {
  async fetchOdds(fixtureId?: number): Promise<{ data: ApiFootballOdd[] | null; error: string | null; status: DataSourceStatus }> {
    const config = getApiConfig();
    if (!config.apiFootballKey) {
      return {
        data: null,
        error: 'API-Football key not configured. Get key at https://dashboard.api-football.com/',
        status: {
          source: 'api-football',
          connected: false,
          lastFetch: null,
          error: 'API key not configured',
          matchesAvailable: false,
          oddsAvailable: false,
        },
      };
    }

    try {
      const url = new URL(`${API_FOOTBALL_CONFIG.baseUrl}/odds`);
      if (fixtureId) url.searchParams.set('fixture', fixtureId.toString());
      url.searchParams.set('league', API_FOOTBALL_CONFIG.worldCupId.toString());
      url.searchParams.set('season', API_FOOTBALL_CONFIG.season.toString());

      const response = await fetch(url.toString(), {
        headers: API_FOOTBALL_CONFIG.headers(config.apiFootballKey),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          data: null,
          error: `API-Football error: ${response.status} ${errorText}`,
          status: {
            source: 'api-football',
            connected: false,
            lastFetch: null,
            error: `HTTP ${response.status}`,
            matchesAvailable: false,
            oddsAvailable: false,
          },
        };
      }

      const data = await response.json() as { response: ApiFootballOdd[] };
      return {
        data: data.response || null,
        error: null,
        status: {
          source: 'api-football',
          connected: true,
          lastFetch: new Date().toISOString(),
          error: null,
          matchesAvailable: (data.response?.length || 0) > 0,
          oddsAvailable: data.response?.some((o) => o.bookmakers.length > 0) || false,
        },
      };
    } catch (err) {
      return {
        data: null,
        error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
        status: {
          source: 'api-football',
          connected: false,
          lastFetch: null,
          error: err instanceof Error ? err.message : String(err),
          matchesAvailable: false,
          oddsAvailable: false,
        },
      };
    }
  }
}

// ============================================================================
// 聚合层：合并所有赔率源
// ============================================================================
class OddsAggregator {
  private theOddsApi = new TheOddsApi();
  private apiFootballOdds = new ApiFootballOddsApi();

  async fetchAllOdds(): Promise<{
    odds: MatchOddsResponse[];
    errors: string[];
    statuses: DataSourceStatus[];
  }> {
    const oddsMap = new Map<string, StandardizedOdds[]>();
    const errors: string[] = [];
    const statuses: DataSourceStatus[] = [];

    // 1. Try The Odds API
    const oddsResult = await this.theOddsApi.fetchOdds();
    statuses.push(oddsResult.status);
    if (oddsResult.error) {
      errors.push(oddsResult.error);
    }
    if (oddsResult.data) {
      for (const event of oddsResult.data) {
        const key = `${event.home_team} vs ${event.away_team}`;
        const standardized = this.theOddsApi.convertToStandardized(event);
        if (standardized.length > 0) {
          const existing = oddsMap.get(key) || [];
          oddsMap.set(key, [...existing, ...standardized]);
        }
      }
    }

    // 2. Try API-Football (if configured)
    const apiFootballResult = await this.apiFootballOdds.fetchOdds();
    statuses.push(apiFootballResult.status);
    if (apiFootballResult.error) {
      errors.push(apiFootballResult.error);
    }
    if (apiFootballResult.data) {
      for (const odd of apiFootballResult.data) {
        const key = `${odd.fixture.date}`; // Simplified matching
        const bookmakerOdds = odd.bookmakers.map((bm) => {
          const h2hBet = bm.bets.find((b) => b.name === 'Match Winner' || b.name === '1X2');
          const values = h2hBet?.values || [];
          const home = values.find((v) => v.value === 'Home' || v.value === '1');
          const draw = values.find((v) => v.value === 'Draw' || v.value === 'X');
          const away = values.find((v) => v.value === 'Away' || v.value === '2');
          return {
            source: bm.id.toString(),
            sourceName: bm.name,
            homeWin: parseFloat(home?.odd || '2.0'),
            draw: parseFloat(draw?.odd || '3.2'),
            awayWin: parseFloat(away?.odd || '2.0'),
            timestamp: odd.update,
            history: [],
          };
        }).filter((o) => o.homeWin > 0 && o.awayWin > 0);

        const existing = oddsMap.get(key) || [];
        oddsMap.set(key, [...existing, ...bookmakerOdds]);
      }
    }

    const odds: MatchOddsResponse[] = [];
    for (const [key, value] of oddsMap.entries()) {
      odds.push({
        matchId: '', // Will be matched by team names
        homeTeam: key.split(' vs ')[0] || '',
        awayTeam: key.split(' vs ')[1] || '',
        date: '',
        odds: value,
      });
    }

    return { odds, errors, statuses };
  }
}

export const oddsAggregator = new OddsAggregator();
export { TheOddsApi, ApiFootballOddsApi };
