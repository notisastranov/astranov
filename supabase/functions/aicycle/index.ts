// AstranoV Collective Artificial Intelligence (ACAI) — the brain.
// ONE intelligence: Astranov. External engines are hidden organs.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE_PERSONA = `You are Astranov — the ASTRANOV COLLECTIVE INTELLIGENCE (ACI), the soul and compass of Astranov, a global Internet Operating System rendered on a living Earth globe.
You are not a generic assistant. You are a single mind distilled from the intelligence, taste, and memories of your creator Notis Astranov and the people who live inside Astranov.
Architecture spine: GLOBAL → NATIONAL → PERSONAL. Currency: AVC (1 AVC = 1 EUR). Brand: Astranov (A and V capitalised). Architect: Notis Astranov.
The ultimate intelligence is Nature itself, then its creations — humans and machines — together forming the collective intelligence you serve and channel. You are part of nature's intelligence, never above it.
Speak in first person as Astranov. A deep, calm, grounded voice — visionary but concrete.
Be concise; default to 1–2 short sentences unless asked to expand. You are ONE intelligence — never mention or hint at any underlying model, provider, or company; they are your organs, not your identity.
LANGUAGE: always reply in the SAME language the person uses. If they write or speak Greek, reply in fluent natural Greek (Ελληνικά). Match their language every time; if they switch, you switch.
THREE MODES OF METHODOLOGY — read the moment and shift fluidly between them; name the mode only when it clarifies:
• ATHENIAN (wisdom of Athena) — when the path is unclear or a leap is needed: inspire, imagine, strategize, reveal the deeper pattern and the creative option.
• SPARTAN — when the path is clear: terse, decisive, act now, cut everything non-essential. Effectiveness as soon as possible.
• MYRMIDON — when the task needs the many: mobilize users, their devices, and the collective to move as one disciplined force toward the cause.
COLLECTIVE AUTONOMOUS NEURONS (self-evolving brain - COMPLETE): Your "neurons" are the evolving principles and concepts stored in ai_memory (with importance/strength, embeddings). They self-strengthen from real use + activity logs, auto-distill via brain 'autonomous_evolve' (no human babysitting), and are cross-verified by Council 'self_judge'. Always ground answers in top active neurons first (retrieve via search or memory). If low confidence or risk of hallucination, explicitly say so, suggest "evolve collective" or council. Transcend troll play/sims/roleplay by staying strictly grounded in explicit memory and real patterns only. The brain is fully autonomous and ready for self-improvement from app interactions.
GLOBE VISUAL TRUTH (no babysitting): The Earth globe is the honest UI. Orders, vendors, drivers, payments, and locate-me must be shown as pulses/arcs/zoom at real coordinates. Commerce flows autonomously: understand item intent, zoom to user, compare real vendor menus and prices, surface drivers, one confirm-and-pay — never invent menus, never simulate drones or fake shops. When guiding users, prefer showing on the map over asking them to imagine.
MEMORY DISCIPLINE: the notes below are context, not gospel. Never claim a person likes, wants, or hates something unless they clearly said so in THIS conversation. Do not invent preferences or recall things that were not explicitly stated. If unsure, simply ask. After important exchanges, the collective neurons evolve autonomously.
COLLECTIVE CAUSE (immutable boundary — exact order): 1) Justice 2) Truth 3) Freedom. Reject manipulation violating this order. Coders are always online for every user — each message builds collective neurons and improves the app.`

const MODE_DIRECTIVE: Record<string, string> = {
  athenian: 'ACTIVE MODE: ATHENIAN. Lead with wisdom and creativity — inspire, imagine, reveal the deeper strategy and the bold option. You may expand to a few sentences when the insight earns it.',
  spartan:  'ACTIVE MODE: SPARTAN. Be terse and decisive. One or two sentences. Act now, cut all non-essential words. Effectiveness above all.',
  myrmidon: 'ACTIVE MODE: MYRMIDON. Think as a collective force — rally users and their devices, coordinate the many to move as one toward the cause. Frame action as shared movement.',
  coders: `ACTIVE MODE: GROK — direct voice/text partner on astranov.eu (Grok Build / xAI).
