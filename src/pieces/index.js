import { Bundles } from './bundles.js';
import { Stairs, Tank, Seesaw } from './act1.js';
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

/* World layout: set pieces are laid out along +x in story order; the camera flies between them. */
export function buildPieces(app) {
  const list = [
    new Bundles(app, 'cover', [0, 0, 0], 'cover'),
    // 1 大环境
    new Scale(app, 'scale', [200, 0, 0]),
    new Rates(app, 'rates', [255, 0, 0]),
    new Stairs(app, 'stairs', [300, 0, 0]),
    new MoneyStack(app, 'money', [345, 0, 0]),
    new Dilute(app, 'dilute', [400, 0, 0]),
    new Tank(app, 'tank', [455, 0, 0]),
    new Seesaw(app, 'seesaw', [515, 0, 0]),
    // 2 汇率
    new Tug(app, 'tug', [700, 0, 0]),
    new FxFlow(app, 'fx', [765, 0, 0]),
    new Compound(app, 'compoundA', [835, 0, 0]),
    // 3 思路
    new Islands(app, 'islands', [1010, 0, 0]),
    new Roster(app, 'roster', [1110, 0, 0]),
    new Eras(app, 'eras', [1145, 0, 0]),
    new Bet(app, 'bet', [1200, 0, 0]),
    // 4 标普 500
    new City(app, 'city', [1360, 0, 0]),
    new Skyline(app, 'skyline', [1450, 0, 0]),
    new TenYear(app, 'tenyear', [1540, 0, 0]),
    // 5 黄金
    new GoldFiat(app, 'goldfiat', [1870, 0, 0]),
    new GoldHistory(app, 'goldhist', [1940, 0, 0]),
    // 6 风险
    new Coaster(app, 'coaster', [2120, 0, 0]),
    new Turkey(app, 'turkey', [2205, 0, 0]),
    new Underwater(app, 'underwater', [2275, 0, 0]),
    new Horizon(app, 'horizon', [2350, 0, 0]),
    new Withdraw(app, 'withdraw', [2415, 0, 0]),
    new Discount(app, 'discount', [2540, 0, 0]),
    new Compound(app, 'compoundB', [2600, 0, 0]),
    new Premium(app, 'premium', [2660, 0, 0]),
    // 7 方案
    new Glasses(app, 'glasses', [2840, 0, 0]),
    new Bundles(app, 'alloc', [2900, 0, 0], 'alloc'),
    // 8 怎么买
    new Paths(app, 'paths', [3080, 0, 0]),
    new Bundles(app, 'finale', [3170, 0, 0], 'final'),
  ];
  const map = {};
  for (const p of list) map[p.name] = p;
  return { list, map };
}
