import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/config';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const config = {
          headers: {
            'x-auth-token': token,
          },
        };

        const res = await axios.get(`${API_URL}/reports`, config);
        setReports(res.data.data || []); // ✅ fixed
        setLoading(false);
      } catch (err) {
        console.error(err.response ? err.response.data : err.message);
        setError('Failed to fetch reports. Access denied.');
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) return <div>Loading reports...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>All Reports</h3>
      <ul>
        {reports.length > 0 ? (
          reports.map((report) => (
            <li key={report._id}>
              <p>Description: {report.description}</p>
              <p>Status: {report.status}</p>
            </li>
          ))
        ) : (
          <p>No reports found.</p>
        )}
      </ul>
    </div>
  );
};

export default Reports;
