function toDateString(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

function getEffectivePrice({ productId, date, priceHistoryMap, productBasePriceMap }) {
  const pid = typeof productId === 'string' ? parseInt(productId) : productId;
  const dk = date instanceof Date ? toDateString(date) : String(date).split('T')[0];

  const entries = priceHistoryMap?.[pid];
  if (entries?.length) {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const fromDate = e.validFrom instanceof Date
        ? e.validFrom.toISOString().split('T')[0]
        : String(e.validFrom).split('T')[0];
      const toDate = e.validTo
        ? (e.validTo instanceof Date ? e.validTo.toISOString().split('T')[0] : String(e.validTo).split('T')[0])
        : null;
      if (fromDate <= dk && (!toDate || dk < toDate)) {
        return Number(e.price);
      }
    }
  }

  if (productBasePriceMap?.[pid] != null) {
    return Number(productBasePriceMap[pid]);
  }

  return 0;
}

module.exports = { getEffectivePrice };
