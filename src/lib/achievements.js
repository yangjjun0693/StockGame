export const ACHIEVEMENT_CATEGORIES = ['거래', '수익', '포트폴리오', '리스크'];

/**
 * Achievement definitions. Rewards/targets are expressed as fractions of
 * STARTING_CASH (mult = 0.01 -> 1% of the seed money) so the whole set
 * scales automatically if the starting seed money ever changes.
 * All 10 combined currently add up to ~54% of the seed money.
 *
 * Each entry:
 *  - check(ctx)    -> boolean, whether the achievement is satisfied right now
 *  - progress(ctx) -> current numeric progress, shown against `target`
 *                     (for boolean achievements this is just 0 or `target`)
 *
 * ctx shape (built in App.jsx, see buildAchievementContext):
 *  { transactions, holdings, netWorth, realizedPnl, assetTypesTraded, maxLeverageUsed }
 */
export function buildAchievements(startingCash) {
  const u = (mult) => Math.round((startingCash * mult) / 100) * 100;

  // 종목별 누적 매수 금액 중 최댓값
  const maxStockInvested = (transactions) => {
    const sums = {};
    transactions.forEach((t) => {
      if (t.type === 'buy') sums[t.stockId] = (sums[t.stockId] || 0) + (t.total || 0);
    });
    return Object.values(sums).reduce((max, v) => Math.max(max, v), 0);
  };

  // 한 종목을 1시간(3600000ms) 이내에 몇 번 매매했는지 중 최댓값
  const maxTradesInHour = (transactions) => {
    const byStock = {};
    transactions.forEach((t) => {
      (byStock[t.stockId] = byStock[t.stockId] || []).push(t.time);
    });
    let best = 0;
    Object.values(byStock).forEach((times) => {
      const sorted = [...times].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        let count = 1;
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[j] - sorted[i] <= 3600000) count++;
          else break;
        }
        best = Math.max(best, count);
      }
    });
    return best;
  };

  return [
    {
      id: 'first_trade',
      category: '거래',
      title: '첫 거래',
      desc: '주식이든 코인이든, 처음으로 매매를 체결해보세요.',
      reward: u(0.01),
      target: 1,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 1,
    },
    {
      id: 'trades_10',
      category: '거래',
      title: '거래쟁이',
      desc: '누적 거래 10회를 달성하세요.',
      reward: u(0.03),
      target: 10,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 10,
    },
    {
      id: 'trades_50',
      category: '거래',
      title: '거래왕',
      desc: '누적 거래 50회를 달성하세요.',
      reward: u(0.08),
      target: 50,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 50,
    },
    {
      id: 'trades_100',
      category: '거래',
      title: '거래 중독',
      desc: '누적 거래 100회를 달성하세요.',
      reward: u(0.1),
      target: 100,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 100,
    },
    {
      id: 'trades_1000',
      category: '거래',
      title: '거래 정병',
      desc: '누적 거래 1000회를 달성하세요.',
      reward: u(0.25),
      target: 1000,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 1000,
    },
    {
      id: 'first_profit',
      category: '수익',
      title: '첫 익절',
      desc: '수익을 내고 포지션을 청산해보세요.',
      reward: u(0.02),
      target: 1,
      progress: (ctx) => (ctx.transactions.some((t) => t.type === 'sell' && t.pnl > 0) ? 1 : 0),
      check: (ctx) => ctx.transactions.some((t) => t.type === 'sell' && t.pnl > 0),
    },
    {
      id: 'profit_half_seed',
      category: '수익',
      title: '50% 수익',
      desc: '시드의 반을 불리세요.',
      reward: u(0.05),
      target: u(0.5),
      isMoney: true,
      progress: (ctx) => Math.max(0, ctx.realizedPnl),
      check: (ctx) => ctx.realizedPnl >= u(0.5),
    },
    {
      id: 'networth_2x',
      category: '수익',
      title: '자산 2배',
      desc: '순자산을 시드머니의 2배로 불려보세요.',
      reward: u(0.1),
      target: startingCash * 2,
      isMoney: true,
      progress: (ctx) => ctx.netWorth,
      check: (ctx) => ctx.netWorth >= startingCash * 2,
    },
    {
      id: 'networth_10x',
      category: '수익',
      title: '자산 10배',
      desc: '순자산을 시드머니의 10배로 불려보세요.',
      reward: u(0.2),
      target: startingCash * 10,
      isMoney: true,
      progress: (ctx) => ctx.netWorth,
      check: (ctx) => ctx.netWorth >= startingCash * 10,
    },
    {
      id: 'millionaire',
      category: '수익',
      title: '백만장자',
      desc: '백만불의 사나이',
      reward: u(1),
      target: startingCash * 100,
      isMoney: true,
      progress: (ctx) => ctx.netWorth,
      check: (ctx) => ctx.netWorth >= startingCash * 100,
    },
    {
      id: 'diversify_5',
      category: '포트폴리오',
      title: '분산 투자자',
      desc: '동시에 5개 이상의 종목을 보유해보세요.',
      reward: u(0.03),
      target: 5,
      progress: (ctx) => Object.keys(ctx.holdings).length,
      check: (ctx) => Object.keys(ctx.holdings).length >= 5,
    },
    {
      id: 'all_asset_types',
      category: '포트폴리오',
      title: '올라운더',
      desc: '주식·코인·환율을 모두 거래해보세요.',
      reward: u(0.05),
      target: 3,
      progress: (ctx) => ctx.assetTypesTraded.size,
      check: (ctx) => ctx.assetTypesTraded.size >= 3,
    },
    {
      id: 'leverage_user',
      category: '리스크',
      title: '레버리지 데뷔',
      desc: '2배 이상의 레버리지로 포지션을 열어보세요.',
      reward: u(0.02),
      target: 2,
      progress: (ctx) => ctx.maxLeverageUsed,
      check: (ctx) => ctx.maxLeverageUsed >= 2,
    },
    {
      id: 'leverage_dopamine',
      category: '리스크',
      title: '레버리지 중독',
      desc: '50X 레버리지로 포지션을 열어보세요.',
      reward: u(0.05),
      target: 1,
      progress: (ctx) => ctx.maxLeverageUsed,
      check: (ctx) => ctx.maxLeverageUsed >= 50,
    },
    {
      id: 'short_debut',
      category: '리스크',
      title: '공매도 데뷔',
      desc: 'Short 포지션을 처음 열어보세요.',
      reward: u(0.02),
      target: 1,
      progress: (ctx) => (ctx.transactions.some((t) => t.type === 'buy' && t.side === 'short') ? 1 : 0),
      check: (ctx) => ctx.transactions.some((t) => t.type === 'buy' && t.side === 'short'),
    },
    {
      id: 'liquidated_once',
      category: '리스크',
      title: '청산의 아픔',
      desc: '레버리지 포지션이 강제 청산되는 경험을 해보세요.',
      reward: u(0.01),
      target: 1,
      progress: (ctx) => ctx.transactions.filter((t) => t.type === 'liquidation').length,
      check: (ctx) => ctx.transactions.some((t) => t.type === 'liquidation'),
    },
    {
      id: 'liquidated_5',
      category: '리스크',
      title: '청산 단골',
      desc: '강제 청산을 5회 당해보세요.',
      reward: u(0.05),
      target: 5,
      progress: (ctx) => ctx.transactions.filter((t) => t.type === 'liquidation').length,
      check: (ctx) => ctx.transactions.filter((t) => t.type === 'liquidation').length >= 5,
    },
    {
      id: 'comeback_king',
      category: '수익',
      title: '컴백왕',
      desc: '청산을 당한 뒤에도 순자산을 시드머니 이상으로 회복하세요.',
      reward: u(0.06),
      target: startingCash,
      isMoney: true,
      progress: (ctx) => ctx.netWorth,
      check: (ctx) => ctx.transactions.some((t) => t.type === 'liquidation') && ctx.netWorth >= startingCash,
    },
    {
      id: 'fx_trader',
      category: '포트폴리오',
      title: 'FX 전문가',
      desc: '환율(FX) 거래를 10회 이상 해보세요.',
      reward: u(0.03),
      target: 10,
      progress: (ctx) => ctx.transactions.filter((t) => t.assetType === 'fx').length,
      check: (ctx) => ctx.transactions.filter((t) => t.assetType === 'fx').length >= 10,
    },
    {
      id: 'coin_grinder',
      category: '포트폴리오',
      title: '코인 그라인더',
      desc: '코인 거래를 20회 이상 해보세요.',
      reward: u(0.04),
      target: 20,
      progress: (ctx) => ctx.transactions.filter((t) => t.assetType === 'coin').length,
      check: (ctx) => ctx.transactions.filter((t) => t.assetType === 'coin').length >= 20,
    },
    {
      id: 'night_owl',
      category: '거래',
      title: '코쟁이',
      desc: '새벽 시간대(0~6시)에 거래해보세요.',
      reward: u(0.01),
      target: 1,
      progress: (ctx) => (ctx.transactions.some((t) => new Date(t.time).getHours() < 6) ? 1 : 0),
      check: (ctx) => ctx.transactions.some((t) => new Date(t.time).getHours() < 6),
    },
    {
      id: 'whale',
      category: '포트폴리오',
      title: '고래',
      desc: '한 종목에 10만 달러 이상을 투입해보세요.',
      reward: u(0.06),
      target: 100000,
      isMoney: true,
      progress: (ctx) => maxStockInvested(ctx.transactions),
      check: (ctx) => maxStockInvested(ctx.transactions) >= 100000,
    },
    {
      id: 'day_trader',
      category: '거래',
      title: '단타왕',
      desc: '한 종목을 1시간 안에 10번 매매해보세요.',
      reward: u(0.04),
      target: 10,
      progress: (ctx) => maxTradesInHour(ctx.transactions),
      check: (ctx) => maxTradesInHour(ctx.transactions) >= 10,
    },
  ];
}
