import { Bundles } from './bundles.js';
import { Stairs, Tank } from './act1.js';
import { Scale, MoneyStack, Dilute } from './macro.js';
import { Tug, Compound } from './act2.js';
import { Islands, Bet } from './act3.js';
import { Roster } from './roster.js';
import { Eras } from './eras.js';
import { City } from './act4.js';
import { Skyline, Underwater, TenYear } from './spx.js';
import { GoldFiat, GoldHistory } from './goldx.js';
import { Coaster, Discount, Premium } from './act5.js';
import { Glasses } from './act6.js';
import { Paths } from './act7.js';
import { Rates } from './rates.js';
import { FxFlow } from './fx.js';
import { Turkey, Horizon, Withdraw } from './swan.js';
import { Calc } from './calc.js';

/* World layout: set pieces are laid out along +x in story order; the camera flies between them.
   Only the pieces named by the current beat are visible, so a piece that is visited twice (rates, city, skyline,
   tug) simply stays where its first visit is. */
export function buildPieces(app) {
  const list = [
    new Bundles(app, 'cover', [0, 0, 0], 'cover'),
    // 1 大环境
    new Scale(app, 'scale', [200, 0, 0]),
    new Stairs(app, 'stairs', [250, 0, 0]),
    new Rates(app, 'rates', [300, 0, 0]),
    new MoneyStack(app, 'money', [345, 0, 0]),
    new Dilute(app, 'dilute', [400, 0, 0]),
    new Tank(app, 'tank', [455, 0, 0]),
    new Islands(app, 'islands', [590, 0, 0]),
    // 2 标普 500
    new City(app, 'city', [780, 0, 0]),
    new Skyline(app, 'skyline', [870, 0, 0]),
    new Roster(app, 'roster', [960, 0, 0]),
    new Eras(app, 'eras', [1005, 0, 0]),
    new Bet(app, 'bet', [1060, 0, 0]),
    new TenYear(app, 'tenyear', [1150, 0, 0]),
    new Calc(app, 'calc', [1240, 0, 0]),
    // 3 黄金
    new GoldFiat(app, 'goldfiat', [1330, 0, 0]),
    new GoldHistory(app, 'goldhist', [1400, 0, 0]),
    // 4 风险
    new Coaster(app, 'coaster', [1580, 0, 0]),
    new Turkey(app, 'turkey', [1665, 0, 0]),
    new Underwater(app, 'underwater', [1735, 0, 0]),
    new Horizon(app, 'horizon', [1810, 0, 0]),
    new Withdraw(app, 'withdraw', [1875, 0, 0]),
    new Tug(app, 'tug', [1960, 0, 0]),
    new FxFlow(app, 'fx', [2025, 0, 0]),
    new Compound(app, 'compound', [2095, 0, 0]),
    new Premium(app, 'premium', [2155, 0, 0]),
    // 5 方案
    new Glasses(app, 'glasses', [2335, 0, 0]),
    new Bundles(app, 'alloc', [2395, 0, 0], 'alloc'),
    new Discount(app, 'discount', [2455, 0, 0]),
    // 6 怎么买
    new Paths(app, 'paths', [2635, 0, 0]),
    new Bundles(app, 'finale', [2725, 0, 0], 'final'),
  ];
  const map = {};
  for (const p of list) map[p.name] = p;
  return { list, map };
}
