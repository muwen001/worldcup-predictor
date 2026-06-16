// ============================================================================
// API 配置管理
// 支持从环境变量或 localStorage 读取配置
// 用户需要在 .env 中配置或运行时设置
// ============================================================================

export interface ApiConfig {
  footballDataApiKey: string | null;
  oddsApiKey: string | null;
  apiFootballKey: string | null;
  enablePolling: boolean;
  pollingInterval: number; // 毫秒
  cacheTtl: number; // 缓存过期时间（毫秒）
}

const DEFAULT_CONFIG: ApiConfig = {
  footballDataApiKey: null,
  oddsApiKey: null,
  apiFootballKey: null,
  enablePolling: true,
  pollingInterval: 5 * 60 * 1000, // 5分钟轮询
  cacheTtl: 10 * 60 * 1000, // 10分钟缓存
};

const CONFIG_STORAGE_KEY = 'wc2026_api_config';

function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) return true;
  // 过滤 .env.example 中的占位符，如 your_football_data_api_key_here
  if (value.startsWith('your_') && value.endsWith('_here')) return true;
  return false;
}

function getEnvConfig(): Partial<ApiConfig> {
  if (typeof import.meta === 'undefined' || !import.meta.env) return {};
  return {
    footballDataApiKey: isPlaceholderValue(import.meta.env.VITE_FOOTBALL_DATA_API_KEY) ? null : import.meta.env.VITE_FOOTBALL_DATA_API_KEY,
    oddsApiKey: isPlaceholderValue(import.meta.env.VITE_ODDS_API_KEY) ? null : import.meta.env.VITE_ODDS_API_KEY,
    apiFootballKey: isPlaceholderValue(import.meta.env.VITE_API_FOOTBALL_KEY) ? null : import.meta.env.VITE_API_FOOTBALL_KEY,
    enablePolling: import.meta.env.VITE_ENABLE_POLLING !== 'false',
    pollingInterval: parseInt(import.meta.env.VITE_POLLING_INTERVAL || '300000', 10),
    cacheTtl: parseInt(import.meta.env.VITE_CACHE_TTL || '600000', 10),
  };
}

function getStoredConfig(): Partial<ApiConfig> {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

export function getApiConfig(): ApiConfig {
  return { ...DEFAULT_CONFIG, ...getEnvConfig(), ...getStoredConfig() };
}

export function setApiConfig(partial: Partial<ApiConfig>): void {
  const current = getApiConfig();
  const updated = { ...current, ...partial };
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function hasAnyApiKey(): boolean {
  const cfg = getApiConfig();
  return !!(cfg.footballDataApiKey || cfg.oddsApiKey || cfg.apiFootballKey);
}

export function hasOddsApiKey(): boolean {
  const cfg = getApiConfig();
  return !!(cfg.oddsApiKey || cfg.apiFootballKey);
}

// ============================================================================
// football-data.org 配置
// 免费层：12个联赛，10请求/分钟
// 世界杯代码：WC (Competition: FIFA World Cup)
// ============================================================================
export const FOOTBALL_DATA_CONFIG = {
  baseUrl: 'https://api.football-data.org/v4',
  competitionCode: 'WC', // 2026 World Cup
  headers: (apiKey: string) => ({
    'X-Auth-Token': apiKey,
    'Content-Type': 'application/json',
  }),
};

// ============================================================================
// The Odds API 配置
// 免费层：25请求/天，NBA/MLB h2h
// Business层：$99/月，200k请求，所有体育包括世界杯，50+博彩公司
// 注册：https://theoddsapi.com/
// ============================================================================
export const ODDS_API_CONFIG = {
  baseUrl: 'https://api.the-odds-api.com/v4',
  sport: 'soccer_fifa_world_cup',
  regions: 'eu,uk,us',
  markets: 'h2h', // 1X2 odds
  oddsFormat: 'decimal',
};

// ============================================================================
// API-Football (api-football.com) 配置
// 免费层：100请求/天，包含赛程/结果
// 赔率 Addon：$15/月
// 注册：https://dashboard.api-football.com/
// ============================================================================
export const API_FOOTBALL_CONFIG = {
  baseUrl: 'https://v3.football.api-sports.io',
  worldCupId: 1, // FIFA World Cup ID (需要根据实际调整)
  season: 2026,
  headers: (apiKey: string) => ({
    'x-apisports-key': apiKey,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  }),
};

// ============================================================================
// 数据源状态
// ============================================================================
export interface DataSourceStatus {
  source: string;
  connected: boolean;
  lastFetch: string | null;
  error: string | null;
  matchesAvailable: boolean;
  oddsAvailable: boolean;
}

export function getDefaultSourceStatus(): DataSourceStatus[] {
  return [
    { source: 'cctv-sports', connected: false, lastFetch: null, error: null, matchesAvailable: false, oddsAvailable: false },
    { source: 'football-data.org', connected: false, lastFetch: null, error: null, matchesAvailable: false, oddsAvailable: false },
    { source: 'the-odds-api', connected: false, lastFetch: null, error: null, matchesAvailable: false, oddsAvailable: false },
    { source: 'api-football', connected: false, lastFetch: null, error: null, matchesAvailable: false, oddsAvailable: false },
    { source: 'static-cache', connected: true, lastFetch: null, error: null, matchesAvailable: true, oddsAvailable: true },
  ];
}
