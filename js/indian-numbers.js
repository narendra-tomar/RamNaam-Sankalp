// Indian numbering system helpers (Lakh / Crore grouping and labels)

export function formatIndianNumber(num) {
  const n = Math.round(Math.abs(Number(num) || 0));
  const str = String(n);
  if (str.length <= 3) return (num < 0 ? '-' : '') + str;
  let lastThree = str.slice(-3);
  let other = str.slice(0, -3);
  other = other.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + other + ',' + lastThree;
}

export function formatCroreLakh(num) {
  const n = Math.abs(Number(num) || 0);
  if (n >= 1e7) {
    const cr = n / 1e7;
    return `${cr.toFixed(cr >= 100 ? 1 : 2)} Crore`;
  }
  if (n >= 1e5) {
    const lakh = n / 1e5;
    return `${lakh.toFixed(2)} Lakh`;
  }
  if (n >= 1e3) {
    const th = n / 1e3;
    return `${th.toFixed(1)} Thousand`;
  }
  return `${Math.round(n)}`;
}

export function formatFull(num) {
  return `${formatIndianNumber(num)}`;
}
