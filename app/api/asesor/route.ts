import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { requireUser } from '@/lib/supabase/user';
import { getAppData } from '@/lib/data/app-data';
import { appPortfolio } from '@/lib/finance/app-portfolio';
import { parseProfile, EMPTY_PROFILE } from '@/lib/profile';
import { ADVISOR_DAILY_LIMIT, ADVISOR_MODEL, SOURCES_MARK, advisorSystem, buildAdvisorContext, cardTags, cleanSources, nextAdvisorCount, validateChat } from '@/lib/ai/advisor';
import { buildChatCards } from '@/lib/ai/advisor-cards';

/** Chat con Duro: responde en streaming de texto con los datos y el perfil del usuario. Puede buscar noticias; las fuentes y las tarjetas van al final, tras SOURCES_MARK. */
export async function POST(req: Request) {
  const { supabase, user } = await requireUser();
  const messages = validateChat((await req.json().catch(() => null))?.messages);
  if (typeof messages === 'string') return new Response(messages, { status: 400 });

  const data = await getAppData();
  const { data: settings, error } = await supabase.from('settings')
    .select('profile, advisor_day, advisor_count').eq('user_id', user.id).maybeSingle();
  if (error) {
    console.error('Error leyendo ajustes del asesor', error);
    return new Response('No he podido contestar. Inténtalo en un rato.', { status: 500 });
  }

  const count = nextAdvisorCount(settings?.advisor_day ?? null, settings?.advisor_count ?? 0, data.today);
  if (count === null) return new Response(`Por hoy ya hemos hablado bastante (${ADVISOR_DAILY_LIMIT} mensajes). Mañana seguimos.`, { status: 429 });
  await supabase.from('settings').update({ advisor_day: data.today, advisor_count: count }).eq('user_id', user.id);

  const parsed = parseProfile(settings?.profile ?? null);
  const profile = typeof parsed === 'string' ? EMPTY_PROFILE : parsed;
  const pf = appPortfolio(data);
  const result = streamText({
    model: ADVISOR_MODEL,
    system: advisorSystem(buildAdvisorContext(data, pf, profile)),
    messages,
    tools: { google_search: google.tools.googleSearch({}) },
    maxOutputTokens: 700,
    onError: ({ error: e }) => console.error('Error del asesor', e),
  });
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let answer = '';
        for await (const chunk of result.textStream) {
          answer += chunk;
          controller.enqueue(encoder.encode(chunk.replaceAll(SOURCES_MARK, '')));
        }
        const sources = cleanSources(await result.sources);
        const cards = buildChatCards(cardTags(answer), data, pf);
        if (sources.length || cards.length) controller.enqueue(encoder.encode(SOURCES_MARK + JSON.stringify({ sources, cards })));
      } catch (e) {
        console.error('Error del asesor', e);
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
