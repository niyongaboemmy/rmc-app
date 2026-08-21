/**
 * Email bodies for discussion notifications. Pure functions — no I/O — so they can be
 * unit-tested by rendering and inspecting the HTML, without a live SMTP transport.
 *
 * A minimal branded shell rather than importing the subscribers' wrapHtml(): that shell
 * carries an unsubscribe footer keyed to the subscribers table, and a discussion
 * notification goes to a USER (question/answer author), who is not necessarily a
 * newsletter subscriber. Wiring the two identity systems together is a real task (see the
 * opt-out note in the plan §10-Q8); until then this keeps them separate and honest.
 */

interface Built {
  subject: string;
  html: string;
  text: string;
}

function shell(
  frontendUrl: string,
  heading: string,
  body: string,
  ctaHref: string,
  ctaLabel: string,
): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:system-ui,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;padding:24px">
      <div style="background:#0D3D24;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;font-weight:700">
        Rwanda Muslim Community — Dawah
      </div>
      <div style="background:#fff;padding:24px 20px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px">
        <h1 style="margin:0 0 12px;font-size:18px;color:#0D3D24">${heading}</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">${body}</p>
        <a href="${frontendUrl}${ctaHref}" style="display:inline-block;background:#1A7A4A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">${ctaLabel}</a>
      </div>
      <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">
        You are receiving this because you took part in a discussion on the RMC site.
      </p>
    </div></body></html>`;
}

/**
 * To the person who ASKED: RMC has answered their question and published it.
 *
 * The only discussion notification there is. The old pair — "someone answered you" and
 * "a scholar verified your answer" — both described a community forum: members answering
 * each other, and a scholar blessing one of those answers. Neither event exists now.
 */
export function answeredEmail(
  frontendUrl: string,
  locale: string,
  questionTitle: string,
  questionSlug: string,
): Built {
  const href = `/${locale}/dawah/discussions/${questionSlug}`;
  return {
    subject: `Answered: ${questionTitle}`.slice(0, 120),
    html: shell(
      frontendUrl,
      'Your question has been answered',
      `RMC has answered your question, <strong>${escapeHtml(questionTitle)}</strong>, and published it for the community.`,
      href,
      'Read the answer',
    ),
    text: `RMC has answered your question "${questionTitle}". Read it: ${frontendUrl}${href}`,
  };
}

/** Minimal HTML escape for the one place user text enters the email (the title). */
function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
