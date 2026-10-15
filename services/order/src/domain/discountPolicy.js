// FR08 / UC07: giảm giá dựa trên score của hạng thành viên.
// LƯU Ý: tài liệu thiết kế KHÔNG quy định công thức -> đây là GIẢ ĐỊNH, cấu hình được qua DISCOUNT_TIERS
// Định dạng "score:phần_trăm", ví dụ "0:0,100:5,500:10,1000:15" nghĩa là score >= 500 được giảm 10%.
function parseTiers(str) {
  return String(str || '0:0,100:5,500:10,1000:15')
    .split(',')
    .map((p) => p.split(':').map(Number))
    .filter(([s, r]) => Number.isFinite(s) && Number.isFinite(r))
    .sort((a, b) => a[0] - b[0]);
}

function discountRate(score, tiers = parseTiers(process.env.DISCOUNT_TIERS)) {
  let rate = 0;
  for (const [minScore, pct] of tiers) if (score >= minScore) rate = pct;
  return rate;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Trả về SỐ TIỀN giảm (UC07: "calculates discount amount"), lưu vào Order.discount DECIMAL(10,2)
function calculateDiscount(subtotal, score, tiers) {
  return round2((subtotal * discountRate(score, tiers)) / 100);
}

module.exports = { parseTiers, discountRate, calculateDiscount, round2 };
