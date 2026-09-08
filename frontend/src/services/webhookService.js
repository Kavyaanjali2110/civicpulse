import { apiClient } from './api';

export const webhookService = {
  // Ingest via WhatsApp webhook simulation
  postWhatsAppWebhook: async (payload) => {
    const response = await apiClient.post('/webhooks/whatsapp', payload);
    return response.data;
  },

  // Ingest via SMS webhook simulation
  postSMSWebhook: async (payload) => {
    const response = await apiClient.post('/webhooks/sms', payload);
    return response.data;
  },

  // Ingest via Generic Civic Complaint Webhook
  postGenericWebhook: async (payload) => {
    const response = await apiClient.post('/webhooks/civic-complaint', payload);
    return response.data;
  },

  // Omnichannel intake metrics & breakdown
  getOmnichannelStats: async () => {
    const response = await apiClient.get('/gov/omnichannel/stats');
    return response.data;
  },

  // Notification history queries
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  getComplaintNotifications: async (complaintId) => {
    const response = await apiClient.get(`/notifications/complaint/${complaintId}`);
    return response.data;
  },
};

export default webhookService;
