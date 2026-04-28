
import { useState, useCallback } from 'react';
import { User, Role, ContractType, ImportRow, ImportHistoryEntry, UserFinance, Company } from '../../types';
import { supabaseProfileToUser } from '../../lib/supabaseToUser';
import { LogEventFn, NotifyUserFn, AddToastFn } from '../../types/callbacks';
import { INITIAL_USERS } from '../../services/mockData';

export const useUserLogic = (
    companies: Company[],
    logEvent: LogEventFn,
    notifyUser: NotifyUserFn,
    addToast: AddToastFn,
    currentUser: User
) => {
  // In-memory users: INITIAL_USERS seeds demo roles (SUPERADMIN, ADVISOR, etc.).
  // Real Supabase users (HR, EMPLOYEE) are loaded via fetchUsersFromApi and merged in.
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([]);

  // --- Pobierz użytkowników z API (wywoływane z StrattonContext gdy currentUserId jest znany) ---
  const fetchUsersFromApi = useCallback(async (companyId?: string) => {
    const usersUrl = companyId
      ? `/api/users?companyId=${encodeURIComponent(companyId)}`
      : '/api/users';
    const r = await fetch(usersUrl).catch(() => null);
    if (!r?.ok) return;
    const profiles: any[] = await r.json().catch(() => []);
    const mapped: User[] = profiles.map(p =>
      supabaseProfileToUser(p, p.email ?? '', p.company_id ?? '')
    );
    const mappedIds = new Set(mapped.map(u => u.id));
    // Keep in-memory-only users (SUPERADMIN, ADVISOR etc.) that aren’t in Supabase
    setUsers(prev => {
      const mappedEmails = new Set(mapped.map(u => u.email.toLowerCase()));
      const mappedPesels = new Set(mapped.map(u => u.pesel).filter(Boolean));
      const localOnly = prev.filter(u => {
        if (mappedIds.has(u.id)) return false;
        // Drop local placeholder users once the persisted counterpart exists.
        if (mappedEmails.has(u.email.toLowerCase())) return false;
        if (u.pesel && mappedPesels.has(u.pesel)) return false;
        return true;
      });
      return [...mapped, ...localOnly];
    });
  }, []);

  // --- Operacje na użytkownikach ---

  const handleUpdateEmployee = useCallback(async (userId: string, data: Partial<User>) => {
    // Optimistic
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));

    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name:     data.name,
        department:    data.department,
        position:      data.position,
        phone_number:  data.identity?.phoneNumber,
        contract_type: data.contract?.type,
      }),
    });

    if (!res.ok) {
      addToast('Błąd', 'Nie udało się zaktualizować danych.', 'ERROR');
      return;
    }

    logEvent('USER_UPDATE', `Zaktualizowano dane pracownika ${userId}.`, userId, 'USER');
    addToast('Zapisano', 'Dane pracownika zostały zaktualizowane.', 'SUCCESS');
  }, [logEvent, addToast]);

  const handleDeactivateEmployee = useCallback(async (employeeId: string) => {
    const user = users.find(u => u.id === employeeId);
    // Optimistic
    setUsers(prev => prev.map(u => u.id === employeeId ? { ...u, status: 'INACTIVE' } : u));

    const res = await fetch(`/api/users/${employeeId}/deactivate`, { method: 'PATCH' });

    if (!res.ok) {
      setUsers(prev => prev.map(u => u.id === employeeId ? { ...u, status: 'ACTIVE' } : u));
      addToast('Błąd', 'Nie udało się dezaktywować konta.', 'ERROR');
      return;
    }

    if (user) {
      logEvent('USER_DEACTIVATED', `Dezaktywowano pracownika ${user.name} (${user.id}).`, employeeId, 'USER');
      addToast('Pracownik Dezaktywowany', `Konto ${user.name} oznaczone jako nieaktywne.`, 'INFO');
    }
  }, [users, logEvent, addToast]);

  const handleAnonymizeUser = useCallback(async (userId: string) => {
    const res = await fetch(`/api/users/${userId}/anonymize`, { method: 'POST' });

    if (!res.ok) {
      addToast('Błąd', 'Nie udało się zanonimizować użytkownika.', 'ERROR');
      return;
    }

    setUsers(prev => prev.map(u => u.id !== userId ? u : {
      ...u,
      status: 'ANONYMIZED',
      name: 'Użytkownik Zanonimizowany',
      email: `deleted_${u.id.slice(-6)}@anon.ebs`,
      pesel: '***',
      department: undefined,
      position: undefined,
      finance: undefined,
    }));

    logEvent('USER_ANONYMIZED', `Zanonimizowano dane użytkownika ${userId} (RODO).`, userId, 'USER');
    addToast('Użytkownik Zanonimizowany', 'Dane osobowe nadpisane. Historia transakcji zachowana.', 'WARNING');
  }, [logEvent, addToast]);

  const handleBulkImport = useCallback(async (validRows: ImportRow[], overrideCompanyId?: string) => {
    const companyId = overrideCompanyId ?? currentUser?.companyId;
    if (!companyId) {
      addToast('Błąd Importu', 'Brak kontekstu firmy. Zaloguj się ponownie jako HR.', 'ERROR');
      return null;
    }

    const res = await fetch('/api/users/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ validRows, companyId }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      addToast('Błąd importu', errBody.error ?? 'Nie udało się zaimportować pracowników. Sprawdź połączenie i spróbuj ponownie.', 'ERROR');
      return null;
    }

    const result = await res.json();
    const { imported, errors: apiErrors, reportId, users: importedUsers } = result;

    // Jeśli API zwróciło błędy importu — pokaż je w toaście (max 3 pierwsze)
    if (Array.isArray(apiErrors) && apiErrors.length > 0 && imported === 0) {
      const preview = apiErrors.slice(0, 3).join('\n');
      addToast('Błąd importu pracowników', preview + (apiErrors.length > 3 ? `\n...i ${apiErrors.length - 3} więcej` : ''), 'ERROR');
      return null;
    }
    const errors = apiErrors;

    // Odśwież listę użytkowników z Supabase
    let supabaseEmails = new Set<string>();
    try {
      // Użyj companyId (przekazane przez wywołującego) jeśli dostępne,
      // fallback do /api/users dla superadmin (brak companyId = wszyscy)
      const refreshUrl = companyId
        ? `/api/users?companyId=${encodeURIComponent(companyId)}`
        : '/api/users';
      const refreshRes = await fetch(refreshUrl);
      if (refreshRes.ok) {
        const profiles: any[] = await refreshRes.json();
        const mapped: User[] = profiles.map(p =>
          supabaseProfileToUser(p, p.email ?? '', p.company_id ?? '')
        );
        supabaseEmails = new Set(mapped.map(u => u.email.toLowerCase()));
        const mappedIds = new Set(mapped.map(u => u.id));
        setUsers(prev => {
          const mappedPesels = new Set(mapped.map(u => u.pesel).filter(Boolean));
          const localOnly = prev.filter(u => {
            if (mappedIds.has(u.id)) return false;
            if (supabaseEmails.has(u.email.toLowerCase())) return false;
            if (u.pesel && mappedPesels.has(u.pesel)) return false;
            return true;
          });
          return [...mapped, ...localOnly];
        });
      }
    } catch (_) {}

    // Jeśli Supabase nie zdołało utworzyć wszystkich pracowników, pokaż info w błędach
    const locallyAdded: string[] = [];
    if (imported < validRows.length) {
      const missing = validRows.filter(r => !supabaseEmails.has(r.email.toLowerCase()));
      if (missing.length > 0) {
        // NIE dodawaj fake-ID użytkowników do stanu lokalnego — znikną po odświeżeniu
        // Zamiast tego zgłoś jako błędy w raporcie
        locallyAdded.push(...missing.map(r => r.email));
      }
    }

    const totalAdded = imported;
    const failedCount = locallyAdded.length;

    const historyEntry: ImportHistoryEntry = {
      id: reportId,
      companyId,
      date: new Date().toISOString(),
      hrName: currentUser.name,
      totalProcessed: totalAdded,
      status: errors.length === 0 && failedCount === 0 ? 'SUCCESS' : 'PARTIAL',
      reportData: { reportId, importedCount: totalAdded, errors: failedCount > 0 ? [`Nie udało się zapisać: ${locallyAdded.join(', ')}`] : [] },
    };
    setImportHistory(prev => [historyEntry, ...prev]);

    logEvent('BULK_IMPORT', `Zaimportowano ${totalAdded} pracowników.`, reportId, 'IMPORT');
    if (failedCount > 0) {
      addToast('Częściowy sukces', `Dodano ${totalAdded} z ${validRows.length} pracowników. ${failedCount} nie udało się zapisać w bazie.`, 'WARNING');
    } else {
      addToast('Sukces', `Dodano ${totalAdded} pracowników.`, 'SUCCESS');
    }

    return {
      reportData: historyEntry.reportData,
      company: companies.find(c => c.id === companyId),
      user: currentUser,
      newEmployees: (importedUsers ?? []) as { id: string; email: string; name: string; tempPassword: string }[],
    };
  }, [companies, currentUser, logEvent, addToast]);

  const handleUpdateUserFinance = useCallback(async (userId: string, financeData: UserFinance) => {
    const iban = (financeData as any)?.payoutAccount?.iban;
    const res = await fetch(`/api/users/${userId}/finance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iban, iban_verified: true }),
    });

    if (!res.ok) { addToast('Błąd', 'Nie udało się zaktualizować danych finansowych.', 'ERROR'); return; }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, finance: { ...u.finance, ...financeData } } : u));
    addToast('Dane Finansowe', 'Konto bankowe zostało zaktualizowane.', 'SUCCESS');
  }, [addToast]);

  const handleRequestIbanChange = useCallback(async (userId: string, newIban: string, reason: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const res = await fetch(`/api/users/${userId}/iban-change-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newIban, reason }),
    });

    if (!res.ok) {
      const err = await res.json();
      addToast('Błąd', err.error ?? 'Nie udało się złożyć wniosku.', 'ERROR');
      return;
    }

    logEvent('IBAN_CHANGE_REQUEST', `Użytkownik ${user.name} wnioskuje o zmianę IBAN.`, userId, 'USER');
    notifyUser('ALL_ADMINS', `Wniosek o zmianę konta bankowego: ${user.name}. Powód: "${reason}"`, 'WARNING', {
      type: 'REVIEW_IBAN', targetId: userId, label: 'Weryfikuj Wniosek', variant: 'primary'
    }, userId, 'USER');
    addToast('Wniosek Wysłany', 'Zmiana konta wymaga weryfikacji Administratora.', 'INFO');
  }, [users, logEvent, notifyUser, addToast]);

  const handleResolveIbanChange = useCallback(async (userId: string, approved: boolean, rejectionReason?: string) => {
    const res = await fetch(`/api/users/${userId}/iban-change-request/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, rejectionReason }),
    });

    if (!res.ok) { addToast('Błąd', 'Nie udało się przetworzyć wniosku.', 'ERROR'); return; }

    const result = await res.json();
    const user = users.find(u => u.id === userId);

    if (approved && result.newIban) {
      setUsers(prev => prev.map(u => u.id !== userId ? u : {
        ...u,
        finance: { ...u.finance, payoutAccount: { iban: result.newIban, country: 'PL', isVerified: true } }
      }));
    }

    logEvent(approved ? 'IBAN_CHANGE_APPROVED' : 'IBAN_CHANGE_REJECTED',
      `Decyzja dla ${user?.name}. ${approved ? 'Zatwierdzono' : 'Odrzucono'}.`, userId, 'USER');

    notifyUser(userId,
      approved ? 'Twój nowy numer konta został zatwierdzony.' : `Odrzucono zmianę. Powód: ${rejectionReason ?? 'Brak'}`,
      approved ? 'SUCCESS' : 'ERROR'
    );

    addToast(approved ? 'Zatwierdzono' : 'Odrzucono',
      approved ? 'Dane pracownika zaktualizowane.' : 'Wniosek odrzucony.',
      approved ? 'SUCCESS' : 'ERROR');
  }, [users, logEvent, notifyUser, addToast]);

  return {
    users,
    setUsers,
    importHistory,
    setImportHistory,
    fetchUsersFromApi,
    handleUpdateEmployee,
    handleDeactivateEmployee,
    handleBulkImport,
    handleUpdateUserFinance,
    handleRequestIbanChange,
    handleResolveIbanChange,
    handleAnonymizeUser,
  };
};
