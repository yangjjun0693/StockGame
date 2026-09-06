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
      title: '성실한 트레이더',
      desc: '누적 거래 10회를 달성하세요.',
      reward: u(0.03),
      target: 10,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 10,
    },
    {
      id: 'trades_50',
      category: '거래',
      title: '베테랑 트레이더',
      desc: '누적 거래 50회를 달성하세요.',
      reward: u(0.08),
      target: 50,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 50,
    },
    {
      id: 'trades_100',
      category: '거래',
      title: '거래소의 전설',
      desc: '누적 거래 100회를 달성하세요.',
      reward: u(1),
      target: 100,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 100,
    },
    {
      id: 'trades_1000',
      category: '거래',
      title: '거래 중독',
      desc: '누적 거래 1000회를 달성하세요.',
      reward: u(5),
      target: 1000,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 1000,
    },
    {
      id: 'trades_10000',
      category: '거래',
      title: '거래 정병',
      desc: '누적 거래 10000회를 달성하세요.',
      reward: u(100),
      target: 10000,
      progress: (ctx) => ctx.transactions.length,
      check: (ctx) => ctx.transactions.length >= 10000,
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
      title: '수익 궤도 진입',
      desc: '누적 실현손익으로 목표 금액을 달성하세요.',
      reward: u(0.05),
      target: u(0.5),
      isMoney: true,
      progress: (ctx) => Math.max(0, ctx.realizedPnl),
      check: (ctx) => ctx.realizedPnl >= u(0.5),
    },
    {
      id: 'networth_2x',
      category: '수익',
      title: '자산 2배 달성',
      desc: '순자산을 시드머니의 2배로 불려보세요.',
      reward: u(0.1),
      target: startingCash * 2,
      isMoney: true,
      progress: (ctx) => ctx.netWorth,
      check: (ctx) => ctx.netWorth >= startingCash * 2,
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
      check: (ctx) => ctx.maxLeverageUsed >= 2,
    }
  ];
}
