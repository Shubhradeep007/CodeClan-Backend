/**
 * seed-snippets.js
 * Seeds 100 diverse public snippets via the CodeClan API.
 *
 * Usage:
 *   node seed-snippets.js --email your@email.com --password yourpassword
 *
 * Or set env vars:
 *   SEED_EMAIL=your@email.com  SEED_PASSWORD=yourpassword  node seed-snippets.js
 */

const https = require('https')
const http  = require('http')
const url   = require('url')

// ─── Config ───────────────────────────────────────────────────────────────
const BASE_URL  = process.env.SEED_API || 'http://localhost:4000'
const EMAIL     = process.argv[3] || process.env.SEED_EMAIL    || 'shubho@yopmail.com'
const PASSWORD  = process.argv[5] || process.env.SEED_PASSWORD || 'shubho@1234'
const BATCH     = 5     // concurrent requests at a time
const TOTAL     = 100

if (!EMAIL || !PASSWORD) {
  console.error('\n❌  Provide credentials:\n')
  console.error('   node seed-snippets.js --email you@example.com --password secret\n')
  process.exit(1)
}

// ─── HTTP helper ──────────────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const parsed  = url.parse(BASE_URL + path)
    const payload = body ? JSON.stringify(body) : null
    const lib     = parsed.protocol === 'https:' ? https : http

    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token    ? { Authorization: `Bearer ${token}` }           : {}),
      },
    }

    const req = lib.request(options, (res) => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })

    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// ─── Snippet seed data ────────────────────────────────────────────────────
const LANGUAGES = ['js','ts','py','go','rs','java','cpp','bash','sql','php','rb']

