import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { RMC_SYSTEM_PROMPT } from '@/lib/rmc-knowledge';

// The Anthropic SDK needs the Node.js runtime (not Edge).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'claude-opus-4-8';
const MAX_HISTORY = 12; // keep the last N turns of context
const MAX_MSG_CHARS = 2000; // guard against oversized messages

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError('The AI assistant is not configured yet. Please contact info@rmc.org.rw.', 503);
  }

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid request body.', 400);
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = incoming
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === 'object' &&
        ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant') &&
        typeof (m as ChatMessage).content === 'string' &&
        (m as ChatMessage).content.trim().length > 0,
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return jsonError('No question provided.', 400);
  }

  const client = new Anthropic({ apiKey });
  const today = new Date().toISOString().slice(0, 10);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const llm = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          system: [
            // Large, stable knowledge base — cached across requests.
            { type: 'text', text: RMC_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
            // Volatile context kept after the cache breakpoint so it doesn't invalidate the cache.
            { type: 'text', text: `Today's date is ${today}.` },
          ],
          messages,
        });

        llm.on('text', (delta) => {
          controller.enqueue(encoder.encode(delta));
        });

        await llm.finalMessage();
        controller.close();
      } catch (err) {
        // eslint-disable-next-line no-console -- surface server-side LLM errors in logs
        console.error('[api/ask] streaming error:', err);
        controller.enqueue(
          encoder.encode(
            "\n\nSorry — I'm having trouble responding right now. Please try again, or reach us at info@rmc.org.rw or +250 788 000 000.",
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      // Disable proxy buffering so tokens stream as they arrive.
      'x-accel-buffering': 'no',
    },
  });
}
