import type { Match, Team } from '../types';
import { footballDataApi } from './footballDataApi';
import { oddsAggregator, type MatchOddsResponse } from './oddsApi';
import { cacheManager } from './cacheManager';
import { getAllMatches, updateMatchWithResult, updateMatchWithOdds } from './staticData';
import { hasAnyApiKey, getDefaultSourceStatus, type DataSourceStatus } from './apiConfig';

// ============================================================================
// 统一数据服务层
// 整合所有数据源：API实时数据 + 本地缓存 + 静态数据 fallback
// 优先级：
// 1. 实时API（如果配置了API key）
// 2. 本地缓存（如果未过期）
// 3. 静态数据（始终可用，作为保底）
// ============================================================================

export interface DataFetchResult {
  matches: Match[];
  sourceStatus: DataSourceStatus[];
  errors: string[];
  isRealTime: boolean;
  lastUpdated: string;
}

class DataService {
  // 核心方法：获取所有比赛数据
  async fetchMatches(): Promise<DataFetchResult> {
    const now = new Date();
    const errors: string[] = [];
    const sourceStatus: DataSourceStatus[] = getDefaultSourceStatus();
    let matches: Match[] = [];
    let isRealTime = false;

    // 1. 尝试从缓存获取
    const cachedMatches = cacheManager.getMatchesCache<Match[]>();
    if (cachedMatches && cachedMatches.length > 0) {
      matches = cachedMatches;
      const cachedStatus = cacheManager.getSourceStatusCache();
      if (cachedStatus) {
        sourceStatus.splice(0, sourceStatus.length, ...cachedStatus);
      }
    }

    // 2. 如果有API key，尝试获取实时数据
    if (hasAnyApiKey()) {
      try {
        const apiResult = await this.fetchFromApis();
        if (apiResult.matches.length > 0) {
          matches = apiResult.matches;
          errors.push(...apiResult.errors);
          // 更新sourceStatus中已连接的源
          for (const status of apiResult.sourceStatus) {
            const idx = sourceStatus.findIndex(s => s.source === status.source);
            if (idx >= 0) sourceStatus[idx] = status;
          }
          isRealTime = apiResult.isRealTime;
          
          // 缓存实时数据
          cacheManager.setMatchesCache(matches, apiResult.isRealTime ? 'api' : 'cache');
          cacheManager.setSourceStatusCache(sourceStatus);
        }
      } catch (err) {
        errors.push(`API fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. 如果没有API数据或缓存，使用静态数据
    if (matches.length === 0) {
      matches = getAllMatches();
      // 标记static-cache为活跃
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

    // 4. 更新所有比赛状态（基于当前时间）
    matches = matches.map((m) => updateMatchWithResult(m, now));

    // 5. 检查是否应该从API获取实时比分（如果配置了）
    if (hasAnyApiKey()) {
      const liveMatches = matches.filter(m => m.status === 'live' || m.status === 'finished');
      if (liveMatches.length > 0) {
        try {
          const scoreResult = await this.fetchLiveScores(liveMatches);
          if (scoreResult.updated.length > 0) {
            for (const updated of scoreResult.updated) {
              const idx = matches.findIndex(m => m.id === updated.id);
              if (idx >= 0) {
                matches[idx] = updated;
              }
            }
          }
          if (scoreResult.errors.length > 0) {
            errors.push(...scoreResult.errors);
          }
        } catch {
          // 忽略实时比分获取失败
        }
      }
    }

    // 6. 如果没有实时赔率，使用静态赔率（但标记为非实时）
    const staticMatches = getAllMatches();
    for (let i = 0; i < matches.length; i++) {
      const staticMatch = staticMatches.find(m => m.id === matches[i].id);
      if (staticMatch && matches[i].odds.length === 0) {
        matches[i] = { ...matches[i], odds: staticMatch.odds };
      }
    }

    return {
      matches,
      sourceStatus,
      errors: errors.length > 0 ? errors : [],
      isRealTime,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 从API获取数据
  private async fetchFromApis(): Promise<{
    matches: Match[];
    errors: string[];
    sourceStatus: DataSourceStatus[];
    isRealTime: boolean;
  }> {
    const errors: string[] = [];
    const sourceStatus: DataSourceStatus[] = [];
    let matches: Match[] = [];
    let isRealTime = false;

    // 尝试 football-data.org
    const fdResult = await footballDataApi.getMatches();
    sourceStatus.push(fdResult.status);
    if (fdResult.error) {
      errors.push(fdResult.error);
    }
    if (fdResult.data && fdResult.data.length > 0) {
      // 将 football-data.org 格式转换为内部格式
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
      matches = this.mergeOddsIntoMatches(matches, oddsResult.odds);
      isRealTime = true;
    }

    return { matches, errors, sourceStatus, isRealTime };
  }

  // 将 football-data.org 格式转换为内部 Match 格式
  private convertFootballDataMatches(apiMatches: unknown[]): Match[] {
    // 类型断言和转换
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
      // 尝试匹配静态数据中的比赛
      const matchDate = new Date(apiMatch.utcDate);
      const dateStr = matchDate.toISOString().split('T')[0];
      const timeStr = matchDate.toTimeString().slice(0, 5);

      const homeTeam = this.findTeamByApiName(apiMatch.homeTeam.name);
      const awayTeam = this.findTeamByApiName(apiMatch.awayTeam.name);

      if (!homeTeam || !awayTeam) continue;

      // 尝试找到对应的静态比赛ID
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

  // 根据API返回的球队名查找内部球队
  private findTeamByApiName(apiName: string): Team | undefined {
    const staticMatches = getAllMatches();
    const allTeams = new Map<string, Team>();
    for (const m of staticMatches) {
      allTeams.set(m.homeTeam.name.toLowerCase(), m.homeTeam);
      allTeams.set(m.homeTeam.nameCn, m.homeTeam);
      allTeams.set(m.awayTeam.name.toLowerCase(), m.awayTeam);
      allTeams.set(m.awayTeam.nameCn, m.awayTeam);
    }

    // 尝试精确匹配
    const exact = allTeams.get(apiName.toLowerCase());
    if (exact) return exact;

    // 尝试模糊匹配（简化实现）
    for (const [, team] of allTeams) {
      if (apiName.toLowerCase().includes(team.name.toLowerCase()) ||
          team.name.toLowerCase().includes(apiName.toLowerCase())) {
        return team;
      }
    }
    return undefined;
  }

  // 映射比赛阶段
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

  // 映射比赛状态
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

  // 映射比赛结果
  private mapResult(apiResult: string): Match['result'] {
    if (apiResult === 'HOME_TEAM') return 'home';
    if (apiResult === 'AWAY_TEAM') return 'away';
    return 'draw';
  }

  // 将赔率数据合并到比赛数据
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

  // 获取实时比分
  private async fetchLiveScores(liveMatches: Match[]): Promise<{
    updated: Match[];
    errors: string[];
  }> {
    const updated: Match[] = [];
    const errors: string[] = [];

    // 目前主要通过football-data.org获取比分
    const fdResult = await footballDataApi.getMatches();
    if (fdResult.error) {
      errors.push(fdResult.error);
      return { updated, errors };
    }

    if (!fdResult.data) return { updated, errors };

    const rawMatches = fdResult.data as Array<{
      id: number;
      status: string;
      score: {
        fullTime: { home: number | null; away: number | null };
      };
    }>;

    for (const apiMatch of rawMatches) {
      const liveMatch = liveMatches.find(m => m.id === `api_${apiMatch.id}` || m.id === `g${apiMatch.id}`);
      if (liveMatch && apiMatch.score.fullTime.home !== null && apiMatch.score.fullTime.away !== null) {
        const status = this.mapStatus(apiMatch.status);
        updated.push({
          ...liveMatch,
          status,
          score: {
            home: apiMatch.score.fullTime.home,
            away: apiMatch.score.fullTime.away,
          },
        });
      }
    }

    return { updated, errors };
  }

  // 刷新赔率（轮询调用）
  async refreshOdds(matches: Match[]): Promise<{
    updatedMatches: Match[];
    errors: string[];
    hasNewData: boolean;
  }> {
    const errors: string[] = [];
    let hasNewData = false;

    if (!hasAnyApiKey()) {
      return { updatedMatches: matches, errors: ['No API key configured for real-time odds'], hasNewData: false };
    }

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

    return { updatedMatches: matches, errors, hasNewData };
  }
}

export const dataService = new DataService();