const TEMPLATES = [
  // JavaScript
  { lang:'js', title:'Debounce Function', tags:['utils','performance'],
    code:`function debounce(fn, delay) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}` },
  { lang:'js', title:'Deep Clone Object', tags:['utils','object'],
    code:`const deepClone = obj => JSON.parse(JSON.stringify(obj));` },
  { lang:'js', title:'Flatten Nested Array', tags:['array','utils'],
    code:`const flatten = arr => arr.reduce((flat, item) =>\n  flat.concat(Array.isArray(item) ? flatten(item) : item), []);` },
  { lang:'js', title:'Throttle Function', tags:['performance','utils'],
    code:`function throttle(fn, limit) {\n  let lastCall = 0;\n  return (...args) => {\n    const now = Date.now();\n    if (now - lastCall >= limit) { lastCall = now; return fn(...args); }\n  };\n}` },
  { lang:'js', title:'Event Emitter Class', tags:['patterns','oop'],
    code:`class EventEmitter {\n  #listeners = {};\n  on(event, fn) { (this.#listeners[event] ??= []).push(fn); }\n  emit(event, ...args) { (this.#listeners[event] ?? []).forEach(fn => fn(...args)); }\n  off(event, fn) { this.#listeners[event] = (this.#listeners[event] ?? []).filter(f => f !== fn); }\n}` },

  // TypeScript
  { lang:'ts', title:'Generic Retry Wrapper', tags:['async','utils','typescript'],
    code:`async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 300): Promise<T> {\n  try { return await fn(); }\n  catch (err) {\n    if (retries <= 0) throw err;\n    await new Promise(r => setTimeout(r, delay));\n    return retry(fn, retries - 1, delay * 2);\n  }\n}` },
  { lang:'ts', title:'DeepPartial Utility Type', tags:['types','typescript'],
    code:`type DeepPartial<T> = T extends object\n  ? { [P in keyof T]?: DeepPartial<T[P]> }\n  : T;` },
  { lang:'ts', title:'Readonly Deep Type', tags:['types','typescript'],
    code:`type DeepReadonly<T> = T extends (infer E)[]\n  ? ReadonlyArray<DeepReadonly<E>>\n  : T extends object\n  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }\n  : T;` },
  { lang:'ts', title:'Result Type Pattern', tags:['patterns','typescript','error-handling'],
    code:`type Ok<T>  = { ok: true;  value: T };\ntype Err<E> = { ok: false; error: E };\ntype Result<T, E = Error> = Ok<T> | Err<E>;\n\nconst ok  = <T>(v: T): Ok<T>   => ({ ok: true,  value: v });\nconst err = <E>(e: E): Err<E>  => ({ ok: false, error: e });` },
  { lang:'ts', title:'Paginated Response Type', tags:['api','types'],
    code:`interface PaginatedResponse<T> {\n  data:       T[];\n  total:      number;\n  page:       number;\n  totalPages: number;\n  hasNext:    boolean;\n  hasPrev:    boolean;\n}` },

  // Python
  { lang:'py', title:'Memoize Decorator', tags:['decorator','performance'],
    code:`from functools import wraps\n\ndef memoize(fn):\n    cache = {}\n    @wraps(fn)\n    def wrapper(*args):\n        if args not in cache:\n            cache[args] = fn(*args)\n        return cache[args]\n    return wrapper` },
  { lang:'py', title:'Chunked List Iterator', tags:['utils','iterator'],
    code:`def chunks(lst, n):\n    """Yield successive n-sized chunks from lst.\"\"\"\n    for i in range(0, len(lst), n):\n        yield lst[i:i + n]` },
  { lang:'py', title:'Context Manager Timer', tags:['utils','performance'],
    code:`import time\nfrom contextlib import contextmanager\n\n@contextmanager\ndef timer(label=''):\n    start = time.perf_counter()\n    yield\n    elapsed = time.perf_counter() - start\n    print(f'{label}: {elapsed:.4f}s')` },
  { lang:'py', title:'Flatten Dict', tags:['dict','utils'],
    code:`def flatten_dict(d, parent_key='', sep='.'):\n    items = []\n    for k, v in d.items():\n        key = f'{parent_key}{sep}{k}' if parent_key else k\n        if isinstance(v, dict):\n            items.extend(flatten_dict(v, key, sep).items())\n        else:\n            items.append((key, v))\n    return dict(items)` },
  { lang:'py', title:'Async Retry with Backoff', tags:['async','utils','error-handling'],
    code:`import asyncio\n\nasync def retry(coro_fn, retries=3, backoff=0.5):\n    for attempt in range(retries):\n        try:\n            return await coro_fn()\n        except Exception as e:\n            if attempt == retries - 1:\n                raise\n            await asyncio.sleep(backoff * (2 ** attempt))` },

  // Go
  { lang:'go', title:'Generic Stack in Go', tags:['data-structures','generics'],
    code:`type Stack[T any] struct {\n    items []T\n}\nfunc (s *Stack[T]) Push(v T)        { s.items = append(s.items, v) }\nfunc (s *Stack[T]) Pop() (T, bool)  {\n    if len(s.items) == 0 {\n        var zero T\n        return zero, false\n    }\n    v := s.items[len(s.items)-1]\n    s.items = s.items[:len(s.items)-1]\n    return v, true\n}` },
  { lang:'go', title:'HTTP Middleware Chain', tags:['http','middleware'],
    code:`type Middleware func(http.Handler) http.Handler\n\nfunc Chain(h http.Handler, m ...Middleware) http.Handler {\n    for i := len(m) - 1; i >= 0; i-- {\n        h = m[i](h)\n    }\n    return h\n}` },
  { lang:'go', title:'Worker Pool Pattern', tags:['concurrency','patterns'],
    code:`func workerPool(jobs <-chan int, results chan<- int, n int) {\n    var wg sync.WaitGroup\n    for i := 0; i < n; i++ {\n        wg.Add(1)\n        go func() {\n            defer wg.Done()\n            for j := range jobs {\n                results <- j * j\n            }\n        }()\n    }\n    go func() { wg.Wait(); close(results) }()\n}` },

  // Rust
  { lang:'rs', title:'Builder Pattern in Rust', tags:['patterns','oop'],
    code:`#[derive(Default)]\npub struct Config {\n    pub host: String,\n    pub port: u16,\n}\n\npub struct ConfigBuilder(Config);\nimpl ConfigBuilder {\n    pub fn new() -> Self { Self(Config::default()) }\n    pub fn host(mut self, h: &str) -> Self { self.0.host = h.to_string(); self }\n    pub fn port(mut self, p: u16)  -> Self { self.0.port = p; self }\n    pub fn build(self) -> Config { self.0 }\n}` },
  { lang:'rs', title:'Custom Error with thiserror', tags:['error-handling','crates'],
    code:`use thiserror::Error;\n\n#[derive(Error, Debug)]\npub enum AppError {\n    #[error("Not found: {0}")]\n    NotFound(String),\n    #[error("Database error: {0}")]\n    Db(#[from] sqlx::Error),\n    #[error("IO error: {0}")]\n    Io(#[from] std::io::Error),\n}` },

  // Java
  { lang:'java', title:'Optional Chain Pattern', tags:['java','functional'],
    code:`import java.util.Optional;\n\npublic class UserService {\n    public String getCity(Long userId) {\n        return Optional.ofNullable(findUser(userId))\n            .map(User::getAddress)\n            .map(Address::getCity)\n            .orElse("Unknown");\n    }\n}` },
  { lang:'java', title:'Singleton Pattern', tags:['patterns','oop'],
    code:`public class Singleton {\n    private static volatile Singleton instance;\n    private Singleton() {}\n    public static Singleton getInstance() {\n        if (instance == null) synchronized (Singleton.class) {\n            if (instance == null) instance = new Singleton();\n        }\n        return instance;\n    }\n}` },

  // C++
  { lang:'cpp', title:'RAII File Handle', tags:['raii','memory'],
    code:`#include <fstream>\nstruct FileGuard {\n    std::fstream f;\n    FileGuard(const std::string& path, std::ios::openmode m) : f(path, m) {}\n    ~FileGuard() { if (f.is_open()) f.close(); }\n    FileGuard(const FileGuard&) = delete;\n};` },
  { lang:'cpp', title:'Variadic Template Sum', tags:['templates','cpp17'],
    code:`template<typename... Args>\nauto sum(Args... args) { return (args + ...); }  // fold expression\n\n// Usage:\nauto s = sum(1, 2, 3.14, 4);  // 10.14` },

  // Bash
  { lang:'bash', title:'Retry Command Script', tags:['bash','utils'],
    code:`#!/usr/bin/env bash\nretry() {\n  local n=$1; shift\n  for i in $(seq 1 "$n"); do\n    "$@" && return 0\n    echo "Attempt $i failed, retrying..." >&2\n    sleep $((i * 2))\n  done\n  return 1\n}\n# Usage: retry 3 curl https://example.com` },
  { lang:'bash', title:'Colorised Log Functions', tags:['bash','logging'],
    code:`#!/usr/bin/env bash\ninfo()  { echo -e "\\033[1;34m[INFO]\\033[0m  $*"; }\nwarn()  { echo -e "\\033[1;33m[WARN]\\033[0m  $*"; }\nerror() { echo -e "\\033[1;31m[ERROR]\\033[0m $*" >&2; }\nok()    { echo -e "\\033[1;32m[ OK ]\\033[0m  $*"; }` },

  // SQL
  { lang:'sql', title:'Paginated Query Pattern', tags:['sql','pagination'],
    code:`-- Cursor-based pagination (efficient on large tables)\nSELECT id, title, created_at\nFROM   snippets\nWHERE  created_at < :cursor\n  AND  is_deleted = FALSE\nORDER  BY created_at DESC\nLIMIT  :page_size;` },
  { lang:'sql', title:'Upsert with ON CONFLICT', tags:['sql','postgres'],
    code:`INSERT INTO users (id, email, name, updated_at)\nVALUES ($1, $2, $3, NOW())\nON CONFLICT (email)\nDO UPDATE SET\n  name       = EXCLUDED.name,\n  updated_at = EXCLUDED.updated_at;` },
  { lang:'sql', title:'Window Function – Running Total', tags:['sql','analytics'],
    code:`SELECT\n  order_date,\n  amount,\n  SUM(amount) OVER (\n    ORDER BY order_date\n    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n  ) AS running_total\nFROM orders;` },

  // PHP
  { lang:'php', title:'PHP Dot-Notation Config', tags:['php','config'],
    code:`<?php\nfunction config_get(array $data, string $key, mixed $default = null): mixed {\n    $keys = explode('.', $key);\n    foreach ($keys as $k) {\n        if (!is_array($data) || !array_key_exists($k, $data)) return $default;\n        $data = $data[$k];\n    }\n    return $data;\n}` },

  // Ruby
  { lang:'rb', title:'Memoization with ||=', tags:['ruby','performance'],
    code:`class ReportService\n  def expensive_data\n    @expensive_data ||= begin\n      # imagine a slow DB query here\n      User.joins(:orders).group(:id).sum(:amount)\n    end\n  end\nend` },
]

