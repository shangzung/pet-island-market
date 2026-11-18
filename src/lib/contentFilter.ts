// 違禁敏感關鍵字清單（防現金買賣、代儲、詐騙、外掛廣告）
const FORBIDDEN_KEYWORDS = [
  '台幣',
  '新台幣',
  'ntd',
  '匯款',
  '轉帳',
  '網銀',
  'linepay',
  'line pay',
  '街口',
  '8591',
  '代儲',
  '代刷',
  '賣帳號',
  '買帳號',
  '收帳號',
  '現金交易',
  '現金收',
  '現金賣',
  '實收',
  '外掛',
  '腳本',
  '修改器',
];

export function checkSensitiveContent(text: string): { isClean: boolean; matchedWord?: string } {
  if (!text) return { isClean: true };
  const normalized = text.toLowerCase().replace(/\s+/g, '');

  for (const word of FORBIDDEN_KEYWORDS) {
    const cleanWord = word.toLowerCase().replace(/\s+/g, '');
    if (normalized.includes(cleanWord)) {
      return { isClean: false, matchedWord: word };
    }
  }

  return { isClean: true };
}