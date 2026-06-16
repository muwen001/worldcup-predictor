import type { Match, Team } from '../types';
import { footballDataApi } from './footballDataApi';
import { oddsAggregator, type MatchOddsResponse } from './oddsApi';
import { cacheManager } from './cacheManager';
import { getAllMatches, updateMatchWithResult, updateMatchWithOdds } from './staticData';
import { hasAnyApiKey, getDefaultSourceStatus, type DataSourceStatus } from './apiConfig';
import { fetchCctvMatches } from './cctvApi';

// ============================================================================
// 统一数据服务层
// 整合所有数据源：CCTV实时数据 + API实时赔率 + 本地缓存 + 静态数据 fallback
// 优先级：
// 1. CCTV体育API（免费，无需API key，提供真实赛程和结果）
// 2. 实时赔率API（如果配置了API key）
// 3. 本地缓存（如果未过期）
// 4. 静态数据（始终可用，作为保底）
// ============================================================================

export interface DataFetchResult {
  matches: Match[];
  sourceStatus: DataSourceStatus[];
  errors: string[];
  isRealTime: boolean;
  lastUpdated: string;
}

function scoresEqual(
  a: { home: number; away: number } | undefined,
  b: { home: number; away: number } | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.home === b.home && a.away === b.away;
}

class DataService {
  // 核心方法：获取所有比赛数据
  async fetchMatches(): Promise<DataFetchResult> {
    const now = new Date();
    const errors: string[] = [];
    const sourceStatus: DataSourceStatus[] = getDefaultSourceStatus();
    let matches: Match[] = [];
    let isRealTime = false;

    // 1. 优先从CCTV获取真实赛程和结果（免费，无需API key）
    const cctvResult = await fetchCctvMatches();
    if (cctvResult.connected && cctvResult.matches.length > 0) {
      matches = cctvResult.matches;
      if (cctvResult.errors.length > 0) {
        errors.push(...cctvResult.errors);
      }
      // 更新CCTV source status
      const cctvIdx = sourceStatus.findIndex(s => s.source === 'cctv-sports');
      if (cctvIdx >= 0) {
        sourceStatus[cctvIdx] = {
          ...sourceStatus[cctvIdx],
          connected: true,
          lastFetch: new Date().toISOString(),
          matchesAvailable: true,
          oddsAvailable: false, // CCTV没有赔率数据
          error: cctvResult.errors.length > 0 ? cctvResult.errors[0] : null,
        };
      }
      isRealTime = true;
    }

    // 2. 如果有API key，尝试获取实时赔率
    if (hasAnyApiKey()) {
      try {
        const apiResult = await this.fetchFromApis();
        if (apiResult.matches.length > 0 && matches.length === 0) {
          // CCTV失败了，用API数据
          matches = apiResult.matches;
        }
        // 更新sourceStatus
        for (const status of apiResult.sourceStatus) {
          const idx = sourceStatus.findIndex(s => s.source === status.source);
          if (idx >= 0) sourceStatus[idx] = status;
        }
        // 合并赔率数据
        if (apiResult.oddsData.length > 0) {
          matches = this.mergeOddsIntoMatches(matches, apiResult.oddsData);
        }
        errors.push(...apiResult.errors);
        if (apiResult.isRealTime) isRealTime = true;
      } catch (err) {
        errors.push(`API fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. 如果CCTV和API都没数据，使用缓存
    if (matches.length === 0) {
      const cachedMatches = cacheManager.getMatchesCache<Match[]>();
      if (cachedMatches && cachedMatches.length > 0) {
        matches = cachedMatches;
        const cachedStatus = cacheManager.getSourceStatusCache();
        if (cachedStatus) {
          sourceStatus.splice(0, sourceStatus.length, ...cachedStatus);
        }
      }
    }

    // 4. 如果仍无数据，使用静态数据
    if (matches.length === 0) {
      matches = getAllMatches();
      const staticIdx = sourceStatus.findIndex(s => s.source === 'static-cache');
      if (staticIdx >= 0) {
        sourceStatus[staticIdx] = {
          ...sourceStatus[staticIdx],
          connected: true,
          lastFetch: new Date().toISOString(),
          matchesAvailable: true,
          oddsAvailable: true,
        };
      }
    }

    // 5. 合并静态赔率（CCTV没有赔率，需要从静态数据补充）
    const staticMatches = getAllMatches();
    for (let i = 0; i < matches.length; i++) {
      if (matches[i].odds.length === 0) {
        const staticMatch = staticMatches.find(
          m => m.homeTeam.id === matches[i].homeTeam.id &&
               m.awayTeam.id === matches[i].awayTeam.id &&
               m.date === matches[i].date
        );
        if (staticMatch) {
          matches[i] = { ...matches[i], odds: staticMatch.odds };
        }
      }
    }

    // 6. 对于CCTV未覆盖的比赛（淘汰赛），补充静态数据并模拟结果
    const cctvMatchIds = new Set(matches.map(m => m.id));
    const missingMatches = staticMatches.filter(m => !cctvMatchIds.has(m.id));
    for (const m of missingMatches) {
      matches.push(updateMatchWithResult(m, now));
    }

    // 7. 对于CCTV覆盖但CCTV未提供结果的upcoming比赛，不再模拟
    // CCTV数据中upcoming的比赛确实没有结果，保持原样
    // 只对非CCTV覆盖的比赛（淘汰赛）使用时间模拟

    // 8. 缓存数据
    if (isRealTime) {
      cacheManager.setMatchesCache(matches, 'api');
      cacheManager.setSourceStatusCache(sourceStatus);
    }

    // 按日期排序
    matches.sort((a, b) => {
      const dtA = new Date(a.date + 'T' + a.time);
      const dtB = new Date(b.date + 'T' + b.time);
      return dtA.getTime() - dtB.getTime();
    });

    return {
      matches,
      sourceStatus,
      errors,
      isRealTime,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 从赔率API获取数据
  private async fetchFromApis(): Promise<{
    matches: Match[];
    errors: string[];
    sourceStatus: DataSourceStatus[];
    isRealTime: boolean;
    oddsData: MatchOddsResponse[];
  }> {
    const errors: string[] = [];
    const sourceStatus: DataSourceStatus[] = [];
    let matches: Match[] = [];
    let isRealTime = false;
    let oddsData: MatchOddsResponse[] = [];

    // 尝试 football-data.org
    const fdResult = await footballDataApi.getMatches();
    sourceStatus.push(fdResult.status);
    if (fdResult.error) {
      errors.push(fdResult.error);
    }
    if (fdResult.data && fdResult.data.length > 0) {
      matches = this.convertFootballDataMatches(fdResult.data);
      isRealTime = true;
    }

    // 尝试获取赔率
    const oddsResult = await oddsAggregator.fetchAllOdds();
    sourceStatus.push(...oddsResult.statuses);
    if (oddsResult.errors.length > 0) {
      errors.push(...oddsResult.errors);
    }
    if (oddsResult.odds.length > 0) {
      oddsData = oddsResult.odds;
      isRealTime = true;
    }

    return { matches, errors, sourceStatus, isRealTime, oddsData };
  }

  // 将 football-data.org 格式转换为内部 Match 格式
  private convertFootballDataMatches(apiMatches: unknown[]): Match[] {
    const rawMatches = apiMatches as Array<{
      id: number;
      utcDate: string;
      status: string;
      stage: string;
      group: string | null;
      homeTeam: { name: string };
      awayTeam: { name: string };
      score: {
        winner: string | null;
        fullTime: { home: number | null; away: number | null };
      };
    }>;

    const staticMatches = getAllMatches();
    const converted: Match[] = [];

    for (const apiMatch of rawMatches) {
      const matchDate = new Date(apiMatch.utcDate);
      const dateStr = matchDate.toISOString().split('T')[0];
      const timeStr = matchDate.toTimeString().slice(0, 5);

      const homeTeam = this.findTeamByApiName(apiMatch.homeTeam.name);
      const awayTeam = this.findTeamByApiName(apiMatch.awayTeam.name);

      if (!homeTeam || !awayTeam) continue;

      const staticMatch = staticMatches.find(
        m => m.homeTeam.id === homeTeam.id && m.awayTeam.id === awayTeam.id && m.date === dateStr
      );

      const matchId = staticMatch?.id || `api_${apiMatch.id}`;
      const stage = this.mapStage(apiMatch.stage || 'GROUP_STAGE');
      const status = this.mapStatus(apiMatch.status);

      converted.push({
        id: matchId,
        homeTeam,
        awayTeam,
        date: dateStr,
        time: timeStr,
        stage,
        group: apiMatch.group || undefined,
        odds: staticMatch?.odds || [],
        status,
        result: apiMatch.score.winner ? this.mapResult(apiMatch.score.winner) : undefined,
        score: apiMatch.score.fullTime.home !== null && apiMatch.score.fullTime.away !== null
          ? { home: apiMatch.score.fullTime.home, away: apiMatch.score.fullTime.away }
          : undefined,
      });
    }

    return converted;
  }

  private findTeamByApiName(apiName: string): Team | undefined {
    const staticMatches = getAllMatches();
    const allTeams = new Map<string, Team>();
    for (const m of staticMatches) {
      allTeams.set(m.homeTeam.name.toLowerCase(), m.homeTeam);
      allTeams.set(m.homeTeam.nameCn, m.homeTeam);
      allTeams.set(m.awayTeam.name.toLowerCase(), m.awayTeam);
      allTeams.set(m.awayTeam.nameCn, m.awayTeam);
    }

    const exact = allTeams.get(apiName.toLowerCase());
    if (exact) return exact;

    for (const [, team] of allTeams) {
      if (apiName.toLowerCase().includes(team.name.toLowerCase()) ||
          team.name.toLowerCase().includes(apiName.toLowerCase())) {
        return team;
      }
    }
    return undefined;
  }

  private mapStage(apiStage: string): Match['stage'] {
    const stageMap: Record<string, Match['stage']> = {
      'GROUP_STAGE': 'group',
      'ROUND_OF_16': 'round_of_16',
      'QUARTER_FINALS': 'quarter',
      'SEMI_FINALS': 'semi',
      'FINAL': 'final',
    };
    return stageMap[apiStage] || 'group';
  }

  private mapStatus(apiStatus: string): Match['status'] {
    const statusMap: Record<string, Match['status']> = {
      'SCHEDULED': 'upcoming',
      'TIMED': 'upcoming',
      'IN_PLAY': 'live',
      'PAUSED': 'live',
      'FINISHED': 'finished',
      'POSTPONED': 'upcoming',
      'CANCELLED': 'upcoming',
    };
    return statusMap[apiStatus] || 'upcoming';
  }

  private mapResult(apiResult: string): Match['result'] {
    if (apiResult === 'HOME_TEAM') return 'home';
    if (apiResult === 'AWAY_TEAM') return 'away';
    return 'draw';
  }

  private mergeOddsIntoMatches(matches: Match[], oddsData: MatchOddsResponse[]): Match[] {
    return matches.map((match) => {
      const oddsEntry = oddsData.find(
        o => o.homeTeam === match.homeTeam.name || o.awayTeam === match.awayTeam.name
      );
      if (oddsEntry && oddsEntry.odds.length > 0) {
        return updateMatchWithOdds(match, oddsEntry.odds);
      }
      return match;
    });
  }

  // 刷新赔率（轮询调用）
  async refreshOdds(matches: Match[]): Promise<{
    updatedMatches: Match[];
    errors: string[];
    hasNewData: boolean;
  }> {
    const errors: string[] = [];
    let hasNewData = false;

    // 先尝试CCTV刷新比赛状态和结果
    const cctvResult = await fetchCctvMatches();
    if (cctvResult.connected && cctvResult.matches.length > 0) {
      // 合并CCTV更新的数据
      for (const cctvMatch of cctvResult.matches) {
        const idx = matches.findIndex(
          m => m.homeTeam.id === cctvMatch.homeTeam.id &&
               m.awayTeam.id === cctvMatch.awayTeam.id &&
               m.date === cctvMatch.date
        );
        if (idx >= 0 && (matches[idx].status !== cctvMatch.status ||
            !scoresEqual(matches[idx].score, cctvMatch.score))) {
          matches[idx] = {
            ...matches[idx],
            status: cctvMatch.status,
            score: cctvMatch.score,
            result: cctvMatch.result,
          };
          hasNewData = true;
        }
      }
    }

    // 然后尝试赔率API
    if (hasAnyApiKey()) {
      try {
        const oddsResult = await oddsAggregator.fetchAllOdds();
        if (oddsResult.errors.length > 0) {
          errors.push(...oddsResult.errors);
        }
        if (oddsResult.odds.length > 0) {
          const updated = this.mergeOddsIntoMatches(matches, oddsResult.odds);
          hasNewData = true;
          return { updatedMatches: updated, errors, hasNewData };
        }
      } catch (err) {
        errors.push(`Odds refresh failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return { updatedMatches: matches, errors, hasNewData };
  }
}

export const dataService = new DataService();
