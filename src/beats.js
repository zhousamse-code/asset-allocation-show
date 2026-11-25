/* Story script: every entry is one "pause point". Copy is plain spoken Chinese for a ~50-year-old business owner
   who is not a finance person. Data as of 24 Nov 2026.
   cam: camera position p and look-at t, relative to the origin of piece `at`; shift moves the subject on screen
   (x > 0 to the right, y > 0 downward) to leave room for the text block. */

export const ACTS = ['开场', '大环境', '汇率', '思路', '标普 500', '黄金', '风险', '方案', '怎么买'];

const chain = (items) => `<div class="chain">${items.map((s) => `<span>${s}</span>`).join('<i>→</i>')}</div>`;
const spec = (rows, tags = '') =>
  `<dl class="spec">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>${tags ? `<div class="tags">${tags}</div>` : ''}`;

export const BEATS = [
  /* ---------- 开场 ---------- */
  {
    act: 0,
    layout: 'left cover',
    h: '200 万闲钱，<br>怎么<em>投资</em>？',
    sub: '从眼下的利息说起，一直讲到具体怎么买。',
    cam: { at: 'cover', p: [6.2, 7.2, 18.5], t: [0.4, 1.0, 0], shift: [0.24, 0.03] },
    pieces: { cover: { mode: 'pile' } },
  },
  {
    act: 0,
    layout: 'left',
    h: '这里是 200 捆钱，<br>每捆 1 万元',
    sub: '接下来每一页，都在回答同一个问题：这些钱怎么投。',
    cam: { at: 'cover', p: [6, 6.8, 17], t: [0.6, 2.4, 0.6], shift: [0.21, 0.02] },
    pieces: { cover: { mode: 'unit' } },
  },

  /* ---------- 第一幕：大环境 ---------- */
  {
    act: 1,
    layout: 'left',
    eyebrow: '<b>第一幕</b>大环境',
    h: '这几年，生意<br>为什么越来越卷？',
    sub: '说到底，是东西多了，买的人少了。',
    extra:
      '<ul class="causes"><li><b>东西多了</b><span>前些年各行各业都在扩厂、加产能；出口又碰上关税，一部分货只能转回国内卖。</span></li><li><b>买的少了</b><span>房价跌了，家里的钱“缩水”了，大家捂紧钱包，能不花就不花。</span></li></ul><p class="note">货多钱少，只能拼价格：工厂出厂价格（PPI）从 2022 年 10 月起连跌了 41 个月，到今年 3 月才转正。</p>',
    cam: { at: 'scale', p: [0.5, 6.8, 25.5], t: [0.2, 3.6, 0], shift: [0.24, 0.03] },
    pieces: { scale: {} },
  },
  {
    act: 1,
    layout: 'left',
    h: '生意难做，<br>利息也一降再降',
    sub: '利息，就是借钱的“租金”：借钱的人多，租金就高；借钱的人少，租金就降。',
    extra: `${chain(['生意难做', '企业不敢借钱扩张', '央行降息刺激', '存款利息跟着降'])}<p class="note">现在国有大行 1 年期定期只有 0.95%，5 年期 1.30%。</p>`,
    cam: { at: 'stairs', p: [-2.6, 6.8, 20.5], t: [1.2, 2.5, 0], shift: [0.21, 0.02] },
    pieces: { stairs: {} },
  },
  {
    act: 1,
    layout: 'left',
    h: '降息、降准，<br>就是常说的“放水”',
    sub: '“放水”，就是让市面上的钱变多。降息，让借钱更便宜；降准，让银行少押一部分钱在央行，能多放贷款。银行每放出一笔贷款，市面上就多出一笔钱。',
    extra: '<p class="note">市面上的钱（M2）：2015 年底 139 万亿，2025 年底 340 万亿，十年翻了约 2.4 倍；同期经济总量（GDP）大约翻了一倍。</p>',
    cam: { at: 'money', p: [1, 6.6, 33.5], t: [0.6, 4.9, 0], shift: [0.2, 0] },
    pieces: { money: {} },
  },
  {
    act: 1,
    layout: 'left',
    h: '钱多了，<br>每块钱就“不值钱”了',
    sub: '就像一壶茶：茶叶（实实在在的东西）没多出多少，水（钱）却一直往里加，茶就越来越淡。钱比东西多得快，同样 100 块能买到的东西就越来越少——这就是货币贬值。',
    extra: '<p class="note">物价不一定马上涨：多出来的钱，有的进了房子、股票、黄金，有的就趴在银行里（下一页）。</p>',
    cam: { at: 'dilute', p: [2.4, 6.8, 21.5], t: [1.0, 4.8, 0], shift: [0.23, 0] },
    pieces: { dilute: {} },
  },
  {
    act: 1,
    layout: 'left',
    h: '不是没钱，<br>是钱不敢动',
    sub: '放出来的钱，大多没流进消费和投资，而是存进了银行。钱趴着不动，生意就更难做。',
    cam: { at: 'tank', p: [-3.5, 7.2, 22.5], t: [1.0, 4.2, 0], shift: [0.21, 0] },
    pieces: { tank: {} },
  },
  {
    act: 1,
    layout: 'top',
    h: '利息为什么<br>涨不回去？',
    sub: '一是经济还弱，企业、地方、家庭都背着债，利息一高就还不起。二是汇率：',
    extra: chain(['利息一涨', '外面的钱涌进来换人民币', '人民币变贵', '我们的货在国外变贵', '订单跑了']),
    cam: { at: 'seesaw', p: [0, 5.6, 24.5], t: [0, 2.0, 0], shift: [0, 0.19] },
    pieces: { seesaw: { step: 'tilt' } },
  },
  {
    act: 1,
    layout: 'top',
    h: '“保出口、稳汇率”，<br>把利率压在低位',
    sub: '所以，高息存款的时代，很难再回来了。',
    cam: { at: 'seesaw', p: [-1.5, 6.6, 22.5], t: [-0.6, 2.6, 0], shift: [0, 0.15] },
    pieces: { seesaw: { step: 'press' } },
  },

  /* ---------- 第二幕：汇率 ---------- */
  {
    act: 2,
    layout: 'top',
    eyebrow: '<b>第二幕</b>汇率',
    h: '人民币汇率，<br>是一场长期拔河',
    sub: '一边往上拉，一边往下拽。',
    cam: { at: 'tug', p: [0, 5.0, 20.5], t: [0, 1.6, 0], shift: [0, 0.15] },
    pieces: { tug: { step: 'pull' } },
  },
  {
    act: 2,
    layout: 'top',
    h: '谁也拉不倒谁：<br>未来大概率双向、大幅波动',
    sub: '过去十年，美元兑人民币在 6.3 到 7.3 之间来回拉锯。2025 年 4 月到现在，人民币又升值了约 9%（7.35 → 6.66）。',
    cam: { at: 'tug', p: [0, 6.8, 26.5], t: [0, 4.2, -2.2], shift: [0, 0.13] },
    pieces: { tug: { step: 'chart' } },
  },
  {
    act: 2,
    layout: 'left',
    h: '别只为 3.6% 的利息<br>去存美元',
    sub: '碰上人民币升值 5%，就是赚了利息、亏了汇率。',
    extra: '<p class="note">假设：100 万换成美元存 1 年，年息 3.6%，期间人民币升值 5%。实际上过去一年（7.11 → 6.66），人民币就升值了约 6%。</p>',
    cam: { at: 'trap', p: [-1.6, 4.8, 18.5], t: [0.8, 3.7, 0], shift: [0.21, 0] },
    pieces: { trap: {} },
  },
  {
    act: 2,
    layout: 'top',
    h: '想盖过汇率波动，<br>得靠长期复利',
    sub: '汇率只是来回晃；好资产的复利，时间越长，差距拉得越大。',
    cam: { at: 'compoundA', p: [0, 4.6, 21.5], t: [0, 3.7, 0], shift: [0, 0.12] },
    pieces: { compoundA: {} },
  },

  /* ---------- 第三幕：思路 ---------- */
  {
    act: 3,
    layout: 'left',
    eyebrow: '<b>第三幕</b>思路',
    h: '您的身家，<br>都在同一条船上',
    sub: '公司、房产、人脉、现金流，100% 绑在国内经济周期里。',
    cam: { at: 'islands', p: [-0.5, 7.4, 20], t: [-5.4, 1.4, 1.2], shift: [0.21, 0.02] },
    pieces: { islands: { step: 1 } },
  },
  {
    act: 3,
    layout: 'top',
    h: '拿一部分闲钱配到全球，<br>给主业上一份“保险”',
    sub: '不是为了炒股暴富。两边不同步：这边起风浪，那边未必。',
    cam: { at: 'islands', p: [2.4, 10.5, 29], t: [1.8, 1.8, -1.5], shift: [0, 0.14] },
    pieces: { islands: { step: 2 } },
  },
  {
    act: 3,
    layout: 'top',
    h: '买指数，自带“末位淘汰”',
    sub: '不用挑个股，也不用赌眼光：衰落的公司会被调出去，新冒出来的大公司会被补进来。标普 500 平均每年要换掉二十多家。',
    cam: { at: 'roster', p: [0, 6.4, 25], t: [0, 2.9, 0], shift: [0, 0.16] },
    pieces: { roster: {} },
  },
  {
    act: 3,
    layout: 'left',
    h: '巴菲特的十年赌约',
    sub: '2008 到 2017 年：最普通的标普 500 指数基金，赢了华尔街精挑细选的对冲基金组合。',
    extra: '<p class="note">巴菲特给妻子的遗产安排也写明：90% 买低成本的标普 500 指数基金。</p>',
    cam: { at: 'bet', p: [-2.2, 5.0, 17], t: [0.5, 3.0, 0], shift: [0.21, 0] },
    pieces: { bet: {} },
  },

  /* ---------- 第四幕：标普 500 ---------- */
  {
    act: 4,
    layout: 'top',
    eyebrow: '<b>第四幕</b>标普 500',
    h: '标普 500：<br>美国 500 家头部大公司',
    sub: '买一份标普 500 基金，就等于按比例，一次买下这 500 家公司。',
    cam: { at: 'city', p: [-4, 19, 36], t: [1, 0.4, 0], shift: [0, 0.14] },
    pieces: { city: { step: 'rise' } },
  },
  {
    act: 4,
    layout: 'left',
    h: '长期平均，<br>每年约 <em class="blue">10%</em>',
    sub: '近百年的历史平均（含分红，按美元算）。不是年年都赚，但长期就是这么走过来的。',
    cam: { at: 'city', p: [10, 50, 31], t: [1, 0, -1], fov: 30, shift: [0.24, 0] },
    pieces: { city: { step: 'aerial' } },
  },
  {
    act: 4,
    layout: 'top',
    h: '里面都是谁？',
    sub: '很多是您天天在用的：手机、电脑、搜索、网购、电动车……前十大公司加起来，约占四成。',
    extra: '<p class="note">权重为 2026 年 11 月 23 日标普 500 指数基金的持仓。</p>',
    cam: { at: 'skyline', p: [0, 8.2, 24.5], t: [0, 2.4, -2.2], shift: [0, 0.16] },
    pieces: { skyline: { mode: 'spx' } },
  },
  {
    act: 4,
    layout: 'top',
    h: '纳斯达克 100：<br>科技巨头扎堆的指数',
    sub: '在纳斯达克上市的 100 家最大的非金融公司（没有银行）。前十大差不多占一半；过去十年年化约 19%，比标普还猛。',
    cam: { at: 'skyline', p: [0, 8.2, 24.5], t: [0, 2.4, -2.2], shift: [0, 0.16] },
    pieces: { skyline: { mode: 'ndx' } },
  },
  {
    act: 4,
    layout: 'top',
    h: '为什么主角是标普，<br>不是纳指？',
    sub: '纳指扎堆科技股，涨得猛，跌得也狠。标普行业更均衡，更适合当压舱石。',
    cam: { at: 'city', p: [12, 22, 50], t: [12, 1, 0], shift: [0, 0.12] },
    pieces: { city: { step: 'vs' } },
  },
  {
    act: 4,
    layout: 'left',
    h: '历史最大回撤：<br><em class="red">−86%</em>',
    sub: '1929 年大萧条，标普最深跌了 86%。按指数点位算，整整 25 年才回到原来的高点；算上分红再投资，也要 15 年左右。',
    extra: '<p class="note">这是近百年里最惨的一次。图里每个“坑”：越深，跌得越多；越宽，回本越慢。</p>',
    cam: { at: 'underwater', p: [-8.0, 6.2, 26.5], t: [-11.0, 5.2, 0], shift: [0.27, 0] },
    pieces: { underwater: { step: 'deep' } },
  },
  {
    act: 4,
    layout: 'top',
    h: '二战后最深的一次：2008 年，−57%',
    sub: '那次用了 5 年半才回本。近 50 年的几次大跌，短的几个月、长的 7 年半，最后都涨回来了。',
    cam: { at: 'underwater', p: [9, 6.6, 25.5], t: [8.4, 4.6, 0], shift: [0, 0.13] },
    pieces: { underwater: { step: 'modern' } },
  },
  {
    act: 4,
    layout: 'top',
    h: '十年前投 100 万，<br>现在是多少？',
    sub: '2016 年 11 月买入标普 500，一直拿到今天：含分红、换回人民币，大约 369 万，年化约 14%。',
    extra: '<p class="note">这十年是美股特别好的十年，不能当成常态。这是指数数据，没扣基金费用（每年约 0.75%–0.8%），实际到手会少一些。</p>',
    cam: { at: 'tenyear', p: [0, 6.0, 29.5], t: [0, 4.2, 0], shift: [0, 0.17] },
    pieces: { tenyear: { step: 'path' } },
  },
  {
    act: 4,
    layout: 'top',
    h: '换个十年，结果可能差很多',
    sub: '同样是 100 万、拿十年：',
    extra: '<p class="note">1926 年以来，约 95% 的十年是赚钱的；最差的是 1929–1939 年，按美元算每年 −4%。</p>',
    cam: { at: 'tenyear', p: [0, 5.4, 26], t: [0, 3.5, 0], shift: [0, 0.23] },
    pieces: { tenyear: { step: 'compare' } },
  },

  /* ---------- 第五幕：黄金 ---------- */
  {
    act: 5,
    layout: 'left',
    eyebrow: '<b>第五幕</b>黄金',
    h: '第二样：<em>黄金</em>',
    sub: '美股大跌、打仗、闹危机的时候，黄金往往扛得住，和标普长期“不同步”。国内黄金 ETF 当天买、当天就能卖（T+0），变现快。',
    cam: { at: 'gold', p: [-1.6, 5.4, 17], t: [2.4, 1.5, 0], shift: [0.21, 0] },
    pieces: { gold: {} },
  },
  {
    act: 5,
    layout: 'left',
    h: '黄金最重要的作用：<br>对抗“钱变薄”',
    sub: '钞票可以一直印，黄金印不出来。同样一根 1 公斤的金条：2005 年约 13 万元，2015 年约 22 万元，现在约 78 万元。金条没变，变的是钱。',
    cam: { at: 'goldfiat', p: [1.8, 6.2, 27.5], t: [1.3, 3.0, 0], shift: [0.22, 0] },
    pieces: { goldfiat: {} },
  },
  {
    act: 5,
    layout: 'top',
    h: '黄金的历史走势',
    sub: '1971 年美元和黄金脱钩，金价从 35 美元起步，今年 1 月最高接近 5,600 美元。但它也有过很长的熊市，今年也刚从高点跌了三成多。',
    extra: '<p class="note">所以黄金是“保险”，不是“发动机”：适合配一部分，不适合全押。国内金价：今年 1 月最高约 1,243 元/克，现在约 777 元/克。</p>',
    cam: { at: 'goldhist', p: [0, 5.0, 34.5], t: [0, 4.1, 0], shift: [0, 0.15] },
    pieces: { goldhist: {} },
  },

  /* ---------- 第六幕：风险 ---------- */
  {
    act: 6,
    layout: 'top',
    eyebrow: '<b>第六幕</b>风险',
    h: '可能的风险',
    extra: '<ol class="risks"><li><b>1</b>会大跌</li><li><b>2</b>汇率会波动</li><li><b>3</b>场内 ETF 有溢价</li></ol>',
    cam: { at: 'coaster', p: [0, 9.5, 64], t: [0, 6.4, 0], shift: [0, 0.1] },
    pieces: { coaster: { step: 'all' } },
  },
  {
    act: 6,
    layout: 'top',
    h: '风险一：会大跌',
    sub: '2008 年金融危机，标普最深跌了 57%：100 万一度只剩 43 万。到时候拿不拿得住，要先想清楚。',
    cam: { at: 'coaster', p: [-9.5, 7.2, 25], t: [-10.0, 3.4, 0], shift: [0, 0.15] },
    pieces: { coaster: { step: '2008' } },
  },
  {
    act: 6,
    layout: 'top',
    h: '2020 年：一个月跌掉三成多',
    sub: '疫情恐慌，美股两周之内 4 次熔断。',
    cam: { at: 'coaster', p: [15.2, 9.0, 23], t: [15.0, 6.2, 0], shift: [0, 0.15] },
    pieces: { coaster: { step: '2020' } },
  },
  {
    act: 6,
    layout: 'top',
    h: '但每一次，最后都涨了回来',
    sub: '而且都创了新高。前提是：用的是闲钱，拿得住。',
    extra: '<p class="note">眼下这一次（2026 年 11 月，从高点回调了约 12%）还在进行中。</p>',
    cam: { at: 'coaster', p: [3, 10, 62], t: [1.5, 6.6, 0], shift: [0, 0.1] },
    pieces: { coaster: { step: 'recover' } },
  },
  {
    act: 6,
    layout: 'top',
    h: '标普和黄金，也可能一起跌',
    sub: '市场一紧张，有人急着补保证金、换现金，能卖的先卖，好东西也被一起抛。这是短期的踩踏。',
    extra: '<p class="note">就在这个月：11 月 11 日到 19 日，标普连跌 6 天、跌了约 6%，黄金同期跌了约 9%。2020 年 3 月也一起跌过，几个月后两者都创了新高。</p>',
    cam: { at: 'stampede', p: [0.5, 17, 18.5], t: [0.5, 0, 0.5], shift: [0, 0.22] },
    pieces: { stampede: {} },
  },
  {
    act: 6,
    layout: 'left',
    h: '还没买完的钱，<br>碰上下跌是好事',
    sub: '因为要分批买，后面的钱碰上下跌，就能买得更便宜：同样 1 万块，原价买 10 份；跌了三成，能买 14 份多。',
    cam: { at: 'discount', p: [-1.0, 4.8, 17], t: [0.4, 2.3, 1.0], shift: [0.23, 0] },
    pieces: { discount: {} },
  },
  {
    act: 6,
    layout: 'top',
    h: '风险二：汇率会波动',
    sub: '短期上下几个点很正常，靠时间和复利去覆盖。',
    cam: { at: 'compoundB', p: [0, 4.6, 21.5], t: [0, 3.7, 0], shift: [0, 0.12] },
    pieces: { compoundB: {} },
  },
  {
    act: 6,
    layout: 'left',
    h: '风险三：<br>场内 ETF 的溢价',
    sub: '基金的外汇额度用完了，就发不出新份额，大家只能在场内互相买，价格就被抢得比基金实际值还贵。溢价 10%，就是花 110 块买 100 块的东西。',
    extra: '<p class="note">现在标普 ETF 溢价常在 5%–10%，纳指 ETF 在 10%–20%，个别超过 40%。11 月多次因溢价过高在开盘后临时停牌一小时，11 月 24 日一天就有 17 只。</p>',
    cam: { at: 'premium', p: [-1.8, 4.6, 16.5], t: [0.6, 3.0, 0], shift: [0.21, 0] },
    pieces: { premium: {} },
  },

  /* ---------- 第七幕：方案 ---------- */
  {
    act: 7,
    layout: 'left',
    eyebrow: '<b>第七幕</b>方案',
    h: '拿得越久，<br>赚钱的把握越大',
    sub: '历史上随便哪天买入标普 500，拿住不同年限后，赚钱的概率：',
    extra: '<p class="note">美国股市 1926 年以来的历史统计（含分红），不代表未来。</p>',
    cam: { at: 'glasses', p: [-1.8, 6.0, 22.5], t: [0.6, 3.1, 0], shift: [0.21, 0] },
    pieces: { glasses: {} },
  },
  {
    act: 7,
    layout: 'left',
    h: '200 万，<br>这样分',
    sub: '70% 买标普 500，30% 买黄金。',
    extra: '<p class="note">按历史数据回测：2006 年至今这样配、每年把比例调回 70/30，年化约 11%（美元计）；最难的 2008 年全年亏约 25%，同期标普单独亏了 37%。历史不代表未来。</p>',
    cam: { at: 'alloc', p: [11, 9.5, 21], t: [0.6, 3.0, 0], shift: [0.21, 0.02] },
    pieces: { alloc: { mode: 'alloc' } },
  },
  {
    act: 7,
    layout: 'left',
    h: '能一次买齐最好，<br>但标普只能分批进场',
    sub: '黄金 ETF 没有额度限制，60 万可以一次买齐。标普这部分受外汇额度限制：场内 ETF 常有溢价，场外基金每天限购，140 万很难一次低价买齐——只能溢价低时买一批，实际上就成了“定投”。',
    cam: { at: 'alloc', p: [6, 15.5, 27], t: [2.2, 2.0, 2.2], shift: [0.21, 0.02] },
    pieces: { alloc: { mode: 'batch' } },
  },

  /* ---------- 第八幕：怎么买 ---------- */
  {
    act: 8,
    layout: 'top',
    eyebrow: '<b>第八幕</b>怎么买',
    h: '买标普 500，有三条合规的路',
    sub: '路一最方便，但场内 ETF 常有溢价：成交价比基金实际值贵，买之前一定先看溢价率。',
    cam: { at: 'paths', p: [0, 20, 32], t: [0, 0, -2.6], shift: [0, 0.15] },
    pieces: { paths: { focus: 0 } },
  },
  {
    act: 8,
    layout: 'left',
    h: '路一：A 股证券账户',
    sub: '在场内买标普 500 ETF，用人民币直接买卖，和买股票一样。',
    extra: spec(
      [
        ['费用', '管理费 + 托管费约 0.75%–0.8%/年'],
        ['额度', '个人买入不限额，也不占个人购汇额度'],
        ['溢价', '基金额度用完、暂停申购，场内价格常比实际值贵 5%–10%'],
        ['怎么做', '买前看溢价率（行情软件里能查），挑溢价低的那只；溢价高了就先等等'],
      ],
      '<span class="tag blue">目前最可行</span>',
    ),
    cam: { at: 'paths', p: [-3, 3.6, 15.5], t: [2.2, 1.3, 4.6], shift: [0.22, 0] },
    pieces: { paths: { focus: 1 } },
  },
  {
    act: 8,
    layout: 'left',
    h: '路二：银行 / 基金 APP',
    sub: '买场外的 QDII 基金。',
    extra: spec(
      [
        ['费用', '约 1.15%/年起（C 类）；A 类另收申购费'],
        ['额度', '额度紧张，现在大多每天限购 10 元以内，有的直接暂停申购'],
        ['适合', '小额慢慢买；大钱基本买不进去'],
      ],
      '<span class="tag silver">现在基本买不进</span>',
    ),
    cam: { at: 'paths', p: [-5.5, 5.2, 12], t: [1.6, 1.3, -1.2], shift: [0.21, 0] },
    pieces: { paths: { focus: 2 } },
  },
  {
    act: 8,
    layout: 'left',
    h: '路三：本人赴港开户',
    sub: '直接买美股 VOO（跟踪标普 500 的 ETF）。',
    extra: spec(
      [
        ['费用', 'VOO 管理费仅 0.03%/年'],
        ['资产', '真正的美元资产'],
        ['额度', '每人每年 5 万美元购汇额度，但明确不能用于境外证券投资，违规会被列入关注名单'],
        ['注意', '今年起，老虎、富途、长桥对内地客户只许卖出、不许新买。资金怎么合规出境，务必先问清楚'],
      ],
      '<span class="tag green">费率最低，门槛最高</span>',
    ),
    cam: { at: 'paths', p: [-2.5, 7.2, 4.5], t: [1.2, 1.9, -8.6], shift: [0.24, 0] },
    pieces: { paths: { focus: 3 } },
  },
  {
    act: 8,
    layout: 'center table',
    h: '三条路，一张表',
    extra: `<div class="cmpwrap"><table class="cmp">
      <thead><tr><th></th><th><span class="tag blue">目前最可行</span>路一<small>A 股账户 · 场内 ETF</small></th><th>路二<small>银行 / APP · 场外 QDII 基金</small></th><th>路三<small>赴港开户 · VOO</small></th></tr></thead>
      <tbody>
        <tr><th>费用</th><td><b>约 0.75%–0.8%/年</b></td><td>约 1.15%/年起</td><td><b>0.03%/年</b></td></tr>
        <tr><th>额度</th><td>个人买入不限额</td><td>大多每天限购 10 元以内</td><td>每人每年 5 万美元，且不能用于证券投资</td></tr>
        <tr><th>当心</th><td>溢价 5%–10%，常临时停牌</td><td>买不进大钱</td><td>资金出境必须合规</td></tr>
        <tr><th>省心</th><td>自己用软件下单</td><td>最省心</td><td>要本人跑一趟香港</td></tr>
        <tr><th>资产</th><td>人民币计价</td><td>人民币计价</td><td>真美元资产</td></tr>
        <tr><th>适合</th><td>会看溢价、能分批买的人</td><td>小额慢慢买</td><td>已有合规境外资金的人</td></tr>
      </tbody></table></div>`,
    cam: { at: 'paths', p: [0, 21, 31], t: [0, 0, -3], shift: [0, 0] },
    pieces: { paths: { focus: 0, dim: true } },
  },

  /* ---------- 收尾 ---------- */
  {
    act: 8,
    layout: 'top',
    eyebrow: '最后，一句话',
    h: '不赌方向，不追热点，<em>长期拿住</em>',
    sub: '70% 标普 500 · 30% 黄金 · 分批进场 · 拿得住',
    extra: '<p class="legal">本演示只用于讲清思路：历史数据不代表未来，不构成投资建议。产品、费率、额度以届时官方信息为准。数据截至 2026 年 11 月 24 日。</p>',
    cam: { at: 'finale', p: [0, 9.0, 33], t: [0, 3.0, 0], shift: [0, 0.21] },
    pieces: { finale: { mode: 'final' } },
  },
];
