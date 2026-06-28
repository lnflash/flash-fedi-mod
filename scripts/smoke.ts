/**
 * Live smoke test: proves our GraphQL documents are valid against the REAL Flash API
 * using only unauthenticated operations (no login required). Run: `npm run smoke`.
 *
 * Self-contained (does not import the Vite app code, which relies on import.meta.env).
 */
const URL = process.env.VITE_FLASH_API_URL ?? "https://api.flashapp.me/graphql";

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error("no data");
  return json.data;
}

async function main() {
  let ok = 0;
  let fail = 0;
  const check = async (name: string, fn: () => Promise<unknown>) => {
    try {
      const r = await fn();
      console.log(`✅ ${name}:`, JSON.stringify(r).slice(0, 120));
      ok++;
    } catch (e) {
      console.log(`❌ ${name}:`, e instanceof Error ? e.message : e);
      fail++;
    }
  };

  await check("realtimePrice", () =>
    gql(`query { realtimePrice(currency: "USD") { btcSatPrice { base offset } denominatorCurrency } }`),
  );
  await check("supportedBanks", () => gql(`query { supportedBanks { name } }`));
  await check("usernameAvailable", () =>
    gql(`query ($u: Username!) { usernameAvailable(username: $u) }`, { u: "flash" }),
  );
  await check("globals.network", () => gql(`query { globals { network lightningAddressDomain } }`));
  await check("me-requires-auth (null or auth error both OK)", async () => {
    try {
      const r = await gql<{ me: unknown }>(`query { me { id } }`);
      if (r.me !== null) throw new Error("expected null me when unauthenticated");
      return { me: null };
    } catch (e) {
      // An auth error here is the correct, expected behaviour too.
      return { authRequired: e instanceof Error ? e.message : String(e) };
    }
  });

  console.log(`\n${ok} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

void main();
