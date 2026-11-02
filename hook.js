(() => {
  'use strict';
  const ORIGIN = 'https://flow.google.com';
  const PATH = '/_/AiSandboxAngularFrontend/data/batchexecute';
  const RPC = 'cPZSdc';
  const FLAG_INDEX = 30;
  if (location.origin !== ORIGIN || window.__flowHelperRuInstalled) return;
  window.__flowHelperRuInstalled = true;

  function locateFlag(payload) {
    if (payload.length > FLAG_INDEX && (typeof payload[FLAG_INDEX] === 'boolean' || payload[FLAG_INDEX] === null)) return FLAG_INDEX;
    const lo = Math.max(0, FLAG_INDEX - 10), hi = Math.min(payload.length - 1, FLAG_INDEX + 10);
    const candidates = [];
    for (let i = lo; i <= hi; i++) if (typeof payload[i] === 'boolean') candidates.push(i);
    if (candidates.length === 1) return candidates[0];
    if (candidates.includes(FLAG_INDEX)) return FLAG_INDEX;
    if (candidates.length > 1) throw new Error('Неоднозначная структура ответа Flow');
    const nulls = [];
    for (let i = lo; i <= hi; i++) if (payload[i] === null) nulls.push(i);
    if (nulls.length === 1) return nulls[0];
    throw new Error('Флаг региона не найден в ответе Flow');
  }
  function lengthUnit(declared, line) {
    const byteLen = new TextEncoder().encode(line).length;
    if (Math.abs(declared - byteLen) <= 2) return s => new TextEncoder().encode(s).length + (declared - byteLen);
    if (Math.abs(declared - line.length) <= 2) return s => s.length + (declared - line.length);
    throw new Error('Не совпала длина RPC-фрейма');
  }
  function patch(text) {
    const lines = text.split('\n');
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].startsWith('[[')) continue;
      let envelope;
      try { envelope = JSON.parse(lines[i]); } catch { continue; }
      if (!Array.isArray(envelope)) continue;
      let changed = false;
      for (const entry of envelope) {
        if (!Array.isArray(entry) || entry[0] !== 'wrb.fr' || entry[1] !== RPC) continue;
        if (typeof entry[2] !== 'string') continue;
        let payload;
        try { payload = JSON.parse(entry[2]); } catch { continue; }
        if (!Array.isArray(payload) || payload.length <= FLAG_INDEX) continue;
        const idx = locateFlag(payload);
        if (payload[idx] !== true) { payload[idx] = true; count++; }
        entry[2] = JSON.stringify(payload);
        changed = true;
      }
      if (changed) {
        const oldLine = lines[i].replace(/\r$/, '');
        const declared = Number(lines[i - 1]);
        if (!Number.isFinite(declared)) return text;
        let calc;
        try { calc = lengthUnit(declared, oldLine); } catch { return text; }
        const newLine = JSON.stringify(envelope);
        lines[i - 1] = String(calc(newLine));
        lines[i] = newLine;
      }
    }
    if (count) console.info('[Flow Helper RU] Региональный флаг ответа изменён:', count);
    return count ? lines.join('\n') : text;
  }
  function isTarget(url) {
    try {
      const u = new URL(url, location.href);
      return u.origin === ORIGIN && u.pathname === PATH && (u.searchParams.get('rpcids') || '').split(',').includes(RPC);
    } catch { return false; }
  }

  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrTarget = new WeakMap();
  const xhrPatched = new WeakMap();
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    xhrTarget.set(this, isTarget(url));
    xhrPatched.delete(this);
    return Reflect.apply(xhrOpen, this, [method, url, ...rest]);
  };
  for (const prop of ['responseText', 'response']) {
    const d = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, prop);
    if (!d?.get || !d.configurable) continue;
    Object.defineProperty(XMLHttpRequest.prototype, prop, {
      ...d,
      get() {
        const value = Reflect.apply(d.get, this, []);
        if (!xhrTarget.get(this) || typeof value !== 'string') return value;
        if (this.readyState === 3) return ''; // do not expose a partial batchexecute frame
        if (this.readyState !== 4) return value;
        if (!xhrPatched.has(this)) xhrPatched.set(this, patch(value));
        return xhrPatched.get(this);
      }
    });
  }
  const nativeFetch = window.fetch;
  if (typeof nativeFetch === 'function') {
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input?.url;
      const response = await Reflect.apply(nativeFetch, this, [input, init]);
      if (!isTarget(url)) return response;
      try {
        const original = await response.clone().text();
        const modified = patch(original);
        if (modified === original) return response;
        const headers = new Headers(response.headers);
        headers.delete('content-length');
        headers.delete('content-encoding');
        return new Response(modified, { status: response.status, statusText: response.statusText, headers });
      } catch (e) {
        console.warn('[Flow Helper RU] Ответ не изменён:', e);
        return response;
      }
    };
  }
  console.info('[Flow Helper RU] Локальный обработчик включён.');
})();
