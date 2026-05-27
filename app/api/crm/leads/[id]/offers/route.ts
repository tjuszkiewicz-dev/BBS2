// GET /api/crm/leads/[id]/offers — list offers attached to a lead
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUserWithRole();
  if (!auth || !CRM_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id: leadId } = await params;

  const { data, error } = await admin()
    .from('crm_offers')
    .select('id, company_name, employees_count, provision_pct, total_savings_monthly, total_savings_yearly, net_savings_monthly, pdf_url, pdf_path, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Refresh signed URLs (signed URLs expire — generate fresh ones for each request)
  const sb = admin();
  const withFreshUrls = await Promise.all(
    (data ?? []).map(async (o) => {
      if (!o.pdf_path) return o;
      const { data: signed } = await sb.storage
        .from('offers')
        .createSignedUrl(o.pdf_path, 60 * 60 * 24 * 7); // 7 days
      return { ...o, pdf_url: signed?.signedUrl ?? o.pdf_url };
    })
  );

  return NextResponse.json(withFreshUrls);
}
