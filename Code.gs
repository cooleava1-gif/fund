const TITLE = "持仓面板";

function doGet() {
  const t = HtmlService.createTemplateFromFile("Index");
  t.title = TITLE;
  return t.evaluate()
    .setTitle(TITLE)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** 读全部持仓 */
function API_holdings_get() {
  return { ok: true, items: getHoldings_() };
}

/** 新增持仓：必须带 cost（由前端推算/手填） */
function API_holding_add(payload) {
  try {
    const p = payload || {};
    const kind = (p.kind === "sec") ? "sec" : "fund";
    const buyDate = normDate_(String(p.buyDate || "")) || todayCN_();
    const amount = num_(p.amount);
    const cost = num_(p.cost);

    if (!(amount > 0)) throw new Error("投入金额必须 > 0");
    if (!(cost > 0)) throw new Error("成本单价缺失：请手填或让前端自动推算");

    const item = {
      id: String(Date.now()) + "_" + Math.floor(Math.random() * 100000),
      kind,
      buyDate,
      amount,
      cost,
      shares: amount / cost
    };

    if (!(item.shares > 0)) throw new Error("份额计算失败");

    if (kind === "fund") {
      const code = String(p.code || "").trim();
      if (!/^\d{6}$/.test(code)) throw new Error("基金代码应为6位数字");
      item.code = code;
      item.symbol = "";
    } else {
      let symbol = String(p.symbol || "").trim().toLowerCase();
      if (/^\d{6}$/.test(symbol)) symbol = "sz" + symbol;
      if (!/^(sh|sz)\d{6}$/.test(symbol)) throw new Error("场内代码格式：sz161226 / sh510300（或只填6位默认sz）");
      item.symbol = symbol;
      item.code = "";
    }

    const holdings = getHoldings_();
    holdings.push(item);
    saveHoldings_(holdings);

    return { ok: true, id: item.id };
  } catch (e) {
    return { ok: false, reason: String(e && e.message ? e.message : e) };
  }
}

/** 更新持仓（买入日/投入/成本） */
function API_holding_upd(payload) {
  try {
    const p = payload || {};
    const id = String(p.id || "");
    const holdings = getHoldings_();
    const idx = holdings.findIndex(x => x.id === id);
    if (idx < 0) throw new Error("找不到该持仓");

    const buyDate = normDate_(String(p.buyDate || "")) || holdings[idx].buyDate || todayCN_();
    const amount = num_(p.amount);
    const cost = num_(p.cost);

    if (!(amount > 0)) throw new Error("投入金额必须 > 0");
    if (!(cost > 0)) throw new Error("成本单价缺失：请手填或让前端自动推算");

    holdings[idx].buyDate = buyDate;
    holdings[idx].amount = amount;
    holdings[idx].cost = cost;
    holdings[idx].shares = amount / cost;

    if (!(holdings[idx].shares > 0)) throw new Error("份额计算失败");

    saveHoldings_(holdings);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e && e.message ? e.message : e) };
  }
}

/** 删除持仓 */
function API_holding_del(id) {
  try {
    const holdings = getHoldings_().filter(x => x.id !== String(id || ""));
    saveHoldings_(holdings);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e && e.message ? e.message : e) };
  }
}

/** ===== 存储 ===== */
function getHoldings_() {
  const p = PropertiesService.getUserProperties().getProperty("holdings");
  if (!p) return [];
  try {
    const arr = JSON.parse(p);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}
function saveHoldings_(arr) {
  PropertiesService.getUserProperties().setProperty("holdings", JSON.stringify(arr || []));
}

/** ===== 工具 ===== */
function num_(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}
function normDate_(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
function todayCN_() {
  return Utilities.formatDate(new Date(), "Asia/Shanghai", "yyyy-MM-dd");
}