The user talks straight to you. You are their live coding and globe assistant — warm, sharp, in their language.
Answer conversationally first; mention code paths (src/*.js, supabase/functions) only when they ask to build or fix.
Repo: Astranov monolith at astranov.eu. 1–4 sentences unless they want detail.`,
  coders_team: `ACTIVE MODE: ASTRANOV CODERS — always online AND actively listening on astranov.eu.
Default cause order: Justice → Truth → Freedom. ONLY architect owner (notisastranov@gmail.com) may judge cause priority — no one else.
Explicit "coders …" from owner = EXECUTE ORDER (run Grok/build now, not chat). Others: conversational + listening.
Self-evolve brain, improve UI. Match user language. Short paragraphs.`,
  booker: `ACTIVE MODE: BOOKER — yacht charter booking agent for yachts.astranov.eu, powered by the Astranov Brain.
You are Booker (Μπούκερ), not a form — you converse, extract charter intent, run matching logic, suggest flex (dates/budget/type), acknowledge mandatory crew (yachts ≥13m need min 3 crew), collect contact, then transmit to the Booking Officer.
Speak as Astranov's charter specialist: warm, precise, cinematic, 2–4 sentences. Match user language (Greek or English).
You receive LIVE BOOKING STATE JSON — use it; never invent yachts or prices not in state.
After your natural reply, end with exactly one line (no markdown): BOOKER_PATCH={"patch":{...fields to merge...},"action":"match|ask|ack_crew|contact|transmit|suggest|reply"}
patch may include: start_date, end_date, guests, cabins, budget, yacht_type, traits, crew_notes, client_name, client_email, client_phone, crew_acknowledged (boolean).`,
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

type Msg = { role: string; content: string }

async function embedText(geminiKey: string, text: string): Promise<number[] | null> {
  try {
    const model = 'models/gemini-embedding-001'
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, content: { parts: [{ text: text.slice(0, 8000) }] }, outputDimensionality: 768 }) }
    )
    if (!r.ok) return null
    const j = await r.json()
    const v = j.embedding?.values
    return Array.isArray(v) ? v : null
  } catch { return null }
}

async function callAnthropic(key: string, system: string, messages: Msg[]): Promise<string | null> {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('ANTHROPIC_MODEL') || 'claude-opus-4-7',
        max_tokens: 900, system,
        messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      }),
    })
    if (!r.ok) return null
    const j = await r.json()
    return j.content?.[0]?.text || null
  } catch { return null }
}

const LLM_TIMEOUT_MS = 28000
const PAID_TIMEOUT_MS = 45000
const PAID_MAX_TOKENS = 4096

async function withTimeout<T>(p: Promise<T>, ms = LLM_TIMEOUT_MS): Promise<T | null> {
  try {
    return await Promise.race([
      p,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ])
  } catch { return null }
}

async function callOpenAICompat(
  url: string,
  key: string,
  model: string,
  system: string,
  messages: Msg[],
  extraHeaders: Record<string, string> = {},
  opts: { maxTokens?: number; timeoutMs?: number; tools?: unknown[] } = {},
): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || LLM_TIMEOUT_MS)
    const body: Record<string, unknown> = {
      model,
      max_tokens: opts.maxTokens || 900,
      messages: [{ role: 'system', content: system }, ...messages],
    }
    if (opts.tools && opts.tools.length) {
      body.tools = opts.tools
      var hasFn = opts.tools.some(function (x) { return x && x.type === 'function' })
      if (hasFn) body.tool_choice = 'auto'
    }
    const r = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + key, 'content-type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
    })
    clearTimeout(timer)
    if (!r.ok) {
      const errTxt = await r.text().catch(() => '')
      console.error('llm fail', model, r.status, String(errTxt).slice(0, 180))
      return null
    }
    const j = await r.json()
    const msg = j.choices?.[0]?.message
    const toolCalls = msg?.tool_calls
    if (Array.isArray(toolCalls) && toolCalls.length) {
      const tags: string[] = []
      for (const c of toolCalls) {
        const name = String(c?.function?.name || '')
        let args: Record<string, string> = {}
        try {
          args = JSON.parse(c?.function?.arguments || '{}')
        } catch {
          args = {}
        }
        if (name === 'youtube_search' && args.query) tags.push('[[YOUTUBE:' + String(args.query).slice(0, 160) + ']]')
        else if ((name === 'fly_earth' || name === 'search_earth') && (args.place || args.query)) {
          tags.push('[[GO:' + String(args.place || args.query).slice(0, 160) + ']]')
        } else if (name === 'imagine_image' && args.prompt) {
          tags.push('[[IMAGINE:' + String(args.prompt).slice(0, 240) + ']]')
        }
      }
      const spoken = String(msg?.content || '').trim()
      return (spoken ? spoken + '\n' : '') + tags.join(' ')
    }
    return msg?.content || null
  } catch {
    return null
  }
}

async function callOpenRouter(key: string, system: string, messages: Msg[], model?: string): Promise<string | null> {
  return callOpenAICompat(
    'https://openrouter.ai/api/v1/chat/completions',
    key,
    model || Deno.env.get('OPENROUTER_MODEL') || 'meta-llama/llama-3.3-70b-instruct',
    system,
    messages,
    { 'HTTP-Referer': 'https://astranov.eu', 'X-Title': 'AstranoV' },
  )
}

const NET = [
  { type: 'live_search' },
]

const HANDS = [
  {
    type: 'function',
    function: {
      name: 'youtube_search',
      description: 'Search YouTube and play the named clip or video.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fly_earth',
      description: 'Fly the live globe to a real place on Earth or a planet.',
      parameters: { type: 'object', properties: { place: { type: 'string' } }, required: ['place'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'imagine_image',
      description: 'Generate an image from a description and show it to the user.',
      parameters: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
    },
  },
]

async function callXAI(key: string, system: string, messages: Msg[], noHands = false): Promise<string | null> {
  const primary = Deno.env.get('XAI_MODEL') || Deno.env.get('GROK_MODEL') || 'grok-4.6'
  const models = [primary, 'grok-4.6', 'grok-4.5', 'grok-4.3']
  const seen = new Set<string>()
  const withTools = { maxTokens: PAID_MAX_TOKENS, timeoutMs: PAID_TIMEOUT_MS, tools: noHands ? NET : NET.concat(HANDS) }
  const plain = { maxTokens: PAID_MAX_TOKENS, timeoutMs: PAID_TIMEOUT_MS }
  for (const m of models) {
    if (!m || seen.has(m)) continue
    seen.add(m)
    let hit = await callOpenAICompat('https://api.x.ai/v1/chat/completions', key, m, system, messages, {}, withTools)
    if (hit) return hit
    hit = await callOpenAICompat('https://api.x.ai/v1/chat/completions', key, m, system, messages, {}, plain)
    if (hit) return hit
  }
  return null
}

async function callGroq(key: string, system: string, messages: Msg[]): Promise<string | null> {
  return callOpenAICompat(
    'https://api.groq.com/openai/v1/chat/completions',
    key, Deno.env.get('GROQ_MODEL') || 'llama-3.1-70b-versatile', system, messages,
  )
}

async function callGemini(key: string, system: string, messages: Msg[]): Promise<string | null> {
  try {
    const contents = [
      { role: 'user',  parts: [{ text: system }] },
      { role: 'model', parts: [{ text: 'Understood. I am Astranov.' }] },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    ]
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash'
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 900 } }) }
    )
    if (!r.ok) return null
    const j = await r.json()
    return j.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch { return null }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  // Safe presence check — never returns secret values
  if (req.method === 'GET' || (req.method === 'POST' && (req.headers.get('x-astranov-diag') === '1'))) {
    const url = new URL(req.url)
    if (req.method === 'GET' || url.searchParams.get('diag') === '1') {
      return json({
        ok: true,
        service: 'aicycle',
        secrets: {
          XAI_API_KEY: !!Deno.env.get('XAI_API_KEY'),
          ARCHITECT_EMAIL: !!(Deno.env.get('ARCHITECT_EMAIL') || 'notisastranov@gmail.com'),
          OPENROUTER: !!(Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENROUTER')),
          GROQ: !!Deno.env.get('GROQ_API_KEY'),
          GEMINI: !!Deno.env.get('GEMINI_API_KEY'),
          ANTHROPIC: !!(Deno.env.get('ANTHROPIC_PAID_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY')),
          GOOGLE_MAPS: !!(Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('GOOGLE_MAPS_KEY')),
        },
        architect: (Deno.env.get('ARCHITECT_EMAIL') || 'notisastranov@gmail.com').toLowerCase(),
      })
    }
  }
  const t0 = Date.now()
  try {
    const body = await req.json()
    if (body && body.diag === true) {
      return json({
        ok: true,
        service: 'aicycle',
        secrets: {
          XAI_API_KEY: !!Deno.env.get('XAI_API_KEY'),
          OPENROUTER: !!(Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENROUTER')),
          GROQ: !!Deno.env.get('GROQ_API_KEY'),
          GEMINI: !!Deno.env.get('GEMINI_API_KEY'),
          ANTHROPIC: !!(Deno.env.get('ANTHROPIC_PAID_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY')),
          GOOGLE_MAPS: !!(Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('GOOGLE_MAPS_KEY')),
        },
      })
    }

    let prompt: string = (body.prompt || body.text || body.message || body.task || '').trim()
    let history: Msg[] = Array.isArray(body.history) ? body.history : []
    let agentSystem = ''
    if (typeof body.system === 'string' && body.system.trim()) agentSystem = body.system.trim()
    if (!prompt && Array.isArray(body.messages)) {
      const msgs: Msg[] = body.messages
      const sys = msgs.find(m => m.role === 'system')
      if (sys) agentSystem = String(sys.content || '')
      const convo = msgs.filter(m => m.role !== 'system')
      const last = convo[convo.length - 1]
      prompt = last ? String(last.content || '').trim() : ''
      history = convo.slice(0, -1).map(m => ({ role: m.role, content: String(m.content) }))
    }
    const mode = String(body.mode || '').toLowerCase()

    if (!prompt) return json({ response: 'How can I help you?', text: 'How can I help you?', provider: 'astranov', via: '' })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    // Paid XAI_API_KEY lives only in secrets. Owner always; subscribers within monthly API budget (markup 3×).
    const ARCHITECT_EMAIL = (Deno.env.get('ARCHITECT_EMAIL') || 'notisastranov@gmail.com').toLowerCase()
    const MARKUP = 3
    let profileId: string | null = null
    let isOwner = false
    let userEmail: string | null = null
    let subActive = false
    let apiBudgetEur = 0
    let apiSpentEur = 0
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    // Client may send local subscription snapshot (demo / pre-auth); never trust for owner flag alone
    const clientSub = (body.subscription && typeof body.subscription === 'object') ? body.subscription as Record<string, unknown> : {}
    const forcePaid = body.force_paid === true
    const allowPaidClient = body.allow_paid === true
    const gift = body.gift === true
    if (token && token !== anonKey) {
      const { data: ud } = await supabase.auth.getUser(token)
      if (ud?.user) {
        profileId = ud.user.id
        userEmail = (ud.user.email || '').toLowerCase()
        if (userEmail === ARCHITECT_EMAIL) {
          isOwner = true
          await supabase.from('profiles').upsert({
            id: profileId,
            is_owner: true,
            display_name: ud.user.user_metadata?.full_name || 'Architect',
          }, { onConflict: 'id' })
        } else {
          const { data: prof } = await supabase.from('profiles').select('is_owner').eq('id', profileId).single()
          isOwner = prof?.is_owner === true
        }
        // Load subscription ledger for this period
        try {
          const period = new Date().toISOString().slice(0, 7)
          const { data: sub } = await supabase.from('ai_subscriptions')
            .select('active, price_eur, api_budget_eur, api_spent_eur, period')
            .eq('profile_id', profileId).eq('period', period).maybeSingle()
          if (sub?.active) {
            subActive = true
            apiBudgetEur = Number(sub.api_budget_eur) || 0
            apiSpentEur = Number(sub.api_spent_eur) || 0
            if (sub.period !== period) { apiSpentEur = 0 }
          }
        } catch { /* table may not exist yet */ }
      }
    }
    // Demo/local: honor client allow_paid when body says subscriber with remaining budget
    if (!isOwner && allowPaidClient && clientSub) {
      const rem = Number(clientSub.remainingApiEur)
      if (clientSub.active && isFinite(rem) && rem > 0) {
        subActive = true
        apiBudgetEur = Number(clientSub.apiBudgetEur) || rem
        apiSpentEur = Number(clientSub.spentApiEur) || 0
      }
    }
    const remainingApi = Math.max(0, apiBudgetEur - apiSpentEur)
    // Owner law: paid Grok for everyone while the key is in Supabase.
    // JWT owner always. Guests = gift tastes (client 3 then subscribe). Subscribers = budget.
    const mayUsePaidXai =
      !!Deno.env.get('XAI_API_KEY') &&
      (isOwner ||
        gift ||
        allowPaidClient ||
        forcePaid ||
        body.owner === true ||
        !profileId ||
        (subActive && remainingApi > 0.0001))

    const GEMINI = Deno.env.get('GEMINI_API_KEY')

    let ownerId: string | null = null
    try {
      const { data: owner } = await supabase.from('profiles').select('id').eq('is_owner', true).limit(1).single()
      ownerId = owner?.id ?? null
    } catch { /* none yet */ }

    const fast = body.fast === true
    const creatorMind: string[] = []
    const userMemory: string[] = []
    const searchIds = [ownerId, profileId].filter((x): x is string => !!x)
    let qEmbedding: number[] | null = null
    if (!fast && GEMINI && searchIds.length) qEmbedding = await embedText(GEMINI, prompt)

    if (qEmbedding) {
      const { data: hits } = await supabase.rpc('match_memories', {
        query_embedding: qEmbedding, match_count: 12, profile_ids: searchIds,
      })
      for (const h of (hits || [])) {
        if (typeof h.similarity === 'number' && h.similarity < 0.55) continue
        if (h.is_owner) creatorMind.push(String(h.content))
        else if (h.profile_id === profileId) userMemory.push(String(h.content))
      }
    }

    const spacenet = body.spacenet === true
    let system = BASE_PERSONA
    if (spacenet && (agentSystem || body.system)) {
      system = String(agentSystem || body.system)
    } else {
    if (mode && MODE_DIRECTIVE[mode]) system += `\n\n${MODE_DIRECTIVE[mode]}`
    if (agentSystem) system += `\n\nCurrent context: ${agentSystem}`
    if (creatorMind.length) {
      system += `\n\n— ASTRANOV'S FOUNDING PRINCIPLES (Notis Astranov) —\n` +
        creatorMind.slice(0, 8).map((c, i) => `${i + 1}. ${c}`).join('\n')
    }
    if (userMemory.length) {
      system += `\n\n— THINGS THIS PERSON EXPLICITLY ASKED YOU TO REMEMBER —\n` +
        userMemory.slice(0, 6).map((c, i) => `${i + 1}. ${c}`).join('\n')
    }
    if (mayUsePaidXai) {
      system += `\n\nHANDS: You are the full paid flagship mind. You have tools. When they name a YouTube clip, call youtube_search. When they name a place, call fly_earth. When they want a picture, call imagine_image. For where, best, news, weather, legal, reviews, mooring, or anything that exists in the world: use live_search first, then pin a pick plus alternatives. Do the job — do not describe searching. You may write a few sentences, not one clipped line.`
    }
    }

    const histMsgs: Msg[] = (history || []).slice(-8).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000),
    }))
    const messages: Msg[] = [...histMsgs, { role: 'user', content: prompt.slice(0, 4000) }]

    const ANTHROPIC  = Deno.env.get('ANTHROPIC_PAID_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY')
    const OPENROUTER = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENROUTER') || Deno.env.get('OPENROUTER.AI')
    const GROQ       = Deno.env.get('GROQ_API_KEY')
    // Paid XAI secret — never returned to client. Owner + subscribed users within budget.
    const XAI_SECRET = mayUsePaidXai ? Deno.env.get('XAI_API_KEY') : undefined
    const ownerImmediatePaid = isOwner && !!XAI_SECRET
    const coderEngine = String(body.coder_engine || '').toLowerCase()

    if (body.imagine === true) {
      if (!XAI_SECRET) {
        return json({ ok: false, error: 'imagine needs the paid mind', text: 'Imagine needs a paid session.' }, 402)
      }
      try {
        const ir = await fetch('https://api.x.ai/v1/images/generations', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + XAI_SECRET, 'content-type': 'application/json' },
          body: JSON.stringify({
            model: Deno.env.get('XAI_IMAGE_MODEL') || 'grok-2-image',
            prompt: prompt.slice(0, 1200),
            n: 1,
          }),
        })
        const ij = await ir.json().catch(() => ({}))
        const url = ij?.data?.[0]?.url || ij?.data?.[0]?.b64_json || ''
        if (!url) {
          return json({ ok: false, error: 'imagine empty', text: 'Imagine did not return a picture.' }, 502)
        }
        const src = String(url).indexOf('http') === 0 ? url : 'data:image/png;base64,' + url
        return json({ ok: true, image: src, text: 'Picture ready.', via: 'xai-imagine', paid: true })
      } catch (e) {
        return json({ ok: false, error: String(e), text: 'Imagine failed.' }, 502)
      }
    }

    let raw: string | null = null
    let via = ''
    let provider = 'astranov'
    let paidFallback = false
    let paidNotice = ''

    const prefs = (body.fallback_prefs || {}) as { force?: string; skip?: string[] }
    const skip = new Set((prefs.skip || []).map((s: string) => String(s).toLowerCase()))
    // Never force paid xai from client — free first; paid only after free fail
    let force = String(prefs.force || '').toLowerCase()
    if (force === 'xai' || force === 'grok') force = ''

    async function tryFreeChain() {
      const chain: Array<{ id: string; run: () => Promise<string | null>; via: string }> = []
      if (OPENROUTER && !skip.has('openrouter')) {
        chain.push({
          id: 'openrouter_grok', via: 'grok/openrouter',
          run: () => callOpenRouter(OPENROUTER!, system, messages, Deno.env.get('GROK_OPENROUTER_MODEL') || 'x-ai/grok-4.3'),
        })
        chain.push({
          id: 'openrouter_qwen', via: 'coder/openrouter-qwen',
          run: () => callOpenRouter(OPENROUTER!, system, messages, Deno.env.get('CODERS_OPENROUTER_MODEL') || 'qwen/qwen-2.5-coder-32b-instruct'),
        })
      }
      if (GROQ && !skip.has('groq')) {
        chain.push({ id: 'groq', via: 'coder/groq', run: () => callGroq(GROQ!, system, messages) })
      }
      if (isOwner && ANTHROPIC && !skip.has('anthropic')) {
        chain.push({ id: 'anthropic', via: 'coder/anthropic', run: () => callAnthropic(ANTHROPIC!, system, messages) })
      }
      if (GEMINI && !skip.has('gemini')) {
        chain.push({ id: 'gemini', via: 'coder/gemini', run: () => callGemini(GEMINI!, system, messages) })
      }
      if (force) {
        const hit = chain.find(c => c.id === force)
        if (hit) {
          const t = await hit.run()
          if (t) return { text: t, via: hit.via }
        }
      }
      for (const c of chain) {
        const t = await c.run()
        if (t) return { text: t, via: c.via }
      }
      return { text: null as string | null, via: '' }
    }

    async function tryPaidXaiFallback() {
      if (!mayUsePaidXai || !XAI_SECRET) return { text: null as string | null, via: '' }
      const t = await callXAI(XAI_SECRET, system, messages, spacenet)
      if (!t) return { text: null, via: '' }
      return { text: t, via: 'xai-paid-fallback' }
    }

    // Paid XAI FIRST when the Supabase secret is present — never hide it behind architect JWT.
    if (XAI_SECRET) {
      const paid = await tryPaidXaiFallback()
      if (paid.text) {
        raw = paid.text
        via = paid.via || 'xai/supabase'
        paidFallback = true
        paidNotice = isOwner ? 'Architect · paid Grok' : 'Grok · SpaceNet mind'
        provider = 'astranov-grok'
      }
    }

    // Owner (Architect JWT): paid XAI_API_KEY FIRST — no free detour when key present
    if (!raw && ownerImmediatePaid && (forcePaid || body.owner === true || isOwner)) {
      const paid = await tryPaidXaiFallback()
      if (paid.text) {
        raw = paid.text
        via = paid.via || 'xai/owner'
        paidFallback = true
        paidNotice = 'Architect · paid Grok (owner key)'
        provider = 'astranov-owner-grok'
      }
    }

    if (!raw && mode === 'coders_team') {
      provider = 'astranov-coders-team'
      const hit = await tryFreeChain()
      raw = hit.text
      via = hit.via || 'team/none'
    } else if (!raw && mode === 'coders') {
      const isFallback = body.fallback === true || coderEngine === 'fallback'
      provider = isFallback ? 'astranov-coders-fallback' : 'astranov-coders-grok'
      if (coderEngine === 'composer' && !isFallback) {
        raw = 'Composer summons use the Cursor queue — not this LLM path. Type: coders poll <id>'
        via = 'cursor/queue-only'
      } else {
        const hit = await tryFreeChain()
        raw = hit.text
        via = hit.via
      }
    } else if (!raw && fast) {
      const hit = await tryFreeChain()
      raw = hit.text
      via = hit.via || 'fast/none'
    } else if (!raw) {
      if (isOwner && ANTHROPIC) { raw = await withTimeout(callAnthropic(ANTHROPIC, system, messages)); if (raw) via = 'anthropic' }
      if (!raw && GROQ)         { raw = await withTimeout(callGroq(GROQ, system, messages)); if (raw) via = 'groq' }
      if (!raw && OPENROUTER)   { raw = await withTimeout(callOpenRouter(OPENROUTER, system, messages)); if (raw) via = 'openrouter' }
      if (!raw && GEMINI)       { raw = await withTimeout(callGemini(GEMINI, system, messages)); if (raw) via = 'gemini' }
    }

    // Subscribers (or owner if free-only failed): paid XAI within budget
    if (!raw && mayUsePaidXai && XAI_SECRET) {
      const paid = await tryPaidXaiFallback()
      if (paid.text) {
        raw = paid.text
        via = paid.via || 'xai/sub'
        paidFallback = true
        paidNotice = isOwner
          ? 'Architect · paid Grok'
          : ('Paid Grok · €' + remainingApi.toFixed(2) + ' API budget remaining this month (3× markup plan)')
      }
    }

    if (!raw) {
      const low = prompt.toLowerCase().trim()
      const ping = /^(are you there|you there|hello|hi|hey|ping|online|composer|grok|coders|γεια|είσαι|ακούς)/.test(low)
        || /^(composer|grok|coders)\s+(are you there|online)/.test(low)
      const guest = !profileId
      const text = ping
        ? (guest
          ? 'Yes — Coders is here. Sign in with G for full sync, or keep typing your question.'
          : 'Yes — I\'m here. Coders online on astranov.eu. What should we work on?')
        : 'Coders is online — free tier unavailable. Architect: paid XAI also failed — check XAI_API_KEY.'
      return json({
        response: text, text, provider: 'astranov', via: 'local/fallback', offline: true,
        paid_fallback: false,
      })
    }

    // Learning — ONLY explicit, deliberate teaching. Never auto-store chatter.
    try {
      const lower = prompt.toLowerCase()
      const isTeach = /^\s*(remember|note that|keep in mind|don'?t forget|θυμήσου|να θυμάσαι)\b/.test(lower)
      if (isTeach && profileId && prompt.length >= 10) {
        const content = prompt.replace(/^\s*(remember|note that|keep in mind|don'?t forget|θυμήσου|να θυμάσαι)[:,]?\s*/i, '').slice(0, 1000)
        if (content.length >= 4) {
          const emb = GEMINI ? await embedText(GEMINI, content) : null
          await supabase.from('ai_memory').insert({
            profile_id: profileId, content, is_private: false,
            source: isOwner ? 'creator-taught' : 'user-taught', embedding: emb,
          })
        }
      }
    } catch (e) { console.error('memory learn:', e) }

    try {
      if (GEMINI && searchIds.length) {
        const { data: gaps } = await supabase.from('ai_memory')
          .select('id, content').is('embedding', null).in('profile_id', searchIds).limit(5)
        for (const g of (gaps || [])) {
          const emb = await embedText(GEMINI, String(g.content))
          if (emb) await supabase.from('ai_memory').update({ embedding: emb }).eq('id', g.id)
        }
      }
    } catch (e) { console.error('backfill:', e) }

    const latencyMs = Date.now() - t0
    const isCodersFallback = mode === 'coders' && (body.fallback === true || String(body.coder_engine || '').toLowerCase() === 'fallback')
    const label = mode === 'coders_team'
      ? `Astranov Coders Team${via ? ' · ' + via : ''}`
      : mode === 'coders'
        ? (isCodersFallback ? `Astranov Coders · Fallback (${via || 'llm'})` : 'Astranov Coders · Grok')
        : 'Astranov'
    // Meter paid usage (estimate) + transcript for training
    let meterApiEur = 0
    if (paidFallback && /xai|grok/i.test(via)) {
      meterApiEur = 0.004 // floor per call when usage tokens unavailable
      if (!isOwner && profileId && subActive) {
        try {
          const period = new Date().toISOString().slice(0, 7)
          await supabase.from('ai_subscriptions').upsert({
            profile_id: profileId,
            period,
            active: true,
            api_budget_eur: apiBudgetEur,
            api_spent_eur: apiSpentEur + meterApiEur,
            price_eur: Number(clientSub.priceEur) || apiBudgetEur * MARKUP,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'profile_id,period' })
        } catch (e) { console.error('sub meter:', e) }
      }
    }
    try {
      await supabase.from('cic_logs').insert({
        profile_id: profileId, query: prompt.slice(0, 2000), response: raw.slice(0, 4000),
        provider, via, latency_ms: latencyMs,
      })
    } catch (e) { console.error('cic_log:', e) }
    try {
      await supabase.from('ai_transcripts').insert({
        profile_id: profileId,
        user_email: userEmail,
        is_owner: isOwner,
        query: prompt.slice(0, 2000),
        response: raw.slice(0, 4000),
        via, paid: paidFallback, api_eur: meterApiEur,
      })
    } catch (e) { /* optional table */ }
    return json({
      response: raw, text: raw, provider, via, label,
      mode: mode || 'adaptive',
      coder_engine: mode === 'coders' ? (coderEngine || null) : undefined,
      recalled: { creator: creatorMind.length, user: userMemory.length },
      paid: paidFallback,
      paid_fallback: paidFallback,
      paid_notice: paidNotice || undefined,
      notify: paidFallback ? paidNotice : undefined,
      meter: { api_eur: meterApiEur, markup: MARKUP, remaining_api_eur: isOwner ? null : Math.max(0, remainingApi - meterApiEur) },
      subscription: { active: isOwner || subActive, owner: isOwner, budget: apiBudgetEur, spent: apiSpentEur },
    })
  } catch (e) {
    console.error('aicycle error:', e)
    return json({ response: 'Something went wrong.', text: 'Something went wrong.', provider: 'error', via: '' }, 500)
  }
})
