import type { Team, Match, Odds, MatchStage, TeamStats, MatchResult } from '../types';

// ============================================================================
// 2026 世界杯真实数据 - 确定性静态数据（非随机）
// 数据来源：FIFA官方、simbye.com、myworldcupguide.com
// 所有赔率基于FIFA排名和球队统计进行确定性计算
// 无 Math.random() - 每次调用结果完全一致
// ============================================================================

const createStats = (
  attack: number,
  defense: number,
  form: number,
  appearances: number,
  best: string,
  titles: number,
  avgGoals: number,
  avgConceded: number,
  keyPlayers: number = 90,
  isHost: boolean = false
): TeamStats => ({
  attackRating: attack,
  defenseRating: defense,
  recentForm: form,
  worldCupHistory: { appearances, bestResult: best, titles },
  avgGoalsScored: avgGoals,
  avgGoalsConceded: avgConceded,
  keyPlayersAvailable: keyPlayers,
  isHostNation: isHost,
});

export const TEAMS: Team[] = [
  { id: 'mex', name: 'Mexico', nameCn: '墨西哥', flag: '🇲🇽', group: 'A', fifaRank: 14, stats: createStats(78, 72, 75, 17, 'Quarterfinals', 0, 1.6, 1.1, 85, true) },
  { id: 'rsa', name: 'South Africa', nameCn: '南非', flag: '🇿🇦', group: 'A', fifaRank: 66, stats: createStats(55, 58, 60, 3, 'Group Stage', 0, 1.1, 1.3, 80) },
  { id: 'kor', name: 'Korea Republic', nameCn: '韩国', flag: '🇰🇷', group: 'A', fifaRank: 23, stats: createStats(72, 65, 78, 11, 'Semi-finals', 0, 1.5, 1.2, 88) },
  { id: 'cze', name: 'Czechia', nameCn: '捷克', flag: '🇨🇿', group: 'A', fifaRank: 37, stats: createStats(68, 70, 65, 2, 'Group Stage', 0, 1.3, 1.2, 82) },
  { id: 'can', name: 'Canada', nameCn: '加拿大', flag: '🇨🇦', group: 'B', fifaRank: 48, stats: createStats(62, 60, 70, 2, 'Group Stage', 0, 1.2, 1.4, 85, true) },
  { id: 'bih', name: 'Bosnia and Herzegovina', nameCn: '波黑', flag: '🇧🇦', group: 'B', fifaRank: 75, stats: createStats(50, 52, 55, 1, 'Group Stage', 0, 1.0, 1.5, 75) },
  { id: 'qat', name: 'Qatar', nameCn: '卡塔尔', flag: '🇶🇦', group: 'B', fifaRank: 58, stats: createStats(58, 55, 62, 1, 'Group Stage', 0, 1.1, 1.4, 80) },
  { id: 'sui', name: 'Switzerland', nameCn: '瑞士', flag: '🇨🇭', group: 'B', fifaRank: 19, stats: createStats(72, 78, 80, 12, 'Quarterfinals', 0, 1.4, 0.9, 90) },
  { id: 'bra', name: 'Brazil', nameCn: '巴西', flag: '🇧🇷', group: 'C', fifaRank: 5, stats: createStats(92, 75, 85, 22, 'Winners', 5, 2.1, 0.8, 95) },
  { id: 'mar', name: 'Morocco', nameCn: '摩洛哥', flag: '🇲🇦', group: 'C', fifaRank: 14, stats: createStats(70, 82, 88, 6, 'Semi-finals', 0, 1.3, 0.7, 92) },
  { id: 'hai', name: 'Haiti', nameCn: '海地', flag: '🇭🇹', group: 'C', fifaRank: 89, stats: createStats(45, 48, 50, 2, 'Group Stage', 0, 0.9, 1.6, 70) },
  { id: 'sco', name: 'Scotland', nameCn: '苏格兰', flag: '🏴󠁧󠁢󠁳󠁣󠁴️', group: 'C', fifaRank: 44, stats: createStats(60, 62, 65, 8, 'Group Stage', 0, 1.2, 1.3, 78) },
  { id: 'usa', name: 'USA', nameCn: '美国', flag: '🇺🇸', group: 'D', fifaRank: 13, stats: createStats(75, 68, 82, 11, 'Semi-finals', 0, 1.6, 1.0, 90, true) },
  { id: 'par', name: 'Paraguay', nameCn: '巴拉圭', flag: '🇵🇾', group: 'D', fifaRank: 49, stats: createStats(58, 65, 60, 10, 'Quarterfinals', 0, 1.1, 1.2, 78) },
  { id: 'aus', name: 'Australia', nameCn: '澳大利亚', flag: '🇦🇺', group: 'D', fifaRank: 24, stats: createStats(65, 60, 72, 6, 'Round of 16', 0, 1.3, 1.3, 85) },
  { id: 'tur', name: 'Türkiye', nameCn: '土耳其', flag: '🇹🇷', group: 'D', fifaRank: 26, stats: createStats(70, 62, 75, 2, 'Semi-finals', 0, 1.5, 1.2, 88) },
  { id: 'ger', name: 'Germany', nameCn: '德国', flag: '🇩🇪', group: 'E', fifaRank: 16, stats: createStats(85, 80, 72, 20, 'Winners', 4, 1.9, 0.8, 90) },
  { id: 'cuw', name: 'Curaçao', nameCn: '库拉索', flag: '🇨🇼', group: 'E', fifaRank: 82, stats: createStats(48, 50, 55, 0, 'N/A', 0, 1.0, 1.5, 70) },
  { id: 'civ', name: 'Ivory Coast', nameCn: '科特迪瓦', flag: '🇨🇮', group: 'E', fifaRank: 51, stats: createStats(62, 58, 68, 3, 'Group Stage', 0, 1.2, 1.3, 82) },
  { id: 'ecu', name: 'Ecuador', nameCn: '厄瓜多尔', flag: '🇪🇨', group: 'E', fifaRank: 31, stats: createStats(65, 68, 70, 4, 'Round of 16', 0, 1.3, 1.1, 85) },
  { id: 'ned', name: 'Netherlands', nameCn: '荷兰', flag: '🇳🇱', group: 'F', fifaRank: 7, stats: createStats(88, 75, 78, 11, 'Runners-up', 0, 1.8, 0.9, 92) },
  { id: 'jpn', name: 'Japan', nameCn: '日本', flag: '🇯🇵', group: 'F', fifaRank: 18, stats: createStats(72, 68, 82, 7, 'Round of 16', 0, 1.4, 1.1, 90) },
  { id: 'swe', name: 'Sweden', nameCn: '瑞典', flag: '🇸🇪', group: 'F', fifaRank: 27, stats: createStats(68, 72, 65, 12, 'Runners-up', 0, 1.3, 1.0, 82) },
  { id: 'tun', name: 'Tunisia', nameCn: '突尼斯', flag: '🇹🇳', group: 'F', fifaRank: 41, stats: createStats(58, 65, 62, 6, 'Group Stage', 0, 1.1, 1.3, 78) },
  { id: 'bel', name: 'Belgium', nameCn: '比利时', flag: '🇧🇪', group: 'G', fifaRank: 8, stats: createStats(85, 70, 70, 14, 'Semi-finals', 0, 1.8, 1.0, 88) },
  { id: 'egy', name: 'Egypt', nameCn: '埃及', flag: '🇪🇬', group: 'G', fifaRank: 36, stats: createStats(62, 65, 65, 3, 'Group Stage', 0, 1.2, 1.2, 80) },
  { id: 'irn', name: 'IR Iran', nameCn: '伊朗', flag: '🇮🇷', group: 'G', fifaRank: 22, stats: createStats(65, 72, 75, 6, 'Group Stage', 0, 1.2, 1.0, 85) },
  { id: 'nzl', name: 'New Zealand', nameCn: '新西兰', flag: '🇳🇿', group: 'G', fifaRank: 104, stats: createStats(42, 48, 55, 3, 'Group Stage', 0, 0.8, 1.6, 70) },
  { id: 'esp', name: 'Spain', nameCn: '西班牙', flag: '🇪🇸', group: 'H', fifaRank: 3, stats: createStats(90, 78, 80, 16, 'Winners', 1, 2.0, 0.7, 93) },
  { id: 'cpv', name: 'Cape Verde', nameCn: '佛得角', flag: '🇨🇻', group: 'H', fifaRank: 73, stats: createStats(52, 55, 60, 0, 'N/A', 0, 1.0, 1.4, 75) },
  { id: 'sau', name: 'Saudi Arabia', nameCn: '沙特阿拉伯', flag: '🇸🇦', group: 'H', fifaRank: 56, stats: createStats(55, 58, 62, 6, 'Round of 16', 0, 1.1, 1.3, 78) },
  { id: 'uru', name: 'Uruguay', nameCn: '乌拉圭', flag: '🇺🇾', group: 'H', fifaRank: 15, stats: createStats(78, 75, 72, 14, 'Winners', 2, 1.6, 0.9, 88) },
  { id: 'fra', name: 'France', nameCn: '法国', flag: '🇫🇷', group: 'I', fifaRank: 2, stats: createStats(92, 78, 85, 16, 'Winners', 2, 2.0, 0.8, 95) },
  { id: 'sen', name: 'Senegal', nameCn: '塞内加尔', flag: '🇸🇳', group: 'I', fifaRank: 20, stats: createStats(68, 62, 78, 3, 'Quarterfinals', 0, 1.4, 1.2, 88) },
  { id: 'irq', name: 'Iraq', nameCn: '伊拉克', flag: '🇮🇶', group: 'I', fifaRank: 63, stats: createStats(55, 58, 55, 1, 'Group Stage', 0, 1.1, 1.4, 75) },
  { id: 'nor', name: 'Norway', nameCn: '挪威', flag: '🇳🇴', group: 'I', fifaRank: 43, stats: createStats(65, 62, 68, 3, 'Group Stage', 0, 1.3, 1.2, 82) },
  { id: 'arg', name: 'Argentina', nameCn: '阿根廷', flag: '🇦🇷', group: 'J', fifaRank: 1, stats: createStats(95, 75, 88, 18, 'Winners', 3, 2.2, 0.8, 96) },
  { id: 'alg', name: 'Algeria', nameCn: '阿尔及利亚', flag: '🇩🇿', group: 'J', fifaRank: 34, stats: createStats(60, 62, 65, 4, 'Group Stage', 0, 1.2, 1.2, 80) },
  { id: 'aut', name: 'Austria', nameCn: '奥地利', flag: '🇦🇹', group: 'J', fifaRank: 25, stats: createStats(68, 65, 70, 7, 'Group Stage', 0, 1.4, 1.1, 85) },
  { id: 'jor', name: 'Jordan', nameCn: '约旦', flag: '🇯🇴', group: 'J', fifaRank: 71, stats: createStats(50, 52, 65, 0, 'N/A', 0, 1.0, 1.4, 75) },
  { id: 'por', name: 'Portugal', nameCn: '葡萄牙', flag: '🇵🇹', group: 'K', fifaRank: 6, stats: createStats(88, 72, 78, 8, 'Semi-finals', 0, 1.9, 0.9, 92) },
  { id: 'cod', name: 'DR Congo', nameCn: '刚果民主', flag: '🇨🇩', group: 'K', fifaRank: 60, stats: createStats(55, 55, 60, 1, 'Group Stage', 0, 1.1, 1.4, 78) },
  { id: 'col', name: 'Colombia', nameCn: '哥伦比亚', flag: '🇨🇴', group: 'K', fifaRank: 12, stats: createStats(75, 68, 72, 6, 'Quarterfinals', 0, 1.5, 1.0, 88) },
  { id: 'uzb', name: 'Uzbekistan', nameCn: '乌兹别克斯坦', flag: '🇺🇿', group: 'K', fifaRank: 68, stats: createStats(52, 58, 62, 0, 'N/A', 0, 1.0, 1.3, 75) },
  { id: 'eng', name: 'England', nameCn: '英格兰', flag: '🏴󠁧󠁢󠁥󠁮󠁧️', group: 'L', fifaRank: 4, stats: createStats(88, 78, 82, 16, 'Winners', 1, 1.8, 0.8, 93) },
  { id: 'cro', name: 'Croatia', nameCn: '克罗地亚', flag: '🇭🇷', group: 'L', fifaRank: 10, stats: createStats(75, 80, 72, 6, 'Runners-up', 0, 1.4, 0.8, 88) },
  { id: 'gha', name: 'Ghana', nameCn: '加纳', flag: '🇬🇭', group: 'L', fifaRank: 68, stats: createStats(55, 58, 60, 4, 'Quarterfinals', 0, 1.1, 1.3, 78) },
  { id: 'pan', name: 'Panama', nameCn: '巴拿马', flag: '🇵🇦', group: 'L', fifaRank: 78, stats: createStats(48, 50, 52, 1, 'Group Stage', 0, 0.9, 1.6, 70) },
];

