// frontend/src/api/reports.ts
import { API_URL } from '../utils/config'; // import the production API URL
import axios from 'axios';
import { getToken } from '../utils/auth';


// Create a new report
export const createReport = async (formData: FormData) => {
  const token = await getToken();
  if (!token) throw new Error('No auth token found');

  const response = await axios.post(`${API_URL}/reports`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get reports for logged-in user
export const getAllReports = async () => {
  const token = await getToken();
  if (!token) throw new Error('No auth token found');

  const response = await axios.get(`${API_URL}/reports`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
};

// Confirm resolution (user confirms the report is resolved)
export const confirmResolution = async (reportId: string) => {
  const token = await getToken();
  if (!token) throw new Error('No auth token found');

  const response = await axios.put(
    `${API_URL}/reports/${reportId}/confirm`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};

// Reject resolution (user reports the issue is still not resolved)
export const rejectResolution = async (reportId: string, reason: string) => {
  const token = await getToken();
  if (!token) throw new Error('No auth token found');

  const response = await axios.put(
    `${API_URL}/reports/${reportId}/reject`,
    { reason },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data;
};
