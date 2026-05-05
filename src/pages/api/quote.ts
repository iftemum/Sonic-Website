import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Resend } from 'resend';
import { env } from 'cloudflare:workers';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'photo';

export const POST: APIRoute = async ({ request }) => {

  const required = [
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ACCOUNT_ID',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
    'RESEND_API_KEY',
    'QUOTE_EMAIL_RECIPIENT',
  ] as const;
  for (const k of required) {
    if (!env[k]) {
      return json(500, { ok: false, error: `Server misconfigured: ${k} missing.` });
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { ok: false, error: 'Could not parse form data.' });
  }

  const phone = String(form.get('phone') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const address = String(form.get('address') ?? '').trim();
  const homeSize = String(form.get('homeSize') ?? '').trim();
  const preferredDate = String(form.get('preferredDate') ?? '').trim();
  const notes = String(form.get('notes') ?? '').trim();
  const services = form.getAll('services').map((v) => String(v));

  if (!phone || !email || !address) {
    return json(400, {
      ok: false,
      error: 'Phone, email, and address are required.',
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'Invalid email address.' });
  }

  const photos = form
    .getAll('photos')
    .filter((p): p is File => p instanceof File && p.size > 0)
    .slice(0, 8);

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const ts = Date.now();
  const publicBase = env.R2_PUBLIC_URL!.replace(/\/$/, '');
  const uploadedUrls: { name: string; url: string }[] = [];

  try {
    for (const photo of photos) {
      if (!/^image\/(jpeg|png)$/.test(photo.type)) continue;
      const safeName = sanitizeFilename(photo.name);
      const key = `quote-requests/${ts}-${safeName}`;
      const buf = new Uint8Array(await photo.arrayBuffer());
      await s3.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME!,
          Key: key,
          Body: buf,
          ContentType: photo.type,
          ContentLength: buf.byteLength,
        }),
      );
      uploadedUrls.push({ name: photo.name, url: `${publicBase}/${key}` });
    }
  } catch (err) {
    console.error('R2 upload failed', err);
    return json(500, { ok: false, error: 'Could not upload photos. Please try again.' });
  }

  const photosHtml = uploadedUrls.length
    ? `<ul>${uploadedUrls
        .map(
          (p) =>
            `<li><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></li>`,
        )
        .join('')}</ul>`
    : '<p><em>No photos provided.</em></p>';

  const photosText = uploadedUrls.length
    ? uploadedUrls.map((p) => `- ${p.name}: ${p.url}`).join('\n')
    : 'No photos provided.';

  const servicesText = services.length ? services.join(', ') : 'Not specified';

  const html = `
    <h2 style="font-family:Inter,Arial,sans-serif;color:#0b1230">New quote request</h2>
    <table style="font-family:Inter,Arial,sans-serif;color:#111;border-collapse:collapse" cellpadding="6">
      <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone)}</td></tr>
      <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
      <tr><td><strong>Address / Town</strong></td><td>${escapeHtml(address)}</td></tr>
      <tr><td><strong>Services</strong></td><td>${escapeHtml(servicesText)}</td></tr>
      <tr><td><strong>Home size</strong></td><td>${escapeHtml(homeSize || 'Not specified')}</td></tr>
      <tr><td><strong>Preferred date</strong></td><td>${escapeHtml(preferredDate || 'Flexible')}</td></tr>
      <tr><td valign="top"><strong>Notes</strong></td><td>${escapeHtml(notes || '—').replace(/\n/g, '<br/>')}</td></tr>
    </table>
    <h3 style="font-family:Inter,Arial,sans-serif;color:#0b1230">Photos</h3>
    ${photosHtml}
  `;

  const text = `New quote request

Phone: ${phone}
Email: ${email}
Address / Town: ${address}
Services: ${servicesText}
Home size: ${homeSize || 'Not specified'}
Preferred date: ${preferredDate || 'Flexible'}
Notes: ${notes || '—'}

Photos:
${photosText}
`;

  try {
    const resend = new Resend(env.RESEND_API_KEY!);
    const { error } = await resend.emails.send({
      from: 'Sonic Quote <onboarding@resend.dev>',
      to: [env.QUOTE_EMAIL_RECIPIENT!],
      replyTo: email,
      subject: `New quote request — ${address}`,
      html,
      text,
    });
    if (error) {
      console.error('Resend error', error);
      return json(500, {
        ok: false,
        error: 'Could not send the email notification.',
      });
    }
  } catch (err) {
    console.error('Resend send failed', err);
    return json(500, { ok: false, error: 'Could not send the email notification.' });
  }

  return json(200, { ok: true });
};

export const GET: APIRoute = () =>
  json(405, { ok: false, error: 'Method not allowed.' });