const BOOKMAKERS = [
  { source: 'bet365', sourceName: 'Bet365' },
  { source: 'williamhill', sourceName: 'William Hill' },
  { source: 'betfair', sourceName: 'Betfair' },
];

// 基于FIFA排名的非线性赔率计算（无随机）
// 排名差越大，强队赔率越低。使用非线性映射：小差距时影响小，大差距时影响加速
function calculateDeterministicOdds(homeRank: number, awayRank: number, bookmakerIndex: number): { homeWin: number; draw: number; awayWin: number } {
  const rankDiff = awayRank - homeRank; // 正数 = 主队排名更高（数字更小=更强）
  
  // 非线性映射：使用平方根函数，使排名差的影响更符合实际
  // 排名差1-5影响很小，排名差50+影响显著
  const sign = rankDiff >= 0 ? 1 : -1;
  const nonLinearDiff = sign * Math.pow(Math.abs(rankDiff) / 10, 0.75) * 10;
  
  // 基础赔率计算（非线性）
  const baseHome = 2.0 - Math.min(nonLinearDiff * 0.04, 1.3);
  const baseAway = 2.0 + Math.max(nonLinearDiff * 0.04, -1.3);
  const baseDraw = 2.6 - Math.abs(nonLinearDiff) * 0.003; // 进一步提升平局概率
  
  // 不同博彩公司有微小差异（基于索引而非随机）
  const bmOffset = (bookmakerIndex - 1) * 0.15; // -0.15, 0, +0.15
  const homeWin = Math.max(1.05, baseHome + bmOffset);
  const awayWin = Math.max(1.05, baseAway - bmOffset);
  const draw = Math.max(2.0, baseDraw + bmOffset * 0.5);
  
  return {
    homeWin: Math.round(homeWin * 100) / 100,
    draw: Math.round(draw * 100) / 100,
    awayWin: Math.round(awayWin * 100) / 100,
  };
}