// ─── Generate 100 snippets from templates ────────────────────────────────
function makeSeed(i) {
  const tpl = TEMPLATES[i % TEMPLATES.length]
  return {
    snippet_title:       `${tpl.title} #${i + 1}`,
    snippet_code:        tpl.code,
    snippet_language:    tpl.lang,
    snippet_description: `A production-ready ${tpl.title.toLowerCase()} snippet. Part of the CodeClan public library.`,
    snippet_tags:        [...tpl.tags, `seed-${i + 1}`],
    visibility:          'public',
  }
}

// ─── Main ────────────────────────────────────────────────────────────────
;(async () => {
  console.log(`\n🔐  Logging in as ${EMAIL}…`)

  const loginRes = await request('POST', '/api/users/login', { user_email: EMAIL, user_password: PASSWORD })

  // Token can be at different locations depending on the API version
  const token =
    loginRes.body?.data?.token ||
    loginRes.body?.token ||
    loginRes.body?.data?.accessToken ||
    loginRes.body?.accessToken

  if (loginRes.status !== 200 || !token) {
    console.error('❌  Login failed. Status:', loginRes.status)
    console.error('    Response:', JSON.stringify(loginRes.body, null, 2))
    process.exit(1)
  }
  console.log(`✅  Authenticated. Starting to seed ${TOTAL} snippets in batches of ${BATCH}…\n`)

  let created = 0, failed = 0

  for (let start = 0; start < TOTAL; start += BATCH) {
    const batch = Array.from({ length: Math.min(BATCH, TOTAL - start) }, (_, j) => makeSeed(start + j))

    const results = await Promise.allSettled(
      batch.map(s => request('POST', '/api/snippets/create', s, token))
    )

    results.forEach((r, j) => {
      const idx = start + j + 1
      if (r.status === 'fulfilled' && r.value.status === 201) {
        created++
        process.stdout.write(`  ✅ [${String(idx).padStart(3)}] ${batch[j].snippet_title}\n`)
      } else {
        failed++
        const msg = r.status === 'rejected' ? r.reason?.message : r.value?.body?.message
        process.stdout.write(`  ❌ [${String(idx).padStart(3)}] ${batch[j].snippet_title} — ${msg}\n`)
      }
    })

    // Small delay so we don't spam the server
    if (start + BATCH < TOTAL) await new Promise(r => setTimeout(r, 120))
  }

  console.log(`\n🎉  Done!  Created: ${created}  Failed: ${failed}\n`)
})()
