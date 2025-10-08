/**
 * JurisFlow Application Entry Point
 * Modular frontend architecture following software engineering best practices
 */

import { App } from './core/App.js';
import { ApiService } from './services/ApiService.js';
import { AuthService } from './services/AuthService.js';
import { NavigationService } from './services/NavigationService.js';
import { PermissionService } from './services/PermissionService.js';
import { DocumentService } from './services/DocumentService.js';
import { DeadlineService } from './services/DeadlineService.js';
import { HearingService } from './services/HearingService.js';
import { ProcessService } from './services/ProcessService.js';

// Application instance
let app;

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('[App] Starting JurisFlow application...');
    
    // Create application instance
    app = new App();
    
    // Register core services
    app.registerService('api', new ApiService(app));
    app.registerService('auth', new AuthService(app));
    app.registerService('navigation', new NavigationService(app));
    app.registerService('permission', new PermissionService(app));
    
    // Register feature services
    app.registerService('document', new DocumentService(app));
    app.registerService('deadline', new DeadlineService(app));
    app.registerService('hearing', new HearingService(app));
    app.registerService('process', new ProcessService(app));
    
    // Initialize app after services are registered
    await app.init();
    
    // Make services globally available for backward compatibility
    window.AuthService = app.getService('auth');
    window.NavigationService = app.getService('navigation');
    window.DocumentService = app.getService('document');
    window.DeadlineService = app.getService('deadline');
    window.HearingService = app.getService('hearing');
    window.ProcessService = app.getService('process');
    
    // Make utility functions globally available
    window.closeDataModal = closeDataModal;
    window.closeConfirmDeleteModal = closeConfirmDeleteModal;
    window.closeDeleteModal = closeDeleteModal;
    window.closeDeleteDeadlineModal = closeDeleteDeadlineModal;
    window.closeDeleteHearingModal = closeDeleteHearingModal;
    window.executeDelete = executeDelete;
    window.executeDeleteDeadline = executeDeleteDeadline;
    window.executeDeleteHearing = executeDeleteHearing;
    window.executeConfirmDelete = executeConfirmDelete;
    
    
  } catch (error) {
    console.error('[App] Failed to initialize application:', error);
    alert('Erro ao inicializar a aplicação. Recarregue a página.');
  }
});


/**
 * Close data modal
 */
function closeDataModal() {
  const modal = document.getElementById('dataModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Close confirm delete modal
 */
function closeConfirmDeleteModal() {
  const modal = document.getElementById('confirmDeleteModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Close delete deadline modal
 */
function closeDeleteDeadlineModal() {
  const modal = document.getElementById('deleteDeadlineModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Close delete hearing modal
 */
function closeDeleteHearingModal() {
  const modal = document.getElementById('deleteHearingModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Execute delete operation
 */
function executeDelete() {
  const deleteId = document.getElementById('deleteIdInput')?.value;
  if (deleteId) {
    // This should be implemented by DocumentService
    if (window.DocumentService) {
      window.DocumentService.delete(deleteId);
    }
    closeDeleteModal();
  }
}

/**
 * Execute delete deadline operation
 */
function executeDeleteDeadline() {
  const deleteId = document.getElementById('deleteDeadlineIdInput')?.value;
  if (deleteId) {
    // This should be implemented by DeadlineService
    if (window.DeadlineService) {
      window.DeadlineService.delete(deleteId);
    }
    closeDeleteDeadlineModal();
  }
}

/**
 * Execute delete hearing operation
 */
function executeDeleteHearing() {
  const deleteId = document.getElementById('deleteHearingIdInput')?.value;
  if (deleteId) {
    // This should be implemented by HearingService
    if (window.HearingService) {
      window.HearingService.delete(deleteId);
    }
    closeDeleteHearingModal();
  }
}

/**
 * Execute confirm delete operation
 */
function executeConfirmDelete() {
  // This should be implemented based on the current context
  console.log('Execute confirm delete');
  closeConfirmDeleteModal();
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('[App] Global error:', event.error);
  if (app) {
    app.handleError(event.error);
  }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('[App] Unhandled promise rejection:', event.reason);
  if (app) {
    app.handleError(event.reason);
  }
});