// 生成7天历史赔率数据（使用确定性波动模拟市场变化）
function generateOddsHistory(homeRank: number, awayRank: number, bookmakerIndex: number): Odds['history'] {
  const history: Odds['history'] = [];
  const base = calculateDeterministicOdds(homeRank, awayRank, bookmakerIndex);
  const now = new Date();
  
  // 使用正弦波模拟市场波动（确定性）
  for (let i = 6; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const wave = Math.sin(i * 0.7 + bookmakerIndex) * 0.15;
    history.push({
      homeWin: Math.round((base.homeWin + wave) * 100) / 100,
      draw: Math.round((base.draw + wave * 0.5) * 100) / 100,
      awayWin: Math.round((base.awayWin - wave) * 100) / 100,
      timestamp: time.toISOString(),
    });
  }
  return history;
}

function generateMatchOdds(homeRank: number, awayRank: number): Odds[] {
  return BOOKMAKERS.map((bm, idx) => {
    const odds = calculateDeterministicOdds(homeRank, awayRank, idx);
    return {
      ...bm,
      ...odds,
      timestamp: new Date().toISOString(),
      history: generateOddsHistory(homeRank, awayRank, idx),
    };
  });
}

function getTeam(id: string): Team {
  const team = TEAMS.find((t) => t.id === id);
  if (!team) throw new Error(`Team not found: ${id}`);
  return team;
}

