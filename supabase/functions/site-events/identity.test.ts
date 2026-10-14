import { assertEquals } from 'jsr:@std/assert@1';
import { identify, isPublicIp, topMd5 } from './identity.ts';
const a = '0123456789abcdef0123456789abcdef', b = 'ffffffffffffffffffffffffffffffff';
Deno.test('public ip filter', () => {
  for (const ip of ['10.1.2.3','127.0.0.1','192.168.1.1','172.20.0.1','100.64.0.1','::1','fd00::1','unknown']) assertEquals(isPublicIp(ip), false, ip);
  for (const ip of ['8.8.8.8','172.32.0.1','2a00:1450::1']) assertEquals(isPublicIp(ip), true, ip);
});
Deno.test('top md5 takes the first ranked hash', () => {
  assertEquals(topMd5({ results: [{ md5: a, sha256: 'x'.repeat(64), score: 0.9 }, { md5: b }] }), a);
  assertEquals(topMd5({ md5: [b, a] }), b);
  assertEquals(topMd5({ results: [] }), null);
});
const fake = (routes: Record<string, [number, unknown]>, seen: string[]) => (async (url: string | URL | Request) => {
  const path = String(url).replace('https://api.rb2b.com/api/v1', ''); seen.push(path);
  const [status, body] = routes[path] ?? [404, { error: 'not_found' }];
  return new Response(JSON.stringify(body), { status });
}) as typeof fetch;
Deno.test('full chain spends 5 credits when a hem matches', async () => {
  const seen: string[] = [];
  const r = await identify('8.8.8.8', 'k', fake({ '/ip_to_company': [200, { name: 'Acme' }], '/ip_to_hem': [200, { results: [{ md5: a }] }], '/hem_to_best_linkedin': [200, { linkedin_url: 'https://linkedin.com/in/x' }], '/hem_to_business_profile': [200, { title: 'CEO' }] }, seen));
  assertEquals(r.credits_used, 5); assertEquals(r.top_md5, a); assertEquals(seen.length, 4);
});
Deno.test('no hem stops after two calls; 404 is a miss, not an error', async () => {
  const seen: string[] = [];
  const r = await identify('8.8.8.8', 'k', fake({ '/ip_to_company': [200, { name: 'Acme' }] }, seen));
  assertEquals(seen.length, 2); assertEquals(r.hems, null); assertEquals(r.linkedin, null); assertEquals(r.credits_used, 1);
});
Deno.test('out of credits or bad key throws so it is saved as an error', async () => {
  let threw = false;
  try { await identify('8.8.8.8', 'k', fake({ '/ip_to_company': [402, {}], '/ip_to_hem': [402, {}] }, [])); } catch { threw = true; }
  assertEquals(threw, true);
});
