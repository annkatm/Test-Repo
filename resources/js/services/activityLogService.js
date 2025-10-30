import api from './api';

/**
 * Service for handling activity log operations
 */
export const activityLogService = {
  /**
   * Log an activity
   */
  async logActivity(action, description, modelType = null, modelId = null) {
    try {
      const response = await api.post('/activity-logs', {
        action,
        description,
        model_type: modelType,
        model_id: modelId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to prevent breaking the main flow
      return null;
    }
  },

  /**
   * Get activity logs with filtering
   */
  async getActivityLogs(filters = {}) {
    try {
      const response = await api.get('/activity-logs', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      throw error;
    }
  },

  /**
   * Log request approval
   */
  async logRequestApproval(requestId, requestData) {
    return this.logActivity(
      'Approved Request',
      `Approved request for ${requestData.equipment_name} by ${requestData.full_name}`,
      'Request',
      requestId
    );
  },

  /**
   * Log request rejection
   */
  async logRequestRejection(requestId, requestData, reason) {
    return this.logActivity(
      'Rejected Request',
      `Rejected request for ${requestData.equipment_name} by ${requestData.full_name}. Reason: ${reason}`,
      'Request',
      requestId
    );
  },

  /**
   * Log transaction update
   */
  async logTransactionUpdate(transactionId, transactionData) {
    return this.logActivity(
      'Updated Transaction',
      `Updated transaction for ${transactionData.item}`,
      'Transaction',
      transactionId
    );
  },

  /**
   * Log equipment return
   */
  async logEquipmentReturn(transactionId, returnData) {
    const equipmentName = returnData.equipment_name || returnData.item || 'Unknown Equipment';
    const employeeName = returnData.full_name || returnData.employee_name || 'Unknown Employee';
    return this.logActivity(
      'Equipment Returned',
      `${equipmentName} returned by ${employeeName}`,
      'Transaction',
      transactionId
    );
  }
};