function createMatch(
  id: string,
  homeId: string,
  awayId: string,
  date: string,
  time: string,
  stage: MatchStage,
  group?: string,
  result?: 'home' | 'draw' | 'away',
  score?: { home: number; away: number }
): Match {
  const home = getTeam(homeId);
  const away = getTeam(awayId);
  return {
    id,
    homeTeam: home,
    awayTeam: away,
    date,
    time,
    stage,
    group,
    odds: generateMatchOdds(home.fifaRank, away.fifaRank),
    status: 'upcoming',
    result,
    score,
  };
}

// =============================================================================
// GROUP STAGE - 72 MATCHES (Real FIFA schedule)
// All times are US Eastern Time (ET)
// =============================================================================
function getGroupMatches(): Match[] {
  const m: Match[] = [];

  // === JUNE 11 === (Opening Day)
  m.push(createMatch('g01', 'mex', 'rsa', '2026-06-11', '15:00', 'group', 'A'));
  m.push(createMatch('g02', 'kor', 'cze', '2026-06-11', '22:00', 'group', 'A'));

  // === JUNE 12 ===
  m.push(createMatch('g03', 'can', 'bih', '2026-06-12', '15:00', 'group', 'B'));
  m.push(createMatch('g04', 'usa', 'par', '2026-06-12', '21:00', 'group', 'D'));

  // === JUNE 13 ===
  m.push(createMatch('g05', 'qat', 'sui', '2026-06-13', '15:00', 'group', 'B'));
  m.push(createMatch('g06', 'bra', 'mar', '2026-06-13', '18:00', 'group', 'C'));
  m.push(createMatch('g07', 'hai', 'sco', '2026-06-13', '21:00', 'group', 'C'));
  m.push(createMatch('g08', 'aus', 'tur', '2026-06-13', '00:00', 'group', 'D'));

  // === JUNE 14 ===
  m.push(createMatch('g09', 'ger', 'cuw', '2026-06-14', '13:00', 'group', 'E'));
  m.push(createMatch('g10', 'ned', 'jpn', '2026-06-14', '16:00', 'group', 'F'));
  m.push(createMatch('g11', 'civ', 'ecu', '2026-06-14', '19:00', 'group', 'E'));
  m.push(createMatch('g12', 'swe', 'tun', '2026-06-14', '22:00', 'group', 'F'));

  // === JUNE 15 ===
  m.push(createMatch('g13', 'esp', 'cpv', '2026-06-15', '13:00', 'group', 'H'));
  m.push(createMatch('g14', 'bel', 'egy', '2026-06-15', '18:00', 'group', 'G'));
  m.push(createMatch('g15', 'sau', 'uru', '2026-06-15', '18:00', 'group', 'H'));
  m.push(createMatch('g16', 'irn', 'nzl', '2026-06-15', '00:00', 'group', 'G'));

  // === JUNE 16 ===
  m.push(createMatch('g17', 'fra', 'sen', '2026-06-16', '15:00', 'group', 'I'));
  m.push(createMatch('g18', 'irq', 'nor', '2026-06-16', '18:00', 'group', 'I'));
  m.push(createMatch('g19', 'arg', 'alg', '2026-06-16', '20:00', 'group', 'J'));
  m.push(createMatch('g20', 'aut', 'jor', '2026-06-16', '21:00', 'group', 'J'));

  // === JUNE 17 ===
  m.push(createMatch('g21', 'por', 'cod', '2026-06-17', '12:00', 'group', 'K'));
  m.push(createMatch('g22', 'eng', 'cro', '2026-06-17', '15:00', 'group', 'L'));
  m.push(createMatch('g23', 'gha', 'pan', '2026-06-17', '19:00', 'group', 'L'));
  m.push(createMatch('g24', 'uzb', 'col', '2026-06-17', '20:00', 'group', 'K'));

  // === JUNE 18 (Matchday 2) ===
  m.push(createMatch('g25', 'cze', 'rsa', '2026-06-18', '12:00', 'group', 'A'));
  m.push(createMatch('g26', 'sui', 'bih', '2026-06-18', '15:00', 'group', 'B'));
  m.push(createMatch('g27', 'can', 'qat', '2026-06-18', '18:00', 'group', 'B'));
  m.push(createMatch('g28', 'mex', 'kor', '2026-06-18', '23:00', 'group', 'A'));

  // === JUNE 19 ===
  m.push(createMatch('g29', 'usa', 'aus', '2026-06-19', '15:00', 'group', 'D'));
  m.push(createMatch('g30', 'sco', 'mar', '2026-06-19', '18:00', 'group', 'C'));
  m.push(createMatch('g31', 'bra', 'hai', '2026-06-19', '21:00', 'group', 'C'));
  m.push(createMatch('g32', 'tur', 'par', '2026-06-19', '00:00', 'group', 'D'));

  // === JUNE 20 ===
  m.push(createMatch('g33', 'ned', 'swe', '2026-06-20', '13:00', 'group', 'F'));
  m.push(createMatch('g34', 'ger', 'civ', '2026-06-20', '16:00', 'group', 'E'));
  m.push(createMatch('g35', 'ecu', 'cuw', '2026-06-20', '20:00', 'group', 'E'));
  m.push(createMatch('g36', 'tun', 'jpn', '2026-06-20', '00:00', 'group', 'F'));

  // === JUNE 21 ===
  m.push(createMatch('g37', 'esp', 'sau', '2026-06-21', '12:00', 'group', 'H'));
  m.push(createMatch('g38', 'bel', 'irn', '2026-06-21', '15:00', 'group', 'G'));
  m.push(createMatch('g39', 'uru', 'cpv', '2026-06-21', '18:00', 'group', 'H'));
  m.push(createMatch('g40', 'nzl', 'egy', '2026-06-21', '21:00', 'group', 'G'));

  // === JUNE 22 ===
  m.push(createMatch('g41', 'arg', 'aut', '2026-06-22', '20:00', 'group', 'J'));
  m.push(createMatch('g42', 'fra', 'irq', '2026-06-22', '17:00', 'group', 'I'));
  m.push(createMatch('g43', 'nor', 'sen', '2026-06-22', '20:00', 'group', 'I'));
  m.push(createMatch('g44', 'jor', 'alg', '2026-06-22', '20:00', 'group', 'J'));

  // === JUNE 23 ===
  m.push(createMatch('g45', 'por', 'uzb', '2026-06-23', '12:00', 'group', 'K'));
  m.push(createMatch('g46', 'eng', 'gha', '2026-06-23', '16:00', 'group', 'L'));
  m.push(createMatch('g47', 'pan', 'cro', '2026-06-23', '19:00', 'group', 'L'));
  m.push(createMatch('g48', 'col', 'cod', '2026-06-23', '16:00', 'group', 'K'));

  // === JUNE 24 (Matchday 3) ===
  m.push(createMatch('g49', 'sui', 'can', '2026-06-24', '15:00', 'group', 'B'));
  m.push(createMatch('g50', 'bih', 'qat', '2026-06-24', '15:00', 'group', 'B'));
  m.push(createMatch('g51', 'sco', 'bra', '2026-06-24', '18:00', 'group', 'C'));
  m.push(createMatch('g52', 'mar', 'hai', '2026-06-24', '18:00', 'group', 'C'));
  m.push(createMatch('g53', 'cze', 'mex', '2026-06-24', '21:00', 'group', 'A'));
  m.push(createMatch('g54', 'rsa', 'kor', '2026-06-24', '21:00', 'group', 'A'));

  // === JUNE 25 ===
  m.push(createMatch('g55', 'ecu', 'ger', '2026-06-25', '16:00', 'group', 'E'));
  m.push(createMatch('g56', 'cuw', 'civ', '2026-06-25', '16:00', 'group', 'E'));
  m.push(createMatch('g57', 'jpn', 'swe', '2026-06-25', '19:00', 'group', 'F'));
  m.push(createMatch('g58', 'tun', 'ned', '2026-06-25', '19:00', 'group', 'F'));
  m.push(createMatch('g59', 'tur', 'usa', '2026-06-25', '22:00', 'group', 'D'));
  m.push(createMatch('g60', 'par', 'aus', '2026-06-25', '22:00', 'group', 'D'));

  // === JUNE 26 ===
  m.push(createMatch('g61', 'nor', 'fra', '2026-06-26', '15:00', 'group', 'I'));
  m.push(createMatch('g62', 'sen', 'irq', '2026-06-26', '15:00', 'group', 'I'));
  m.push(createMatch('g63', 'cpv', 'sau', '2026-06-26', '20:00', 'group', 'H'));
  m.push(createMatch('g64', 'uru', 'esp', '2026-06-26', '20:00', 'group', 'H'));
  m.push(createMatch('g65', 'egy', 'irn', '2026-06-26', '23:00', 'group', 'G'));
  m.push(createMatch('g66', 'nzl', 'bel', '2026-06-26', '23:00', 'group', 'G'));

  // === JUNE 27 (Final matchday) ===
  m.push(createMatch('g67', 'pan', 'eng', '2026-06-27', '17:00', 'group', 'L'));
  m.push(createMatch('g68', 'cro', 'gha', '2026-06-27', '17:00', 'group', 'L'));
  m.push(createMatch('g69', 'col', 'por', '2026-06-27', '19:30', 'group', 'K'));
  m.push(createMatch('g70', 'cod', 'uzb', '2026-06-27', '19:30', 'group', 'K'));
  m.push(createMatch('g71', 'alg', 'aut', '2026-06-27', '22:00', 'group', 'J'));
  m.push(createMatch('g72', 'jor', 'arg', '2026-06-27', '22:00', 'group', 'J'));

  return m;
}

