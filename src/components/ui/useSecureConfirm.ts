/**
 * useSecureConfirm — hook-only re-export.
 *
 * Vite Fast Refresh requires a file to export EITHER only components OR only
 * non-component values (hooks, constants). SecureConfirmModal.tsx exports both
 * a Provider (component) and useSecureConfirm (hook), which triggers:
 *
 *   "hmr invalidate: Could not Fast Refresh — useSecureConfirm export is incompatible"
 *
 * Splitting the hook into its own file resolves the warning and restores HMR
 * without full page reloads.
 */
export { useSecureConfirm } from './SecureConfirmModal'
