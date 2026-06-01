// ─── Passcreator.com API wrapper ────────────────────────────────────────────
//
// Setup:
//  1. Sign up at passcreator.com
//  2. Create a "Stamp Card" campaign with these field placeholders:
//       {{client_name}}      → client's name
//       {{visit_count}}      → current stamp count (e.g. "5")
//       {{reward_at}}        → visits needed for reward (e.g. "10")
//       {{visits_remaining}} → visits left (e.g. "5")
//  3. Set env vars:
//       PASSCREATOR_API_KEY      → your API key (Settings → API)
//       PASSCREATOR_CAMPAIGN_ID  → campaign ID from the URL
//       PASSCREATOR_REWARD_AT    → visits needed for reward (default: 10)
// ─────────────────────────────────────────────────────────────────────────────

const BASE           = 'https://passcreator.com/api/v3';
const API_KEY        = process.env.PASSCREATOR_API_KEY;
const CAMPAIGN_ID    = process.env.PASSCREATOR_CAMPAIGN_ID;
export const REWARD_AT = parseInt(process.env.PASSCREATOR_REWARD_AT ?? '10');

function authHeaders() {
  return {
    Authorization: `passcreator ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function buildFields(name: string, visitCount: number) {
  const cycle = visitCount % REWARD_AT;
  return {
    client_name:      name,
    visit_count:      String(visitCount),
    reward_at:        String(REWARD_AT),
    visits_remaining: String(REWARD_AT - cycle),
    cycle_stamps:     String(cycle),
    rewards_earned:   String(Math.floor(visitCount / REWARD_AT)),
  };
}

export interface PassResult {
  passId:  string;
  passUrl: string;
}

export async function createLoyaltyPass(opts: {
  identifier: string;
  name: string;
  visitCount: number;
}): Promise<PassResult | null> {
  if (!API_KEY || !CAMPAIGN_ID) return null;

  try {
    const res = await fetch(`${BASE}/campaigns/${CAMPAIGN_ID}/passes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        identifier: opts.identifier,
        fields: buildFields(opts.name, opts.visitCount),
      }),
    });
    if (!res.ok) {
      console.error('[passcreator] create failed', res.status, await res.text());
      return null;
    }
    const data: Record<string, string> = await res.json();
    const passUrl = data.passUrl ?? data.downloadUrl ?? data.url ?? '';
    return { passId: data.id ?? opts.identifier, passUrl };
  } catch (e) {
    console.error('[passcreator] create error', e);
    return null;
  }
}

export async function updateLoyaltyPass(opts: {
  passId: string;
  name: string;
  visitCount: number;
}): Promise<boolean> {
  if (!API_KEY) return false;

  try {
    const res = await fetch(`${BASE}/passes/${opts.passId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ fields: buildFields(opts.name, opts.visitCount) }),
    });
    return res.ok;
  } catch (e) {
    console.error('[passcreator] update error', e);
    return false;
  }
}