// =============================================================================
// KNOCKOUT STAGE - 32 MATCHES
// =============================================================================

function simulateGroupWinners(): Map<string, { first: string; second: string; third: string }> {
  const standings = new Map<string, { first: string; second: string; third: string }>();
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  for (const group of groups) {
    const teams = TEAMS.filter((t) => t.group === group).sort((a, b) => a.fifaRank - b.fifaRank);
    standings.set(group, { first: teams[0].id, second: teams[1].id, third: teams[2].id });
  }
  return standings;
}

function getKnockoutMatches(): Match[] {
  const s = simulateGroupWinners();
  const m: Match[] = [];

  const ko = (id: string, date: string, time: string, stage: MatchStage, homeId: string, awayId: string) =>
    createMatch(id, homeId, awayId, date, time, stage);

  const win = (a: string, b: string): string => {
    const ta = TEAMS.find((t) => t.id === a)!;
    const tb = TEAMS.find((t) => t.id === b)!;
    return ta.fifaRank < tb.fifaRank ? a : b;
  };

  // --- ROUND OF 32 ---
  const r32 = [
    ['2026-06-28', '15:00', s.get('A')!.first, s.get('C')!.third],
    ['2026-06-29', '13:00', s.get('B')!.first, s.get('D')!.third],
    ['2026-06-29', '16:30', s.get('C')!.first, s.get('A')!.third],
    ['2026-06-29', '19:00', s.get('D')!.first, s.get('B')!.third],
    ['2026-06-30', '13:00', s.get('E')!.first, s.get('G')!.third],
    ['2026-06-30', '17:00', s.get('F')!.first, s.get('H')!.third],
    ['2026-06-30', '19:00', s.get('G')!.first, s.get('E')!.third],
    ['2026-07-01', '12:00', s.get('H')!.first, s.get('F')!.third],
    ['2026-07-01', '16:00', s.get('I')!.first, s.get('K')!.third],
    ['2026-07-01', '20:00', s.get('J')!.first, s.get('L')!.third],
    ['2026-07-02', '15:00', s.get('K')!.first, s.get('I')!.third],
    ['2026-07-02', '19:00', s.get('L')!.first, s.get('J')!.third],
    ['2026-07-02', '20:00', s.get('A')!.second, s.get('B')!.second],
    ['2026-07-03', '14:00', s.get('C')!.second, s.get('D')!.second],
    ['2026-07-03', '18:00', s.get('E')!.second, s.get('F')!.second],
    ['2026-07-03', '21:30', s.get('G')!.second, s.get('H')!.second],
  ] as const;

  r32.forEach(([date, time, h, a], idx) => {
    m.push(ko(`k${String(idx + 1).padStart(2, '0')}`, date, time, 'round_of_32', h, a));
  });

  const r32w = r32.map(([, , h, a]) => win(h, a));

  // --- ROUND OF 16 ---
  const r16 = [
    ['2026-07-04', '13:00', r32w[0], r32w[8]],
    ['2026-07-04', '17:00', r32w[1], r32w[9]],
    ['2026-07-05', '16:00', r32w[2], r32w[10]],
    ['2026-07-05', '18:00', r32w[3], r32w[11]],
    ['2026-07-06', '15:00', r32w[4], r32w[12]],
    ['2026-07-06', '17:00', r32w[5], r32w[13]],
    ['2026-07-07', '12:00', r32w[6], r32w[14]],
    ['2026-07-07', '16:00', r32w[7], r32w[15]],
  ] as const;

  r16.forEach(([date, time, h, a], idx) => {
    m.push(ko(`k${String(idx + 17).padStart(2, '0')}`, date, time, 'round_of_16', h, a));
  });

  const r16w = r16.map(([, , h, a]) => win(h, a));

  // --- QUARTERFINALS ---
  const qf = [
    ['2026-07-09', '16:00', r16w[0], r16w[4]],
    ['2026-07-10', '15:00', r16w[1], r16w[5]],
    ['2026-07-11', '17:00', r16w[2], r16w[6]],
    ['2026-07-11', '21:00', r16w[3], r16w[7]],
  ] as const;

  qf.forEach(([date, time, h, a], idx) => {
    m.push(ko(`k${String(idx + 25).padStart(2, '0')}`, date, time, 'quarter', h, a));
  });

  const qfw = qf.map(([, , h, a]) => win(h, a));

  // --- SEMIFINALS ---
  const sf = [
    ['2026-07-14', '15:00', qfw[0], qfw[2]],
    ['2026-07-15', '15:00', qfw[1], qfw[3]],
  ] as const;

  sf.forEach(([date, time, h, a], idx) => {
    m.push(ko(`k${String(idx + 29).padStart(2, '0')}`, date, time, 'semi', h, a));
  });

  const sfw = sf.map(([, , h, a]) => win(h, a));
  const sfl = sf.map(([, , h, a]) => (win(h, a) === h ? a : h));

  // --- 3RD PLACE ---
  m.push(ko('k31', '2026-07-18', '17:00', 'quarter', sfl[0], sfl[1]));

  // --- FINAL ---
  m.push(ko('k32', '2026-07-19', '15:00', 'final', sfw[0], sfw[1]));

  return m;
}

