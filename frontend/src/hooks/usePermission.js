export function usePermission() {
  const authData = JSON.parse(localStorage.getItem('neoteric_auth') || '{}');
  const role = authData?.role || 'Viewer';
  const isViewer = role === 'Viewer';
  return {
    role,
    isViewer,
    canAdd:    !isViewer,
    canEdit:   !isViewer,
    canDelete: ['Super Admin', 'Admin'].includes(role),
  };
}
