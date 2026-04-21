/**
 * Low-cardinality browser fingerprint for span attributes (not full UA).
 * Tradeoff: loses engine detail and rare browsers map to `other`.
 */
export function telemetryUserAgentSummary(raw: string | undefined): string {
  if (raw === undefined) {
    return "other";
  }
  const ua = raw.trim();
  if (ua.length === 0) {
    return "other";
  }

  const crios = /CriOS\/(\d+)/.exec(ua);
  if (crios?.[1] !== undefined) {
    return `chrome/${crios[1]}`;
  }

  const edg = /Edg(?:e)?\/(\d+)/i.exec(ua);
  if (edg?.[1] !== undefined) {
    return `edge/${edg[1]}`;
  }

  const opr = /OPR\/(\d+)/.exec(ua);
  if (opr?.[1] !== undefined) {
    return `opera/${opr[1]}`;
  }

  if (/Brave/i.test(ua)) {
    const chrome = /Chrome\/(\d+)/.exec(ua);
    if (chrome?.[1] !== undefined) {
      return `brave/${chrome[1]}`;
    }
  }

  const fx = /Firefox\/(\d+)/i.exec(ua);
  if (fx?.[1] !== undefined) {
    return `firefox/${fx[1]}`;
  }

  const chrome = /Chrome\/(\d+)/.exec(ua);
  if (chrome?.[1] !== undefined) {
    return `chrome/${chrome[1]}`;
  }

  const samsung = /SamsungBrowser\/(\d+)/.exec(ua);
  if (samsung?.[1] !== undefined) {
    return `samsung/${samsung[1]}`;
  }

  const safari = /Version\/(\d+)[\s\S]*Safari/i.exec(ua);
  if (safari?.[1] !== undefined && !/Chrome|Chromium|Edg|CriOS|OPR/i.test(ua)) {
    return `safari/${safari[1]}`;
  }

  return "other";
}