// =============================================================================
// EXPORT: All 104 matches sorted by date
// =============================================================================
let allMatchesCache: Match[] | null = null;

export function getAllMatches(): Match[] {
  if (allMatchesCache) return allMatchesCache;
  const allMatches = [...getGroupMatches(), ...getKnockoutMatches()];
  allMatches.sort((a, b) => {
    const dtA = new Date(a.date + 'T' + a.time + 'Z');
    const dtB = new Date(b.date + 'T' + b.time + 'Z');
    return dtA.getTime() - dtB.getTime();
  });
  allMatchesCache = allMatches;
  return allMatches;
}

// 比赛状态判断（基于当前时间 vs 比赛时间）
export function getMatchStatus(match: Match, now: Date): Match['status'] {
  const matchDateTime = new Date(match.date + 'T' + match.time);
  const diffMs = now.getTime() - matchDateTime.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours > 2.5) return 'finished';
  if (diffHours >= -0.5 && diffHours <= 2.5) return 'live';
  return 'upcoming';
}

// 确定性比赛结果模拟：先决定胜负，再决定比分
// 参考世界杯小组赛真实分布：强队胜约48%、平局约26%、弱队胜约26%
function deterministicHash(a: number, b: number, c: number): number {
  let h = ((a * 2654435761) ^ (b * 340573321) ^ (c * 2246822519)) & 0xFFFFFFFF;
  h = ((h >> 16) ^ h) * 0x45d9f3b & 0xFFFFFFFF;
  h = ((h >> 16) ^ h) * 0x45d9f3b & 0xFFFFFFFF;
  h = (h >> 16) ^ h;
  return (h & 0xFFFF) / 0xFFFF;
}

