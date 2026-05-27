// POST /api/crm/offers/generate
// Body: { firma, pracownicyCount, provisionPct, podsumowanie, leadId? }
// 1. Renderuje HTML oferty (lib/crm/offer/offerTemplate)
// 2. Wysyła HTML do PDF servera (Puppeteer) → buffer
// 3. Zapisuje PDF do Supabase Storage (bucket `offers`)
// 4. Tworzy rekord w `crm_offers` + zwraca signed URL

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { admin } from '@/lib/crm/visibility';
import { renderOfferHtml, type OfferData } from '@/lib/crm/offer/offerTemplate';
import { renderOfferPdf } from '@/lib/crm/offer/pdfRenderer';

// Vercel serverless config — needs more memory + time for Chromium
export const runtime = 'nodejs';
export const maxDuration = 60;

let cachedLogo: string | null = null;
async function readLogoDataUri(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const buf = await readFile(join(process.cwd(), 'public', 'logo.png'));
    cachedLogo = `data:image/png;base64,${buf.toString('base64')}`;
    return cachedLogo;
  } catch {
    return null;
  }
}

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function POST(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { firma, pracownicyCount, provisionPct, podsumowanie, leadId } = body ?? {};

  if (!firma?.nazwa || typeof pracownicyCount !== 'number' || !podsumowanie) {
    return NextResponse.json({ error: 'Niekompletne dane oferty' }, { status: 400 });
  }

  const sb = admin();

  // Resolve advisor name
  const { data: profile } = await sb
    .from('user_profiles')
    .select('full_name')
    .eq('id', auth.id)
    .single();

  const advisorName = profile?.full_name ?? auth.email ?? 'Doradca BBS';
  const logoDataUri = await readLogoDataUri();

  const offerData: OfferData = {
    firma,
    pracownicyCount,
    provisionPct: Number(provisionPct) || 0,
    podsumowanie,
    advisor: { name: advisorName, email: auth.email ?? undefined },
    logoDataUri: logoDataUri ?? undefined,
  };

  const html = renderOfferHtml(offerData);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderOfferPdf(html);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: `Generowanie PDF nie powiodło się: ${msg}` },
      { status: 500 }
    );
  }

  // Upload to Storage
  const slug = (firma.nazwa as string)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'oferta';
  const ts = Date.now();
  const path = `oferty/${slug}-${ts}.pdf`;

  const { error: uploadErr } = await sb.storage
    .from('offers')
    .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: `Upload error: ${uploadErr.message}` }, { status: 500 });
  }

  const { data: signed, error: signErr } = await sb.storage
    .from('offers')
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 rok

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Nie udało się wygenerować linku' }, { status: 500 });
  }

  // Insert row
  const { data: offerRow, error: insertErr } = await sb
    .from('crm_offers')
    .insert({
      lead_id:               leadId ?? null,
      created_by:            auth.id,
      company_name:          firma.nazwa,
      company_nip:           firma.nip ?? null,
      employees_count:       pracownicyCount,
      provision_pct:         offerData.provisionPct,
      total_savings_monthly: podsumowanie.oszczednoscBrutto,
      total_savings_yearly:  podsumowanie.oszczednoscRoczna,
      net_savings_monthly:   podsumowanie.oszczednoscNetto,
      pdf_url:               signed.signedUrl,
      pdf_path:              path,
      snapshot:              offerData,
    })
    .select('id, created_at, pdf_url')
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    id:        offerRow.id,
    pdfUrl:    offerRow.pdf_url,
    createdAt: offerRow.created_at,
    fileName:  `oferta-${slug}-${ts}.pdf`,
  }, { status: 201 });
}
