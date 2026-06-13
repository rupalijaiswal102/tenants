export function usePermission(module = null) {
  const authData = JSON.parse(localStorage.getItem('neoteric_auth') || '{}');
  const role = authData?.role || 'Viewer';

  // Super Admin always gets full access
  if (role === 'Super Admin') {
    return {
      role, isViewer: false,
      canView: true, canAdd: true, canEdit: true, canDelete: true,
      can: () => true,
    };
  }

  // Module-specific permissions
  if (module) {
    const p = authData?.permissions?.[module];
    if (p && typeof p === 'object') {
      const isViewer = !p.add && !p.edit && !p.delete;
      return {
        role, isViewer,
        canView:   p.view   ?? false,
        canAdd:    p.add    ?? false,
        canEdit:   p.edit   ?? false,
        canDelete: p.delete ?? false,
        can: (action) => p[action] ?? false,
      };
    }
  }

  // Fallback: role-based
  const isViewer = role === 'Viewer';
  const canDelete = ['Super Admin', 'Admin'].includes(role);
  return {
    role, isViewer,
    canView:   true,
    canAdd:    !isViewer,
    canEdit:   !isViewer,
    canDelete,
    can: (action) => {
      if (action === 'approve')    return ['Accounts', 'Admin'].includes(role);
      if (action === 'payment')    return !isViewer;
      if (action === 'adjustment') return !isViewer;
      return false;
    },
  };
}