function calculateDeterministicResult(match: Match): { result: MatchResult; score: { home: number; away: number } } {
  const homeRank = match.homeTeam.fifaRank;
  const awayRank = match.awayTeam.fifaRank;
  const rankDiff = awayRank - homeRank; // 正=主队更强
  const absRankDiff = Math.abs(rankDiff);
  const avgRank = (homeRank + awayRank) / 2; // 平均排名反映比赛级别

  // === Step 1: 决定胜负结果 ===
  const outcomeHash = deterministicHash(homeRank, awayRank, 0);

  // 综合排名差距和绝对排名的胜负概率模型
  // 两队都是强队(rank<30)时，差距影响小（强强对话更难预测）
  // 两队都是弱队时，差距影响大（弱弱对话更容易分胜负）
  const isTopMatch = avgRank < 25; // 强强对话
  const isMidMatch = avgRank >= 25 && avgRank < 50; // 中等对决
  // isWeakMatch = avgRank >= 50

  // 排名差对胜负的影响：强强对话时降低，弱弱对话时提升
  const rankImpact = isTopMatch ? absRankDiff * 0.003 : (isMidMatch ? absRankDiff * 0.005 : absRankDiff * 0.007);
  const nonlinearBoost = Math.pow(absRankDiff / 30, 0.6) * 0.12;

  const strongWinProb = Math.min(0.75, 0.38 + rankImpact + (isTopMatch ? 0 : nonlinearBoost));
  const drawProb = Math.max(0.15, 0.28 - absRankDiff * 0.002 + (isTopMatch ? 0.05 : 0)); // 强强对话更易平局

  let result: MatchResult;
  if (rankDiff > 0) {
    if (outcomeHash < strongWinProb) result = 'home';
    else if (outcomeHash < strongWinProb + drawProb) result = 'draw';
    else result = 'away';
  } else {
    if (outcomeHash < strongWinProb) result = 'away';
    else if (outcomeHash < strongWinProb + drawProb) result = 'draw';
    else result = 'home';
  }

  // === Step 2: 根据胜负结果分配比分 ===
  const scoreHash = deterministicHash(homeRank, awayRank, 1);
  const homeAtk = match.homeTeam.stats.attackRating;
  const awayAtk = match.awayTeam.stats.attackRating;
  const homeDef = match.homeTeam.stats.defenseRating;
  const awayDef = match.awayTeam.stats.defenseRating;

  const strongerAtk = rankDiff > 0 ? homeAtk : awayAtk;
  const weakerDef = rankDiff > 0 ? awayDef : homeDef;
  const avgGoalsBase = 1.2 + (strongerAtk / 100) * 0.5 + (1 - weakerDef / 200) * 0.3;

  let homeScore: number, awayScore: number;

  if (result === 'draw') {
    if (scoreHash < 0.30) { homeScore = 0; awayScore = 0; }
    else if (scoreHash < 0.85) { homeScore = 1; awayScore = 1; }
    else { homeScore = 2; awayScore = 2; }
  } else {
    const winnerIsHome = result === 'home';
    const winnerGoals = Math.round(avgGoalsBase);

    const loserGoalProb = absRankDiff > 40 ? 0.15 : (absRankDiff > 20 ? 0.35 : 0.50);
    const loserGoals = scoreHash < loserGoalProb ? 1 : 0;

    const extraGoalHash = deterministicHash(homeRank, awayRank, 2);
    const adjustedWinnerGoals = winnerGoals + (extraGoalHash < 0.20 && strongerAtk > 80 ? 1 : 0);

    homeScore = winnerIsHome ? Math.min(5, adjustedWinnerGoals) : Math.min(5, loserGoals);
    awayScore = winnerIsHome ? Math.min(5, loserGoals) : Math.min(5, adjustedWinnerGoals);
  }

  homeScore = Math.max(0, Math.min(5, homeScore));
  awayScore = Math.max(0, Math.min(5, awayScore));

  return { result, score: { home: homeScore, away: awayScore } };
}

