/**
 * Permission Service
 * Handles user permissions and access control
 */
class PermissionService {
  constructor(app) {
    this.app = app;
  }

  /**
   * Apply permission control to UI elements
   * @param {Array} userPermissions - User permissions array
   */
  applyControl(userPermissions = []) {
    console.log('[PermissionService] Applying permissions. User permissions:', userPermissions);
    
    // Get all elements with data-permission attribute
    const permissionElements = document.querySelectorAll('[data-permission]');
    
    permissionElements.forEach(element => {
      const requiredPermission = element.getAttribute('data-permission');
      const elementText = element.textContent?.trim() || 'element';
      
      const hasPerm = this.hasPermission(userPermissions, requiredPermission);
      console.log(`[PermissionService] Element: ${elementText}, Required: ${requiredPermission}, Has Perm: ${hasPerm}`);

      if (hasPerm) {
        // User has permission - show element
        element.classList.remove('hidden');
        element.disabled = false;
        console.log(`[PermissionService] Showing element: ${elementText} (requires: ${requiredPermission})`);
      } else {
        // User doesn't have permission - hide element
        element.classList.add('hidden');
        element.disabled = true; // Also disable the element
        console.log(`[PermissionService] Hiding element: ${elementText} (requires: ${requiredPermission})`);
      }
    });
  }

  /**
   * Check if user has specific permission
   * @param {Array} userPermissions - User permissions array
   * @param {string} requiredPermission - Required permission
   * @returns {boolean} Has permission
   */
  hasPermission(userPermissions, requiredPermission) {
    console.log('[PermissionService] Checking permission:', requiredPermission, 'against', userPermissions);
    if (!userPermissions || !Array.isArray(userPermissions)) {
      console.log('[PermissionService] Invalid userPermissions array.');
      return false;
    }
    
    const result = userPermissions.includes(requiredPermission);
    console.log('[PermissionService] Result for', requiredPermission, ':', result);
    return result;
  }

  /**
   * Check if user has any of the specified permissions
   * @param {Array} userPermissions - User permissions array
   * @param {Array} requiredPermissions - Array of required permissions
   * @returns {boolean} Has any permission
   */
  hasAnyPermission(userPermissions, requiredPermissions) {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return false;
    }
    
    if (!requiredPermissions || !Array.isArray(requiredPermissions)) {
      return false;
    }
    
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
  }

  /**
   * Check if user has all specified permissions
   * @param {Array} userPermissions - User permissions array
   * @param {Array} requiredPermissions - Array of required permissions
   * @returns {boolean} Has all permissions
   */
  hasAllPermissions(userPermissions, requiredPermissions) {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return false;
    }
    
    if (!requiredPermissions || !Array.isArray(requiredPermissions)) {
      return false;
    }
    
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  }

  /**
   * Get user role from permissions
   * @param {Array} userPermissions - User permissions array
   * @returns {string} User role
   */
  getUserRole(userPermissions) {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return 'guest';
    }
    
    if (userPermissions.includes('admin')) {
      return 'admin';
    }
    
    if (userPermissions.includes('orchestrate')) {
      return 'orchestrator';
    }
    
    if (userPermissions.includes('write')) {
      return 'editor';
    }
    
    if (userPermissions.includes('read')) {
      return 'viewer';
    }
    
    return 'guest';
  }

  /**
   * Check if user can perform action
   * @param {string} action - Action to check
   * @returns {boolean} Can perform action
   */
  canPerformAction(action) {
    const user = this.app.state.user;
    if (!user || !user.permissions) {
      return false;
    }
    
    const actionPermissions = {
      'create_document': ['write'],
      'read_document': ['read'],
      'update_document': ['write'],
      'delete_document': ['write'],
      'create_deadline': ['write'],
      'read_deadline': ['read'],
      'update_deadline': ['write'],
      'delete_deadline': ['write'],
      'create_hearing': ['write'],
      'read_hearing': ['read'],
      'update_hearing': ['write'],
      'delete_hearing': ['write'],
      'orchestrate_case': ['orchestrate'],
      'admin_access': ['admin']
    };
    
    const requiredPermissions = actionPermissions[action];
    if (!requiredPermissions) {
      return false;
    }
    
    return this.hasAnyPermission(user.permissions, requiredPermissions);
  }
}

// Export for module usage
export { PermissionService };
