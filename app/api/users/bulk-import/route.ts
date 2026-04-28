import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase';
import { z } from 'zod';

const ImportRowSchema = z.object({
    name:         z.string(),
    surname:      z.string(),
    email:        z.string().min(1),   // email format validated by Supabase auth itself
    pesel:        z.string().optional(),
    department:   z.string().optional(),
    position:     z.string().optional(),
    phoneNumber:  z.string().optional(),
    iban:         z.string().optional(),
    street:       z.string().optional(),
    zipCode:      z.string().optional(),
    city:         z.string().optional(),
    hireDate:     z.string().optional(),
    contractType: z.string().optional(),
});

const BulkImportSchema = z.object({
    validRows: z.array(ImportRowSchema).min(1).max(500),
    companyId: z.string().min(1),
});

// POST /api/users/bulk-import
export async function POST(req: NextRequest) {
    const auth = await getAuthUserWithRole();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['superadmin', 'pracodawca'].includes(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = BulkImportSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = supabaseServer() as any;
    const now = new Date().toISOString();
    const { validRows, companyId } = parsed.data;

    // Pobierz WSZYSTKICH istniejących użytkowników auth (paginacja) — unikamy
    // niestabilnych sprawdzeń komunikatów błędów "already exists".
    // Ważne: perPage=1000 to max 1000 na stronę; w projektach z >1000 userami
    // musimy iterować wszystkie strony żeby nie ominąć istniejących emaili.
    const allAuthUsers: any[] = [];
    let authPage = 1;
    while (true) {
        const { data: authListData } = await supabase.auth.admin.listUsers({ perPage: 1000, page: authPage });
        const pageUsers = authListData?.users ?? [];
        allAuthUsers.push(...pageUsers);
        if (pageUsers.length < 1000) break; // last page reached
        authPage++;
    }
    const existingAuthByEmail = new Map<string, string>(
        allAuthUsers.map((u: any) => [u.email?.toLowerCase() ?? '', u.id as string])
    );

    // Utwórz konta auth + profile dla każdego pracownika
    const createdUsers: { id: string; email: string; tempPassword: string; name: string }[] = [];
    const errors: string[] = [];

    for (const row of validRows) {
        const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + '!';
        const email = row.email.toLowerCase().trim();
        const street = row.street?.trim() ?? '';
        const zipCode = row.zipCode?.trim() ?? '';
        const city = row.city?.trim() ?? '';

        let userId: string;
        const existingId = existingAuthByEmail.get(email);

        if (existingId) {
            // Sprawdź aktualną rolę — nie nadpisuj pracodawcy ani admina!
            const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', existingId)
                .single();
            const existingRole = existingProfile?.role ?? 'pracownik';
            if (['pracodawca', 'superadmin', 'partner', 'menedzer', 'dyrektor'].includes(existingRole)) {
                errors.push(`${email}: pominięto — użytkownik ma rolę ${existingRole} i nie może być importowany jako pracownik`);
                continue;
            }
            // Zwykły pracownik — zresetuj hasło żeby nowe tempPassword działało do logowania
            userId = existingId;
            await supabase.auth.admin.updateUserById(userId, {
                password: tempPassword,
                email_confirm: true,
            });
        } else {
            // Nowy użytkownik — utwórz konto auth
            const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: tempPassword,
                email_confirm: true,
            });
            if (authError || !newUser?.user) {
                console.error(`[bulk-import] createUser error for ${email}:`, authError?.message ?? 'no user returned');
                errors.push(`${email}: ${authError?.message ?? 'no user returned'}`);
                continue;
            }
            userId = newUser.user.id;
        }

        const rawIban = row.iban ? row.iban.replace(/\s+/g, '').toUpperCase() : null;
        const isUZ = row.contractType?.toUpperCase().includes('UZ') || row.contractType?.includes('ZLECENIE');

        // Upewnij się, że hire_date jest w formacie YYYY-MM-DD lub null
        // (PostgreSQL DATE odrzuci inne formaty, np. "28.04.2026")
        const hireDateRaw = row.hireDate?.trim() ?? '';
        const hireDate = /^\d{4}-\d{2}-\d{2}$/.test(hireDateRaw) ? hireDateRaw : null;

        // Zaszyfruj PESEL jeśli podany (kolumna pesel_encrypted, klucz z EBS_PESEL_KEY)
        let peselEncrypted: string | null = null;
        if (row.pesel) {
            const peselKey = process.env.EBS_PESEL_KEY;
            if (peselKey) {
                const { data: enc } = await supabase.rpc('encrypt_pesel', {
                    p_pesel: row.pesel,
                    p_key:   peselKey,
                });
                peselEncrypted = enc ?? null;
            }
        }

        // Utwórz lub zaktualizuj profil (upsert) — bez temp_password żeby kolumna nie blokowała
        const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
                id:              userId,
                role:            'pracownik',
                full_name:       `${row.name} ${row.surname}`,
                company_id:      companyId,
                department:      row.department ?? null,
                position:        row.position ?? null,
                phone_number:    row.phoneNumber ?? null,
                pesel:           row.pesel ?? null,
                pesel_encrypted: peselEncrypted,
                address_street:  street || null,
                address_zip:     zipCode || null,
                address_city:    city || null,
                iban:          rawIban,
                iban_verified: !!rawIban,
                iban_verified_at: rawIban ? now : null,
                contract_type: isUZ ? 'UZ' : 'UOP',
                hire_date:     hireDate,
                status:        'active',
                terms_accepted: true,
                terms_accepted_at: now,
            }, { onConflict: 'id' });

        if (profileError) {
            console.error(`[bulk-import] profile upsert error for ${email}:`, profileError.message);
            errors.push(`${email}: profile error — ${profileError.message}`);
            continue;
        }

        // Zapisz hasło tymczasowe oddzielnie — ignoruj błąd jeśli kolumna nie istnieje
        await supabase
            .from('user_profiles')
            .update({ temp_password: tempPassword })
            .eq('id', userId);

        createdUsers.push({ id: userId, email, tempPassword, name: `${row.name} ${row.surname}` });
    }

    // Zapisz historię importu
    const reportId = `REP-${Date.now()}`;
    await supabase.from('import_history').insert({
        id:              reportId,
        company_id:      companyId,
        hr_name:         auth.email,
        total_processed: createdUsers.length,
        status:          errors.length === 0 ? 'SUCCESS' : createdUsers.length > 0 ? 'PARTIAL' : 'ERROR',
        report_data: {
            reportId,
            date:          now,
            importedCount: createdUsers.length,
            errors,
            users:         createdUsers.map(u => ({ id: u.id, email: u.email, name: u.name, tempPassword: u.tempPassword })),
        },
    });

    return NextResponse.json({
        imported: createdUsers.length,
        errors,
        reportId,
        users: createdUsers.map(u => ({ id: u.id, email: u.email, name: u.name, tempPassword: u.tempPassword })),
    }, { status: 201 });
}