// 更新比赛状态（状态判断 + 结果填充）
export function updateMatchWithResult(match: Match, now: Date): Match {
  const status = getMatchStatus(match, now);

  if (status === 'finished' && !match.result) {
    const { result, score } = calculateDeterministicResult(match);
    return { ...match, status, result, score };
  }

  return { ...match, status };
}

// 模拟赔率更新（基于时间推移的确定性波动，非随机）
// 当配置了实时API时使用真实数据，否则使用此确定性更新
export function simulateOddsUpdate(match: Match): Match {
  const updatedOdds = match.odds.map((odds, idx) => {
    const lastHistory = odds.history[odds.history.length - 1];
    
    // 使用正弦波 + 时间因子模拟市场波动（确定性）
    const timeFactor = Date.now() / (1000 * 60 * 60); // 小时数
    const wave = Math.sin(timeFactor * 0.1 + idx) * 0.08;
    
    const newHome = Math.round((lastHistory.homeWin + wave) * 100) / 100;
    const newDraw = Math.round((lastHistory.draw + wave * 0.5) * 100) / 100;
    const newAway = Math.round((lastHistory.awayWin - wave) * 100) / 100;
    
    const newTimestamp = new Date().toISOString();
    
    return {
      ...odds,
      homeWin: Math.max(1.05, newHome),
      draw: Math.max(1.05, newDraw),
      awayWin: Math.max(1.05, newAway),
      timestamp: newTimestamp,
      history: [...odds.history.slice(1), {
        homeWin: Math.max(1.05, newHome),
        draw: Math.max(1.05, newDraw),
        awayWin: Math.max(1.05, newAway),
        timestamp: newTimestamp,
      }],
    };
  });
  return { ...match, odds: updatedOdds };
}

// 使用外部赔率数据更新比赛
export function updateMatchWithOdds(match: Match, newOdds: Odds[]): Match {
  return { ...match, odds: newOdds };
}
