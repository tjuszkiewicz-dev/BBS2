'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { OrgChart } from './OrgChart';
import { OrgNodeEditor } from './OrgNodeEditor';
import type { OrgUser } from './OrgChart';

export const OrgChartView: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all users for the editor dropdown
  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/org/users');
      if (!res.ok) return;
      const data: OrgUser[] = await res.json();
      setAllUsers(data);
    } catch {
      // silently ignore — OrgChart will show its own error
    }
  }, []);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers, refreshKey]);

  const handleNodeClick = (user: OrgUser) => {
    setSelectedUser(prev => (prev?.id === user.id ? null : user));
  };

  const handleClose = () => {
    setSelectedUser(null);
  };

  const handleSave = async (
    id: string,
    updates: { full_name?: string; role?: string; manager_id?: string | null }
  ) => {
    const res = await fetch(`/api/org/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  const handleNodeDrop = async (nodeId: string, newManagerId: string) => {
    try {
      await handleSave(nodeId, { manager_id: newManagerId });
      handleRefresh();
    } catch {
      // ignore — user can use editor panel to fix
    }
  };

  return (
    <div className="relative w-full h-full">
      <OrgChart
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedUser?.id ?? null}
        refreshKey={refreshKey}
        onNodeDrop={handleNodeDrop}
      />
      <OrgNodeEditor
        user={selectedUser}
        allUsers={allUsers}
        onClose={handleClose}
        onSave={handleSave}
        onRefresh={handleRefresh}
      />
    </div>
  );
};
