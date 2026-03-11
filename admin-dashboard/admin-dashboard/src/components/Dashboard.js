import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import auth from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Dashboard.css';
import { API_URL } from '../utils/config';
// Chart.js imports
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showActiveReports, setShowActiveReports] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' or 'oldest'
  const [locationFilter, setLocationFilter] = useState(''); // '', 'Bulaon', 'Del Carmen'
  const [userSortBy, setUserSortBy] = useState(''); // '', 'reportsHigh', 'reportsLow', 'pointsHigh', 'pointsLow'
  const [selectedReport, setSelectedReport] = useState(null);
  const [showAdminManagement, setShowAdminManagement] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ email: '', password: '', confirmPassword: '', location: '' });
  const [userRole, setUserRole] = useState(null);
  const [adminLocation, setAdminLocation] = useState(null);
  const [currentAdminName, setCurrentAdminName] = useState('');
  const [showLoginLogs, setShowLoginLogs] = useState(false);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);
  const [loginLogsPage, setLoginLogsPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: '', cancelText: 'Cancel', type: 'danger' });
  const [successAlert, setSuccessAlert] = useState({ show: false, message: '', type: 'success' });
  const [resolutionPhoto, setResolutionPhoto] = useState(null);
  const [resolutionPhotoPreview, setResolutionPhotoPreview] = useState(null);
  const resolutionPhotoRef = useRef(null); // Ref to hold the latest photo
  const reportsPerPage = 10;
  const usersPerPage = 10;
  const logsPerPage = 10;

  const navigate = useNavigate();

  // Fetch user role
  useEffect(() => {
    const role = auth.getUserRole?.() || null;
    console.log('User role from auth:', role);
    console.log('Auth object:', auth);
    
    // Try alternative ways to get role if getUserRole doesn't exist
    if (!role) {
      const token = auth.getToken();
      if (token) {
        try {
          // Try to decode JWT token to get role and location
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token payload:', payload);
          const tokenRole = payload.role || payload.userType || payload.type;
          const tokenLocation = payload.location || null;
          setUserRole(tokenRole);
          setAdminLocation(tokenLocation);
          console.log('Role from token:', tokenRole);
          console.log('Location from token:', tokenLocation);
          return;
        } catch (e) {
          console.log('Could not decode token:', e);
        }
      }
    } else {
      // If we got role from getUserRole, also try to get location from token
      const token = auth.getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const tokenLocation = payload.location || null;
          setAdminLocation(tokenLocation);
          console.log('Location from token:', tokenLocation);
        } catch (e) {
          console.log('Could not decode token for location:', e);
        }
      }
    }
    
    setUserRole(role);
    console.log('Final user role set:', role);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await auth.getToken();
        if (!token) {
          console.log('No token found, redirecting to login...');
          navigate('/login');
          return;
        }
        
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('Fetching data from:', API_URL);

        // Fetch current admin info
        try {
          const currentUserRes = await axios.get(`${API_URL}/users/me`, config);
          console.log('Current user response:', currentUserRes.data);
          const currentUser = currentUserRes.data?.data || currentUserRes.data;
          if (currentUser && currentUser.email) {
            setCurrentAdminName(currentUser.email);
            console.log('Current admin email set:', currentUser.email);
          }
        } catch (err) {
          console.log('Error fetching current user:', err.message);
        }

        // Debug: Check report locations
        try {
          const debugRes = await axios.get(`${API_URL}/reports/debug/locations`, config);
          console.log('🔍 Debug - Report locations:', debugRes.data);
        } catch (debugErr) {
          console.log('Debug endpoint error:', debugErr.message);
        }

        const resReports = await axios.get(`${API_URL}/reports`, config);
        const reportData = Array.isArray(resReports.data)
          ? resReports.data
          : Array.isArray(resReports.data?.data)
            ? resReports.data.data
            : [];
        console.log('📊 Reports received:', reportData.length);
        console.log('📊 Admin location from token:', adminLocation);
        console.log('📊 User role:', userRole);
        if (reportData.length > 0) {
          console.log('📊 Sample report data:', reportData.slice(0, 3).map(r => ({ 
            firstName: r.firstName,
            middleName: r.middleName,
            lastName: r.lastName,
            name: r.name,
            contact: r.contact,
            userLocation: r.userLocation,
            location: r.location 
          })));
        }
        setReports(reportData);
        console.log('Reports fetched successfully:', reportData.length);

        try {
          const resUsers = await axios.get(`${API_URL}/users`, config);
          
          // Handle the response structure based on the backend controller
          let usersArray = [];
          if (resUsers.data && resUsers.data.success && Array.isArray(resUsers.data.data)) {
            usersArray = resUsers.data.data;
          } else if (Array.isArray(resUsers.data)) {
            usersArray = resUsers.data;
          }
          
          console.log('Users fetched successfully:', usersArray.length);
          
          // Format user data
          const formattedUsers = usersArray.map(user => {
            // Extract name fields safely
            const firstName = (user.firstName || '').toString().trim();
            const lastName = (user.lastName || '').toString().trim();
            const middleInitial = (user.middleInitial || '').toString().trim();
            
            // Build full name with multiple strategies
            let fullName = '';
            
            if (firstName && lastName) {
              fullName = `${firstName}${middleInitial ? ' ' + middleInitial + '.' : ''} ${lastName}`;
            } else if (firstName) {
              fullName = firstName;
            } else if (lastName) {
              fullName = lastName;
            } else if (user.name) {
              fullName = user.name.toString().trim();
            } else {
              // Last resort: use email prefix
              const emailPrefix = user.email ? user.email.split('@')[0] : '';
              fullName = emailPrefix || `User ${user.id || user._id || 'Unknown'}`;
            }
            
            return {
              ...user,
              fullName: fullName.trim()
            };
          });
          
          setUsers(formattedUsers);
        } catch (userError) {
          console.error('Error fetching users:', userError);
          setUsers([]); // Set empty array on error
        }

      } catch (err) {
        console.error('Fetch error details:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error message:', err.message);
        
        let errorMessage = 'Failed to fetch data.';
        if (err.response?.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          auth.clearAuth();
          navigate('/login');
        } else if (err.response) {
          // Server responded with error
          errorMessage = `Server error: ${err.response.data?.message || err.response.data?.msg || err.response.statusText}`;
        } else if (err.request) {
          // Request made but no response
          errorMessage = 'Cannot connect to server. The backend may be sleeping (Render free tier). Please wait a moment and refresh.';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Migration function to populate userLocation for existing reports
  const runLocationMigration = async () => {
    try {
      const token = await auth.getToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const response = await axios.post(`${API_URL}/reports/migrate/fix-locations`, {}, config);
      
      console.log('Migration result:', response.data);
      alert(`Migration completed!\nUpdated: ${response.data.updated}\nFailed: ${response.data.failed}\nTotal: ${response.data.total}`);
      
      // Refresh data after migration
      window.location.reload();
    } catch (err) {
      console.error('Migration error:', err);
      alert('Migration failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleStatusChange = async (reportId, newStatus) => {
    const report = reports.find(r => r._id === reportId);
    const reporterName = report?.firstName || report?.lastName 
      ? `${report.firstName || ''} ${report.middleName || ''} ${report.lastName || ''}`.trim()
      : report?.name || 'Unknown';
    
    // If changing to Resolved, use the photo upload modal instead
    if (newStatus === 'Resolved') {
      // Reset photo states first
      setResolutionPhoto(null);
      setResolutionPhotoPreview(null);
      resolutionPhotoRef.current = null;
      
      // Store the reportId for later use
      const targetReportId = reportId;
      
      setConfirmModal({
        show: true,
        title: 'Mark as Resolved',
        message: 'resolution_photo_upload',
        confirmText: 'Mark as Resolved',
        cancelText: 'Cancel',
        type: 'success',
        reportId: targetReportId,
        onConfirm: async () => {
          // Get the current photo from ref at confirmation time
          const currentPhoto = resolutionPhotoRef.current;
          console.log('🔍 Current resolution photo at confirmation:', currentPhoto);
          
          await markReportAsResolved(targetReportId, currentPhoto);
          setConfirmModal({ show: false, title: '', message: '', confirmText: '', cancelText: '', type: '', onConfirm: null });
          setResolutionPhoto(null);
          setResolutionPhotoPreview(null);
          resolutionPhotoRef.current = null;
        }
      });
      return;
    }
    
    setConfirmModal({
      show: true,
      title: 'Change Report Status',
      message: `Are you sure you want to change the status of ${reporterName}'s report to "${newStatus}"?`,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      type: 'neutral',
      onConfirm: async () => {
        const previousReports = [...reports];
        setReports(prev =>
          prev.map(r => (r._id === reportId ? { ...r, status: newStatus } : r))
        );

        try {
          const token = await auth.getToken();
          if (!token) throw new Error('No auth token found');
          const config = { headers: { Authorization: `Bearer ${token}` } };
          const response = await axios.put(`${API_URL}/reports/${reportId}/status`, { status: newStatus }, config);
          console.log('Status update successful:', response.data);
          setSuccessAlert({ show: true, message: 'Report status updated successfully!', type: 'success' });
        } catch (err) {
          console.error('Status update error:', err.response?.data || err.message);
          setSuccessAlert({ show: true, message: `Failed to update report status: ${err.response?.data?.error || err.message}`, type: 'error' });
          setReports(previousReports);
        }
      }
    });
  };

  const handleLogout = () => {
    setConfirmModal({
      show: true,
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          const token = await auth.getToken();
          if (token) {
            // Call logout endpoint to record logout time
            await axios.post(`${API_URL}/auth/logout`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        } catch (error) {
          console.error('Error recording logout:', error);
          // Continue with logout even if API call fails
        } finally {
          auth.clearAuth(); // This will remove both token and role
          navigate('/login');
        }
      }
    });
  };

  const archivedReports = reports.filter(r => r.status === 'Resolved');
  const activeReports = reports.filter(r => r.status !== 'Resolved');

  // Chart data preparation
  const getStatusChartData = () => {
    const resolved = reports.filter(r => r.status === 'Resolved').length;
    const ongoing = reports.filter(r => r.status === 'On Going').length;
    const pending = reports.filter(r => !r.status || r.status === 'Pending').length;

    return {
      labels: ['Resolved', 'On Going', 'Pending'],
      datasets: [
        {
          data: [resolved, ongoing, pending],
          backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
          borderColor: ['#fff', '#fff', '#fff'],
          borderWidth: 2,
        }
      ]
    };
  };

  const getDailyReportsChartData = () => {
    // Get last 7 days of report counts
    const days = [];
    const counts = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push(dateStr);
      
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const count = reports.filter(r => {
        if (!r.createdAt) return false;
        const reportDate = new Date(r.createdAt);
        return reportDate >= d && reportDate < nextDay;
      }).length;
      
      counts.push(count);
    }

    return {
      labels: days,
      datasets: [
        {
          label: 'Reports',
          data: counts,
          fill: true,
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          borderColor: '#1976d2',
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#1976d2',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }
      ]
    };
  };

  // Filter and sort users based on search term and admin location
  const filteredUsers = users.filter(user => {
    // Filter by location for regular admins (not superadmin)
    if (userRole === 'admin' && adminLocation) {
      if (user.location !== adminLocation) {
        return false;
      }
    }
    
    // Filter by search term
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    return fullName.includes(searchLower) || 
           (user.email || '').toLowerCase().includes(searchLower) ||
           (user.contactNumber || '').includes(searchTerm);
  }).sort((a, b) => {
    // If no filter selected, return original order
    if (!userSortBy) return 0;
    
    // Calculate report counts for each user
    const aReportsCount = reports.filter(r => 
      r.user && (r.user._id === a.id || r.user._id === a._id || r.user.id === a.id)
    ).length;
    const bReportsCount = reports.filter(r => 
      r.user && (r.user._id === b.id || r.user._id === b._id || r.user.id === b.id)
    ).length;
    
    // Get points for each user
    const aPoints = a.points || 0;
    const bPoints = b.points || 0;
    
    if (userSortBy === 'reportsHigh') {
      return bReportsCount - aReportsCount; // High to low
    } else if (userSortBy === 'reportsLow') {
      return aReportsCount - bReportsCount; // Low to high
    } else if (userSortBy === 'pointsHigh') {
      return bPoints - aPoints; // High to low
    } else if (userSortBy === 'pointsLow') {
      return aPoints - bPoints; // Low to high
    }
    return 0;
  });

  // Pagination for users
  const totalUsers = filteredUsers.length;
  const totalUserPages = Math.ceil(totalUsers / usersPerPage);
  const startUserIndex = (userPage - 1) * usersPerPage;
  const endUserIndex = startUserIndex + usersPerPage;
  const paginatedUsers = filteredUsers.slice(startUserIndex, endUserIndex);

  // Filter and sort reports based on search term, location, and date
  const getFilteredAndSortedReports = (reportsArray) => {
    let filtered = reportsArray.filter(report => {
      // Filter by location for superadmin
      if (locationFilter && userRole === 'superadmin') {
        if (report.userLocation !== locationFilter) {
          return false;
        }
      }
      
      // Filter by search term
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      
      // Create full name from individual fields
      const fullName = `${report.firstName || ''} ${report.middleName || ''} ${report.lastName || ''}`.trim().toLowerCase();
      const legacyName = (report.name || '').toLowerCase();
      
      return fullName.includes(searchLower) ||
             legacyName.includes(searchLower) ||
             (report.description || '').toLowerCase().includes(searchLower) ||
             (report.location || '').toLowerCase().includes(searchLower) ||
             (report.landmark || '').toLowerCase().includes(searchLower) ||
             (report.contact || '').includes(searchTerm);
    });

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  const filteredActiveReports = getFilteredAndSortedReports(activeReports);
  const filteredArchivedReports = getFilteredAndSortedReports(archivedReports);

  // Pagination logic
  const getCurrentPageReports = (reportsArray) => {
    const startIndex = (currentPage - 1) * reportsPerPage;
    const endIndex = startIndex + reportsPerPage;
    return reportsArray.slice(startIndex, endIndex);
  };

  const getCurrentReportsArray = () => {
    return showArchive ? filteredArchivedReports : filteredActiveReports;
  };

  const currentReports = getCurrentPageReports(getCurrentReportsArray());
  const totalReports = getCurrentReportsArray().length;
  const totalPages = Math.ceil(totalReports / reportsPerPage);

  // Reset to page 1 when switching between active/archive or changing search
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedReport(null); // Close modal when changing views
  }, [showArchive, showActiveReports, searchTerm, sortBy]);

  // Reset user page when search or sort changes
  React.useEffect(() => {
    setUserPage(1);
  }, [searchTerm, userSortBy, showUsers]);

  const openReportModal = (report) => {
    setSelectedReport(report);
  };

  const closeReportModal = () => {
    setSelectedReport(null);
  };

  // Mark report as resolved (with optional resolution photo)
  const markReportAsResolved = async (reportId, resolutionPhoto = null) => {
    try {
      const token = await auth.getToken();
      if (!token) {
        setSuccessAlert({ show: true, message: 'Authentication required. Please login again.', type: 'error' });
        return;
      }

      const formData = new FormData();
      formData.append('status', 'Resolved');
      if (resolutionPhoto) {
        formData.append('resolutionPhoto', resolutionPhoto);
        console.log('📷 Uploading resolution photo:', resolutionPhoto.name, resolutionPhoto.size, 'bytes');
      } else {
        console.log('⚠️ No resolution photo provided');
      }

      const config = { 
        headers: { 
          Authorization: `Bearer ${token}`
          // Don't set Content-Type - let axios set it automatically with boundary
        } 
      };
      
      const response = await axios.put(`${API_URL}/reports/${reportId}`, formData, config);

      // Use the updated report from the server response
      const updatedReport = response.data;
      console.log('✅ Report marked as resolved:', updatedReport);

      // Update the report in the local state with the server response
      setReports(prevReports => 
        prevReports.map(report => 
          report._id === reportId ? updatedReport : report
        )
      );

      // Update selected report if it's the same one
      if (selectedReport && selectedReport._id === reportId) {
        setSelectedReport(updatedReport);
      }

      setSuccessAlert({ 
        show: true, 
        message: 'Report marked as resolved! Email sent to user for confirmation.', 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error marking report as resolved:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to mark report as resolved';
      setSuccessAlert({ show: true, message: errorMessage, type: 'error' });
    }
  };

  // Admin Management Functions
  const fetchAdmins = async () => {
    try {
      const token = await auth.getToken();
      console.log('Fetching admins with token:', token ? 'Token exists' : 'No token');
      console.log('API URL:', API_URL);
      
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/auth/admins`, config);
      console.log('Admin fetch response:', response.data);
      
      setAdmins(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      console.error('Error response:', error.response);
      
      // If endpoint doesn't exist (404), show a message
      if (error.response && error.response.status === 404) {
        console.log('Admin management endpoints not available on server');
      }
      
      setAdmins([]); // Set empty array on error
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (newAdminData.password !== newAdminData.confirmPassword) {
      setSuccessAlert({ show: true, message: 'Passwords do not match', type: 'error' });
      return;
    }

    try {
      const token = await auth.getToken();
      if (!token) {
        setSuccessAlert({ show: true, message: 'Authentication required. Please login again.', type: 'error' });
        return;
      }
      
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(`${API_URL}/auth/register-admin`, {
        email: newAdminData.email,
        password: newAdminData.password,
        role: 'admin', // Set role as 'admin'
        location: newAdminData.location, // Add location
        firstName: 'Admin', // Default values since backend expects them
        lastName: 'User',
        contactNumber: '00000000000' // Default contact number
      }, config);

      setSuccessAlert({ show: true, message: 'Admin added successfully!', type: 'success' });
      setNewAdminData({ email: '', password: '', confirmPassword: '', location: '' });
      setShowAddAdminModal(false);
      fetchAdmins();
    } catch (error) {
      console.error('Add admin error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to add admin';
      setSuccessAlert({ show: true, message: errorMessage, type: 'error' });
    }
  };

  const handleDeactivateAdmin = async (adminId) => {
    const admin = admins.find(a => (a.id || a._id) === adminId);
    const adminEmail = admin?.email || 'this admin';
    const isActive = admin?.isActive !== false; // Default to active if not specified
    const action = isActive ? 'deactivate' : 'reactivate';
    const actionCapitalized = action.charAt(0).toUpperCase() + action.slice(1);
    
    setConfirmModal({
      show: true,
      title: `${actionCapitalized} Admin`,
      message: `Are you sure you want to ${action} ${adminEmail}?`,
      confirmText: actionCapitalized,
      cancelText: 'Cancel',
      type: isActive ? 'warning' : 'success', // warning for deactivate, success for reactivate
      onConfirm: async () => {
        try {
          const token = await auth.getToken();
          if (!token) {
            setSuccessAlert({ show: true, message: 'Authentication required. Please login again.', type: 'error' });
            return;
          }
          
          const config = { headers: { Authorization: `Bearer ${token}` } };
          await axios.put(`${API_URL}/auth/admin/${adminId}`, { 
            isActive: !isActive 
          }, config);
          
          setSuccessAlert({ 
            show: true, 
            message: `Admin ${action}d successfully!`, 
            type: 'success' 
          });
          
          // Update the admins state to reflect the change
          setAdmins(prevAdmins => 
            prevAdmins.map(a => 
              (a.id || a._id) === adminId 
                ? { ...a, isActive: !isActive }
                : a
            )
          );
        } catch (error) {
          console.error(`${actionCapitalized} admin error:`, error);
          const errorMessage = error.response?.data?.error || error.response?.data?.message || `Failed to ${action} admin`;
          setSuccessAlert({ show: true, message: errorMessage, type: 'error' });
        }
      }
    });
  };

  const handleDeactivateUser = async (userId) => {
    const user = users.find(u => (u.id || u._id) === userId);
    const userName = user?.fullName || user?.email || 'this user';
    const isActive = user?.isActive !== false; // Default to active if not specified
    const action = isActive ? 'deactivate' : 'reactivate';
    const actionCapitalized = action.charAt(0).toUpperCase() + action.slice(1);
    
    // Show custom confirmation modal
    setConfirmModal({
      show: true,
      title: `${actionCapitalized} User`,
      message: `Are you sure you want to ${action} ${userName}?`,
      confirmText: actionCapitalized,
      cancelText: 'Cancel',
      type: isActive ? 'warning' : 'success', // warning for deactivate, success for reactivate
      onConfirm: async () => {
        try {
          const token = await auth.getToken();
          if (!token) {
            setSuccessAlert({ show: true, message: 'Authentication required. Please login again.', type: 'error' });
            return;
          }
          
          const config = { headers: { Authorization: `Bearer ${token}` } };
          
          // Use the existing updateUser endpoint instead of non-existent status endpoint
          const response = await axios.put(`${API_URL}/users/${userId}`, { 
            isActive: !isActive 
          }, config);
          
          // Show success alert
          setSuccessAlert({ 
            show: true, 
            message: `User ${action}d successfully!`, 
            type: 'success' 
          });
          
          // Update the users state to reflect the change
          setUsers(prevUsers => 
            prevUsers.map(u => 
              (u.id || u._id) === userId 
                ? { ...u, isActive: !isActive }
                : u
            )
          );
        } catch (error) {
          console.error(`${actionCapitalized} user error:`, error);
          
          // Check if it's a 404 or backend doesn't support this feature
          if (error.response?.status === 404) {
            setSuccessAlert({ 
              show: true, 
              message: 'User deactivation feature is not yet implemented on the backend server. Please update the backend to support user status updates.', 
              type: 'error' 
            });
          } else {
            const errorMessage = error.response?.data?.error || error.response?.data?.message || `Failed to ${action} user`;
            setSuccessAlert({ show: true, message: errorMessage, type: 'error' });
          }
        }
      }
    });
  };

  // Fetch admins when admin management is shown and user is superadmin
  React.useEffect(() => {
    if (showAdminManagement && (userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'SUPERADMIN')) {
      fetchAdmins();
    }
  }, [showAdminManagement, userRole]);

  // Fetch login logs when login logs view is shown and user is superadmin
  React.useEffect(() => {
    if (showLoginLogs && (userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'SUPERADMIN')) {
      fetchLoginLogs();
    }
  }, [showLoginLogs, userRole]);

  // Reset login logs page when search term changes
  React.useEffect(() => {
    if (showLoginLogs) {
      setLoginLogsPage(1);
    }
  }, [searchTerm, showLoginLogs]);

  // Fetch login logs function
  const fetchLoginLogs = async () => {
    setLoginLogsLoading(true);
    try {
      const token = await auth.getToken();
      if (!token) {
        alert('Authentication required. Please login again.');
        setLoginLogsLoading(false);
        return;
      }
      
      const config = { headers: { Authorization: `Bearer ${token}` } };
      console.log('Fetching login logs from:', `${API_URL}/auth/login-logs`);
      
      const response = await axios.get(`${API_URL}/auth/login-logs?limit=100`, config);
      console.log('Login logs response:', response.data);
      
      if (response.data && response.data.success) {
        const logsData = response.data.data || [];
        console.log('Login logs data:', logsData);
        console.log('Number of logs:', logsData.length);
        setLoginLogs(logsData);
      } else {
        console.log('No success flag in response');
        setLoginLogs([]);
      }
    } catch (error) {
      console.error('Error fetching login logs:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response && error.response.status === 404) {
        console.log('Login logs endpoint not available on server');
        alert('Login logs feature requires the backend to be updated and restarted.');
      } else if (error.response && error.response.status === 403) {
        alert('Access denied. Only superadmin can view login logs.');
      } else {
        alert('Failed to fetch login logs: ' + (error.response?.data?.error || error.message));
      }
      setLoginLogs([]);
    } finally {
      setLoginLogsLoading(false);
    }
  };

  const openImageModal = (imgUrl) => setModalImage(imgUrl);
  const closeImageModal = () => setModalImage(null);

  if (loading) return <div className="container mt-5">Loading...</div>;
  if (error) return <div className="container mt-5 text-danger">{error}</div>;

  return (
    <div className="dashboard-layout">
      {/* Image Zoom Modal */}
      {modalImage && (
        <div
          className="modal fade show"
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.95)',
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1050,
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          tabIndex={-1}
          onClick={closeImageModal}
        >
          <div
            style={{ 
              position: 'relative',
              maxWidth: '90vw', 
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={modalImage}
              alt="Zoomed Report"
              style={{ 
                maxWidth: '90vw', 
                maxHeight: '85vh', 
                borderRadius: '8px', 
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                objectFit: 'contain',
                cursor: 'default'
              }}
            />
            <button 
              className="btn btn-secondary mt-3" 
              onClick={closeImageModal}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '10px',
                background: '#6c757d',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#5a6268';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#6c757d';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Navigation Drawer */}
      <div className={`navigation-drawer ${isDrawerCollapsed ? 'collapsed' : ''}`}>
        <div className="nav-header">
          {!isDrawerCollapsed && (
            <div className="nav-branding">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="nav-logo">🌿</span>
                <span>EcoCheck</span>
              </div>
              {currentAdminName && (
                <div style={{
                  fontSize: '12px',
                  marginTop: '4px',
                  opacity: 0.8,
                  fontWeight: '400',
                  color: '#d0d0d0',
                  wordBreak: 'break-word'
                }}>
                  {currentAdminName}
                </div>
              )}
            </div>
          )}
          <button 
            className="drawer-toggle-btn"
            onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
          >
            <i className="toggle-icon">{isDrawerCollapsed ? '☰' : '×'}</i>
          </button>
        </div>
        
        <div className="nav-list">
          <div 
            className={`nav-item ${!showUsers && !showArchive && !showActiveReports && !showAdminManagement && !showLoginLogs ? 'active' : ''}`}
            onClick={() => {
              setShowUsers(false);
              setShowArchive(false);
              setShowActiveReports(false);
              setShowAdminManagement(false);
              setShowLoginLogs(false);
            }}
          >
            <span className="nav-icon-emoji">{isDrawerCollapsed ? '📊' : '📊'}</span>
            {!isDrawerCollapsed && <span>DASHBOARD</span>}
          </div>
          <div 
            className={`nav-item ${showActiveReports ? 'active' : ''}`}
            onClick={() => {
              setShowActiveReports(!showActiveReports);
              setShowUsers(false);
              setShowArchive(false);
              setShowAdminManagement(false);
              setShowLoginLogs(false);
            }}
          >
            <span className="nav-icon-emoji">{isDrawerCollapsed ? '📋' : '📋'}</span>
            {!isDrawerCollapsed && <span>ACTIVE REPORTS</span>}
          </div>
          <div 
            className={`nav-item ${showArchive ? 'active' : ''}`}
            onClick={() => {
              setShowArchive(!showArchive);
              setShowUsers(false);
              setShowActiveReports(false);
              setShowAdminManagement(false);
              setShowLoginLogs(false);
            }}
          >
            <span className="nav-icon-emoji">{isDrawerCollapsed ? '📦' : '📦'}</span>
            {!isDrawerCollapsed && <span>ARCHIVE</span>}
          </div>
          <div 
            className={`nav-item ${showUsers ? 'active' : ''}`}
            onClick={() => {
              setShowUsers(!showUsers);
              setShowArchive(false);
              setShowActiveReports(false);
              setShowAdminManagement(false);
              setShowLoginLogs(false);
            }}
          >
            <span className="nav-icon-emoji">{isDrawerCollapsed ? '👥' : '👥'}</span>
            {!isDrawerCollapsed && <span>REGISTERED USERS</span>}
          </div>
          {(userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'SUPERADMIN') && (
            <div 
              className={`nav-item ${showAdminManagement ? 'active' : ''}`}
              onClick={() => {
                setShowAdminManagement(!showAdminManagement);
                setShowUsers(false);
                setShowArchive(false);
                setShowActiveReports(false);
                setShowLoginLogs(false);
              }}
            >
              <span className="nav-icon-emoji">{isDrawerCollapsed ? '🔐' : '🔐'}</span>
              {!isDrawerCollapsed && <span>ADMIN MANAGEMENT</span>}
            </div>
          )}
          {(userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'SUPERADMIN') && (
            <div 
              className={`nav-item ${showLoginLogs ? 'active' : ''}`}
              onClick={() => {
                setShowLoginLogs(!showLoginLogs);
                setShowUsers(false);
                setShowArchive(false);
                setShowActiveReports(false);
                setShowAdminManagement(false);
              }}
            >
              <span className="nav-icon-emoji">{isDrawerCollapsed ? '📝' : '📝'}</span>
              {!isDrawerCollapsed && <span>LOGIN LOGS</span>}
            </div>
          )}
        </div>
        
        <div className="nav-footer">
          {!isDrawerCollapsed && (
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${isDrawerCollapsed ? 'drawer-collapsed' : ''}`}>
        <div className="dashboard-card">
          {/* Card Header with Search */}
          <div className="card-header">
            <div className="header-left">
              <div>
                <span className="header-title">
                  {showUsers ? 'REGISTERED USERS' : 
                   showArchive ? 'REPORT ARCHIVE' : 
                   showActiveReports ? 'ACTIVE REPORTS' :
                   showAdminManagement ? 'ADMIN MANAGEMENT' : 
                   showLoginLogs ? 'LOGIN LOGS' : 
                   'DASHBOARD'}
                </span>
                <div className="header-subtitle">
                  {showUsers ? `View and manage registered user accounts` : 
                   showArchive ? `View resolved and archived reports` : 
                   showActiveReports ? `View all pending and ongoing reports` :
                   showAdminManagement ? 'Manage administrator accounts' : 
                   showLoginLogs ? 'View login and logout history' : 
                   `Overview and analytics`}
                </div>
              </div>
            </div>
            
            {(showUsers || showActiveReports || showArchive || showAdminManagement || showLoginLogs) && (
              <div className="search-container">
                {showUsers && (
                  <select
                    className="sort-select"
                    value={userSortBy}
                    onChange={(e) => setUserSortBy(e.target.value)}
                    style={{ marginRight: '12px' }}
                  >
                    <option value="">Filter</option>
                    <option value="reportsHigh">Reports: High to Low</option>
                    <option value="reportsLow">Reports: Low to High</option>
                    <option value="pointsHigh">Points: High to Low</option>
                    <option value="pointsLow">Points: Low to High</option>
                  </select>
                )}
                {(showActiveReports || showArchive) && !showUsers && !showAdminManagement && !showLoginLogs && (
                  <>
                    {/* Location Filter - Superadmin Only */}
                    {(userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'SUPERADMIN') && (
                      <select
                        className="sort-select"
                        value={locationFilter}
                        onChange={(e) => {
                          setLocationFilter(e.target.value);
                          setCurrentPage(1); // Reset to first page when filtering
                        }}
                        style={{ marginRight: '12px' }}
                      >
                        <option value="">All Locations</option>
                        <option value="Bulaon">Bulaon</option>
                        <option value="Del Carmen">Del Carmen</option>
                      </select>
                    )}
                    {/* Sort Dropdown */}
                    <select
                      className="sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{ marginRight: '12px' }}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </>
                )}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <i className="search-icon"></i>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="card-divider"></div>

          {/* Content Body */}
          <div className="card-content">
            {/* Dashboard Stats & Charts - Only show on main dashboard view */}
            {!showUsers && !showActiveReports && !showArchive && !showAdminManagement && !showLoginLogs && (
              <div className="dashboard-stats-section">
                <div className="stats-grid">
                  {/* Total Reports Card */}
                  <div className="stat-card stat-card-primary">
                    <div className="stat-icon">📊</div>
                    <div className="stat-details">
                      <div className="stat-label">Total Reports</div>
                      <div className="stat-value">{reports.length}</div>
                      <div className="stat-change">
                        Active: {activeReports.length} • Archived: {archivedReports.length}
                      </div>
                    </div>
                  </div>

                  {/* Active Reports Card */}
                  <div className="stat-card stat-card-warning">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-details">
                      <div className="stat-label">Active Reports</div>
                      <div className="stat-value">{activeReports.length}</div>
                      <div className="stat-change">
                        Pending & ongoing
                      </div>
                    </div>
                  </div>

                  {/* Resolved Reports Card */}
                  <div className="stat-card stat-card-success">
                    <div className="stat-icon">✓</div>
                    <div className="stat-details">
                      <div className="stat-label">Resolved</div>
                      <div className="stat-value">{archivedReports.length}</div>
                      <div className="stat-change">
                        {reports.length > 0 ? Math.round((archivedReports.length / reports.length) * 100) : 0}% completion rate
                      </div>
                    </div>
                  </div>

                  {/* Total Users Card */}
                  <div className="stat-card stat-card-info">
                    <div className="stat-icon">👥</div>
                    <div className="stat-details">
                      <div className="stat-label">Total Users</div>
                      <div className="stat-value">{users.length}</div>
                      <div className="stat-change">
                        Registered accounts
                      </div>
                    </div>
                  </div>

                  {/* High Report Area Card */}
                  <div className="stat-card stat-card-danger">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-details">
                      <div className="stat-label">High Report Area</div>
                      <div className="stat-value" style={{ fontSize: '20px', lineHeight: '1.3' }}>
                        {(() => {
                          if (reports.length === 0) return 'No data';
                          const locationCounts = {};
                          reports.forEach(r => {
                            const loc = r.location;
                            if (loc && loc.trim() !== '') {
                              // Extract city/municipality from address
                              let cleanLocation = loc;
                              if (loc.includes(',')) {
                                // Try to find "Del Carmen" or "Bulaon" or other city names
                                const parts = loc.split(',').map(p => p.trim());
                                const cityPart = parts.find(p => 
                                  p.toLowerCase().includes('del carmen') || 
                                  p.toLowerCase().includes('bulaon') ||
                                  p.toLowerCase().includes('san fernando')
                                );
                                cleanLocation = cityPart || parts[parts.length - 2] || parts[0];
                              }
                              locationCounts[cleanLocation] = (locationCounts[cleanLocation] || 0) + 1;
                            }
                          });
                          console.log('🗺️ Location counts:', locationCounts);
                          if (Object.keys(locationCounts).length === 0) return 'No data';
                          const topLocation = Object.entries(locationCounts)
                            .sort((a, b) => b[1] - a[1])[0];
                          console.log('🎯 Top location:', topLocation);
                          return topLocation ? topLocation[0] : 'No data';
                        })()}
                      </div>
                      <div className="stat-change">
                        {(() => {
                          if (reports.length === 0) return '0 reports';
                          const locationCounts = {};
                          reports.forEach(r => {
                            const loc = r.location;
                            if (loc && loc.trim() !== '') {
                              // Extract city/municipality from address
                              let cleanLocation = loc;
                              if (loc.includes(',')) {
                                const parts = loc.split(',').map(p => p.trim());
                                const cityPart = parts.find(p => 
                                  p.toLowerCase().includes('del carmen') || 
                                  p.toLowerCase().includes('bulaon') ||
                                  p.toLowerCase().includes('san fernando')
                                );
                                cleanLocation = cityPart || parts[parts.length - 2] || parts[0];
                              }
                              locationCounts[cleanLocation] = (locationCounts[cleanLocation] || 0) + 1;
                            }
                          });
                          if (Object.keys(locationCounts).length === 0) return '0 reports';
                          const topLocation = Object.entries(locationCounts)
                            .sort((a, b) => b[1] - a[1])[0];
                          return topLocation ? `${topLocation[1]} reports` : '0 reports';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="charts-grid">
                  {/* Status Distribution Chart */}
                  <div className="chart-card">
                    <div className="chart-header">
                      <h3 className="chart-title">Status Distribution</h3>
                      <p className="chart-subtitle">Report breakdown by status</p>
                    </div>
                    <div className="chart-container">
                      <Doughnut 
                        data={getStatusChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                padding: 15,
                                font: {
                                  size: 12,
                                  family: "'Roboto', sans-serif"
                                }
                              }
                            },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              padding: 12,
                              titleFont: {
                                size: 14
                              },
                              bodyFont: {
                                size: 13
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  </div>

                  {/* Daily Reports Trend Chart */}
                  <div className="chart-card chart-card-wide">
                    <div className="chart-header">
                      <h3 className="chart-title">Reports Trend (Last 7 Days)</h3>
                      <p className="chart-subtitle">Daily report submission activity</p>
                    </div>
                    <div className="chart-container">
                      <Line 
                        data={getDailyReportsChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              padding: 12,
                              titleFont: {
                                size: 14
                              },
                              bodyFont: {
                                size: 13
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                                font: {
                                  size: 11
                                }
                              },
                              grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                              }
                            },
                            x: {
                              ticks: {
                                font: {
                                  size: 11
                                }
                              },
                              grid: {
                                display: false
                              }
                            }
                          }
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showUsers ? (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Contact Number</th>
                      <th className="text-center">Points</th>
                      <th className="text-center">Reports</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="no-data">
                          {searchTerm ? 'No users found matching your search.' : 'No users found.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map(user => {
                        const userReportsCount = reports.filter(r => 
                          r.user && (r.user._id === user.id || r.user._id === user._id || r.user.id === user.id)
                        ).length;
                        
                        // Determine display name with multiple fallbacks
                        let displayName = 'Unknown User';
                        if (user.fullName && user.fullName.trim() !== '' && user.fullName !== 'No Name Available') {
                          displayName = user.fullName;
                        } else if (user.firstName || user.lastName) {
                          const first = user.firstName || '';
                          const last = user.lastName || '';
                          const middle = user.middleInitial ? ` ${user.middleInitial}.` : '';
                          displayName = `${first}${middle} ${last}`.trim() || 'Unnamed User';
                        } else if (user.name) {
                          displayName = user.name;
                        } else if (user.email) {
                          // Use email prefix as fallback
                          displayName = user.email.split('@')[0] + ' (from email)';
                        }
                        
                        const isActive = user.isActive !== false; // Default to active if not specified
                        const userId = user.id || user._id;
                        
                        return (
                          <tr key={userId} style={{ opacity: isActive ? 1 : 0.6 }}>
                            <td>{displayName}</td>
                            <td>{user.email || 'N/A'}</td>
                            <td>{user.contactNumber || 'N/A'}</td>
                            <td className="text-center">
                              <span className={`status-chip ${user.points > 0 ? 'success' : 'default'}`}>
                                {user.points || 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`status-chip ${userReportsCount > 0 ? 'info' : 'default'}`}>
                                {userReportsCount}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`status-chip ${isActive ? 'success' : 'danger'}`}>
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="text-center">
                              <button 
                                className={`btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}`}
                                onClick={() => handleDeactivateUser(userId)}
                                title={`${isActive ? 'Deactivate' : 'Reactivate'} User`}
                                style={{ minWidth: '90px' }}
                              >
                                {isActive ? 'Deactivate' : 'Reactivate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                
                {/* Pagination Controls for Users */}
                {totalUserPages > 1 && (
                  <div className="pagination-container">
                    <div className="pagination-info">
                      Showing {startUserIndex + 1} to {Math.min(endUserIndex, totalUsers)} of {totalUsers} users
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="pagination-btn"
                        onClick={() => setUserPage(prev => Math.max(prev - 1, 1))}
                        disabled={userPage === 1}
                      >
                        Previous
                      </button>
                      
                      {[...Array(totalUserPages)].map((_, index) => {
                        const pageNum = index + 1;
                        
                        // Show first 3 pages, last 3 pages, or current page with 1 page on each side
                        const showPage = 
                          pageNum <= 3 || // First 3 pages
                          pageNum > totalUserPages - 3 || // Last 3 pages
                          Math.abs(pageNum - userPage) <= 1; // Current page and neighbors
                        
                        if (showPage) {
                          return (
                            <button
                              key={pageNum}
                              className={`pagination-btn ${pageNum === userPage ? 'active' : ''}`}
                              onClick={() => setUserPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === 4 && userPage > 5) {
                          return <span key={pageNum} className="pagination-ellipsis">...</span>;
                        } else if (pageNum === totalUserPages - 3 && userPage < totalUserPages - 4) {
                          return <span key={pageNum} className="pagination-ellipsis">...</span>;
                        }
                        return null;
                      })}
                      
                      <button
                        className="pagination-btn"
                        onClick={() => setUserPage(prev => Math.min(prev + 1, totalUserPages))}
                        disabled={userPage === totalUserPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : showLoginLogs && (userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'SUPERADMIN') ? (
              <div className="login-logs-section">
                <div className="login-logs-header">
                  <h3>Admin Login History</h3>
                  <button 
                    className="btn btn-primary"
                    onClick={fetchLoginLogs}
                    disabled={loginLogsLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {loginLogsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                
                {loginLogsLoading ? (
                  <div className="text-center" style={{ padding: '40px' }}>
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="data-table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Login Time</th>
                            <th>Logout Time</th>
                            <th>IP Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!Array.isArray(loginLogs) || loginLogs.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="no-data">
                                {searchTerm ? 'No login logs found matching your search.' : 'No login logs found.'}
                              </td>
                            </tr>
                          ) : (
                            (() => {
                              // Filter login logs based on search term
                              const filteredLogs = loginLogs.filter(log => {
                                if (!searchTerm) return true;
                                const searchLower = searchTerm.toLowerCase();
                                return (
                                  (log.email || '').toLowerCase().includes(searchLower) ||
                                  (log.role || '').toLowerCase().includes(searchLower) ||
                                  (log.ipAddress || '').toLowerCase().includes(searchLower) ||
                                  (log.loginTime ? new Date(log.loginTime).toLocaleString().toLowerCase().includes(searchLower) : false) ||
                                  (log.logoutTime ? new Date(log.logoutTime).toLocaleString().toLowerCase().includes(searchLower) : false)
                                );
                              });
                              
                              const startIndex = (loginLogsPage - 1) * logsPerPage;
                              const endIndex = startIndex + logsPerPage;
                              const currentLogs = filteredLogs.slice(startIndex, endIndex);
                              
                              if (filteredLogs.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan="5" className="no-data">
                                      No login logs found matching your search.
                                    </td>
                                  </tr>
                                );
                              }
                              
                              return currentLogs.map((log, index) => (
                                <tr key={log._id || index}>
                                  <td>{log.email || 'N/A'}</td>
                                  <td>
                                    <span className={`status-chip ${log.role === 'superadmin' ? 'danger' : 'warning'}`}>
                                      {log.role ? log.role.toUpperCase() : 'N/A'}
                                    </span>
                                  </td>
                                  <td>{log.loginTime ? new Date(log.loginTime).toLocaleString() : 'N/A'}</td>
                                  <td>{log.logoutTime ? new Date(log.logoutTime).toLocaleString() : 'Active Session'}</td>
                                  <td style={{ fontSize: '0.85em', color: '#666' }}>{log.ipAddress || 'Unknown'}</td>
                                </tr>
                              ));
                            })()
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination for Login Logs */}
                    {(() => {
                      const filteredLogs = loginLogs.filter(log => {
                        if (!searchTerm) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return (
                          (log.email || '').toLowerCase().includes(searchLower) ||
                          (log.role || '').toLowerCase().includes(searchLower) ||
                          (log.ipAddress || '').toLowerCase().includes(searchLower) ||
                          (log.loginTime ? new Date(log.loginTime).toLocaleString().toLowerCase().includes(searchLower) : false) ||
                          (log.logoutTime ? new Date(log.logoutTime).toLocaleString().toLowerCase().includes(searchLower) : false)
                        );
                      });
                      
                      return filteredLogs.length > logsPerPage && (
                        <div className="pagination-container">
                          <div className="pagination-info">
                            Showing {((loginLogsPage - 1) * logsPerPage) + 1} to {Math.min(loginLogsPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                          </div>
                          <div className="pagination-controls">
                            <button
                              className="pagination-btn"
                              onClick={() => setLoginLogsPage(prev => Math.max(prev - 1, 1))}
                              disabled={loginLogsPage === 1}
                            >
                              Previous
                            </button>
                            
                            {[...Array(Math.ceil(filteredLogs.length / logsPerPage))].map((_, index) => {
                              const pageNum = index + 1;
                              const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
                              
                              // Show first 3 pages, last 3 pages, or current page with 1 page on each side
                              const showPage = 
                                pageNum <= 3 || // First 3 pages
                                pageNum > totalPages - 3 || // Last 3 pages
                                Math.abs(pageNum - loginLogsPage) <= 1; // Current page and neighbors
                              
                              if (showPage) {
                                return (
                                  <button
                                    key={pageNum}
                                    className={`pagination-btn ${pageNum === loginLogsPage ? 'active' : ''}`}
                                    onClick={() => setLoginLogsPage(pageNum)}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              } else if (pageNum === 4 && loginLogsPage > 5) {
                                return <span key={pageNum} className="pagination-ellipsis">...</span>;
                              } else if (pageNum === totalPages - 3 && loginLogsPage < totalPages - 4) {
                                return <span key={pageNum} className="pagination-ellipsis">...</span>;
                              }
                              return null;
                            })}
                            
                            <button
                              className="pagination-btn"
                              onClick={() => setLoginLogsPage(prev => Math.min(prev + 1, Math.ceil(filteredLogs.length / logsPerPage)))}
                              disabled={loginLogsPage === Math.ceil(filteredLogs.length / logsPerPage)}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            ) : showAdminManagement && (userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'SUPERADMIN') ? (
              <div className="admin-management-section">
                <div className="admin-management-header">
                  <h3>Admin Management</h3>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowAddAdminModal(true)}
                  >
                    <i className="fas fa-plus"></i> Add New Admin
                  </button>
                </div>
                
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Location</th>
                        <th>Created Date</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!Array.isArray(admins) || admins.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="no-data">
                            No admins found.
                          </td>
                        </tr>
                      ) : (
                        admins.map(admin => {
                          const isActive = admin.isActive !== false; // Default to active if not specified
                          const adminId = admin.id || admin._id;
                          
                          return (
                            <tr key={adminId} style={{ opacity: isActive ? 1 : 0.6 }}>
                              <td>{admin.email}</td>
                              <td>{admin.location || 'N/A'}</td>
                              <td>{admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}</td>
                              <td className="text-center">
                                <span className={`status-chip ${isActive ? 'success' : 'danger'}`}>
                                  {isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="text-center">
                                <button 
                                  className={`btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}`}
                                  onClick={() => handleDeactivateAdmin(adminId)}
                                  title={`${isActive ? 'Deactivate' : 'Reactivate'} Admin`}
                                  style={{ minWidth: '90px' }}
                                >
                                  {isActive ? 'Deactivate' : 'Reactivate'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (showActiveReports || showArchive) ? (
              <div className="reports-section">
                {getCurrentReportsArray().length === 0 ? (
                  <div className="no-data">
                    {searchTerm 
                      ? `No ${showArchive ? 'archived' : 'active'} reports found matching your search.`
                      : `No ${showArchive ? 'archived' : 'active'} reports found.`
                    }
                  </div>
                ) : (
                  <>
                    <div className="reports-grid">
                      {currentReports.map((report, index) => {
                      const reportId = report._id;
                      
                      const userPoints = users.find(u => u.id === report.user?._id || u._id === report.user?._id)?.points || 0;
                      const imgSrc = report.photoUrl
                        ? (report.photoUrl.startsWith('http')
                          ? report.photoUrl
                          : `${API_URL.replace('/api', '')}${report.photoUrl}`)
                        : null;

                      return (
                        <div key={reportId} className="report-card-container">
                          <div className={`card dashboard-card h-100 ${showArchive ? 'archive-card' : 'active-card'}`}>
                            {imgSrc ? (
                              <div className="report-image-container">
                                <img
                                  src={imgSrc}
                                  className="report-image"
                                  alt="Report"
                                  onClick={() => openImageModal(imgSrc)}
                                />
                              </div>
                            ) : (
                              <div className="report-image-placeholder" />
                            )}

                            <div className="card-body d-flex flex-column">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h5 className="card-title dashboard-card-title">
                                  {/* Display individual name fields if available, fallback to name */}
                                  {report.firstName || report.lastName ? (
                                    `${report.firstName || ''} ${report.middleName || ''} ${report.lastName || ''}`.trim()
                                  ) : report.name || ''}
                                </h5>
                                <span className={`status-chip ${
                                  report.status === 'Resolved' ? 'success' : 
                                  report.status === 'Pending Confirmation' ? 'info' :
                                  report.status === 'On Going' ? 'warning' : 
                                  'danger'
                                }`}>
                                  {report.status || 'Pending'}
                                </span>
                              </div>
                              
                              {/* Show name on card */}
                              <p className="card-text dashboard-card-text">
                                <strong>Name:</strong> {
                                  report.firstName || report.lastName ? (
                                    `${report.firstName || ''} ${report.middleName || ''} ${report.lastName || ''}`.trim()
                                  ) : report.name ? report.name
                                  : report.user?.firstName || report.user?.lastName ? (
                                    `${report.user.firstName || ''} ${report.user.middleInitial ? report.user.middleInitial + '.' : ''} ${report.user.lastName || ''}`.trim()
                                  ) : 'N/A'
                                }
                              </p>
                              
                              {/* Show contact number on card - hide for resolved reports */}
                              {report.status !== 'Resolved' && (
                                <p className="card-text dashboard-card-text">
                                  <strong>Contact Number:</strong> {
                                    report.contact 
                                      ? (report.contact.startsWith('+63') 
                                          ? report.contact.replace('+63', '+63 ') 
                                          : report.contact)
                                      : report.user?.contactNumber
                                        ? (report.user.contactNumber.startsWith('0')
                                            ? '+63 ' + report.user.contactNumber.substring(1)
                                            : report.user.contactNumber)
                                        : 'N/A'
                                  }
                                </p>
                              )}
                              
                              {/* Show location on card */}
                              <p className="card-text dashboard-card-text">
                                <strong>Location:</strong> {report.location || 'N/A'}
                              </p>
                              
                              {/* Show privacy notice for resolved reports */}
                              {report.status === 'Resolved' && !report.contact && !report.description && (
                                <p className="card-text" style={{
                                  fontSize: '12px',
                                  color: '#666',
                                  fontStyle: 'italic',
                                  marginTop: '4px'
                                }}>
                                  <i className="fas fa-shield-alt" style={{ marginRight: '4px' }}></i>
                                  Personal info removed
                                </p>
                              )}
                              
                              {/* Read more button */}
                              <button 
                                className="read-more-btn"
                                onClick={() => openReportModal(report)}
                                type="button"
                              >
                                Read more
                              </button>

                              {!showArchive && (
                                <div className="mt-auto status-section">
                                  <label><strong>Status:</strong></label>
                                  <select
                                    className="form-select mt-1 dashboard-select"
                                    value={report.status || 'Pending'}
                                    onChange={(e) => handleStatusChange(reportId, e.target.value)}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="On Going">On Going</option>
                                    <option value="Resolved">Resolved</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="pagination-container">
                        <div className="pagination-info">
                          Showing {((currentPage - 1) * reportsPerPage) + 1} to {Math.min(currentPage * reportsPerPage, totalReports)} of {totalReports} reports
                        </div>
                        <div className="pagination-controls">
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </button>
                          
                          {[...Array(totalPages)].map((_, index) => {
                            const pageNum = index + 1;
                            
                            // Show first 3 pages, last 3 pages, or current page with 1 page on each side
                            const showPage = 
                              pageNum <= 3 || // First 3 pages
                              pageNum > totalPages - 3 || // Last 3 pages
                              Math.abs(pageNum - currentPage) <= 1; // Current page and neighbors
                            
                            if (showPage) {
                              return (
                                <button
                                  key={pageNum}
                                  className={`pagination-btn ${pageNum === currentPage ? 'active' : ''}`}
                                  onClick={() => setCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              );
                            } else if (pageNum === 4 && currentPage > 5) {
                              return <span key={pageNum} className="pagination-ellipsis">...</span>;
                            } else if (pageNum === totalPages - 3 && currentPage < totalPages - 4) {
                              return <span key={pageNum} className="pagination-ellipsis">...</span>;
                            }
                            return null;
                          })}
                          
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div
          className="modal fade show"
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.6)',
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1050,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          tabIndex={-1}
          onClick={() => setShowAddAdminModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ 
              maxWidth: '520px', 
              width: '100%',
              margin: '0'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-content add-admin-modal">
              <div className="modal-header add-admin-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h5 className="modal-title" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'white' }}>ADD NEW ADMIN</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddAdminModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '0',
                    color: 'white',
                    opacity: 0.9,
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'all 0.15s ease',
                    lineHeight: '1'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.2)';
                    e.target.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.opacity = '0.9';
                  }}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleAddAdmin}>
                <div className="modal-body add-admin-body">
                  <div className="form-group-custom">
                    <label htmlFor="adminEmail" className="form-label-custom">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="form-control-custom"
                      id="adminEmail"
                      placeholder="admin@example.com"
                      value={newAdminData.email}
                      onChange={(e) => setNewAdminData({...newAdminData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group-custom">
                    <label htmlFor="adminLocation" className="form-label-custom">
                      Location
                    </label>
                    <select
                      className="form-control-custom"
                      id="adminLocation"
                      value={newAdminData.location}
                      onChange={(e) => setNewAdminData({...newAdminData, location: e.target.value})}
                      required
                      style={{
                        cursor: 'pointer',
                        backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '16px',
                        paddingRight: '40px',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none'
                      }}
                    >
                      <option value="">Select Location</option>
                      <option value="Bulaon">Bulaon</option>
                      <option value="Del Carmen">Del Carmen</option>
                    </select>
                  </div>
                  <div className="form-group-custom">
                    <label htmlFor="adminPassword" className="form-label-custom">
                      Password
                    </label>
                    <input
                      type="password"
                      className="form-control-custom"
                      id="adminPassword"
                      placeholder="Minimum 6 characters"
                      value={newAdminData.password}
                      onChange={(e) => setNewAdminData({...newAdminData, password: e.target.value})}
                      required
                      minLength="6"
                    />
                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Password must be at least 6 characters long
                    </small>
                  </div>
                  <div className="form-group-custom">
                    <label htmlFor="confirmPassword" className="form-label-custom">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      className="form-control-custom"
                      id="confirmPassword"
                      placeholder="Re-enter password"
                      value={newAdminData.confirmPassword}
                      onChange={(e) => setNewAdminData({...newAdminData, confirmPassword: e.target.value})}
                      required
                      minLength="6"
                    />
                  </div>
                </div>
                <div className="modal-footer add-admin-footer">
                  <button
                    type="button"
                    className="btn-cancel-custom"
                    onClick={() => setShowAddAdminModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit-custom"
                  >
                    Add Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div
          className="modal fade show"
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1050,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          tabIndex={-1}
          onClick={closeReportModal}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ 
              maxWidth: '700px', 
              width: '100%',
              maxHeight: '90vh',
              margin: '0'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-content" style={{ 
              height: 'auto',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div className="modal-header">
                <h5 className="modal-title" style={{ color: 'white' }}>
                  Report Details {selectedReport.status === 'Resolved' ? '(Archived)' : ''}{selectedReport.firstName || selectedReport.lastName || selectedReport.name ? ` - ${
                    selectedReport.firstName || selectedReport.lastName ? (
                      `${selectedReport.firstName || ''} ${selectedReport.middleName || ''} ${selectedReport.lastName || ''}`.trim()
                    ) : selectedReport.name
                  }` : ''}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeReportModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '0',
                    color: 'white'
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body" style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '28px'
              }}>
                {/* Report Image */}
                {selectedReport.photoUrl && (
                  <div className="mb-4 text-center">
                    <img
                      src={selectedReport.photoUrl.startsWith('http')
                        ? selectedReport.photoUrl
                        : `${API_URL.replace('/api', '')}${selectedReport.photoUrl}`}
                      alt="Report"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'contain',
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        border: '2px solid #f0f0f0'
                      }}
                    />
                  </div>
                )}

                {/* Report Details */}
                <div className="report-modal-details">
                  {selectedReport.status === 'Resolved' && (
                    <div className="alert alert-info mb-3" style={{
                      background: '#e3f2fd',
                      border: '1px solid #90caf9',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#0d47a1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="fas fa-shield-alt"></i>
                      <span>Personal information has been removed for privacy protection.</span>
                    </div>
                  )}
                  <div className="row g-3">
                    <div className="col-md-6">
                      {/* Show name */}
                      <p><strong>Name:</strong> {
                        selectedReport.firstName || selectedReport.lastName ? (
                          `${selectedReport.firstName || ''} ${selectedReport.middleName || ''} ${selectedReport.lastName || ''}`.trim()
                        ) : selectedReport.name ? selectedReport.name
                        : selectedReport.user?.firstName || selectedReport.user?.lastName ? (
                          `${selectedReport.user.firstName || ''} ${selectedReport.user.middleInitial ? selectedReport.user.middleInitial + '.' : ''} ${selectedReport.user.lastName || ''}`.trim()
                        ) : 'N/A'
                      }</p>
                      
                      {/* Only show contact if not resolved or if contact exists */}
                      {selectedReport.status !== 'Resolved' && (
                        <p><strong>Contact:</strong> {
                          selectedReport.contact 
                            ? (selectedReport.contact.startsWith('+63') 
                                ? selectedReport.contact.replace('+63', '+63 ') 
                                : selectedReport.contact)
                            : selectedReport.user?.contactNumber
                              ? (selectedReport.user.contactNumber.startsWith('0')
                                  ? '+63 ' + selectedReport.user.contactNumber.substring(1)
                                  : selectedReport.user.contactNumber)
                              : 'N/A'
                        }</p>
                      )}
                      <p><strong>Location:</strong> {selectedReport.location || 'N/A'}</p>
                      {selectedReport.landmark && (
                        <p><strong>Landmark:</strong> {selectedReport.landmark}</p>
                      )}
                    </div>
                    <div className="col-md-6">
                      <p><strong>Status:</strong> 
                        <span className={`status-chip ${
                          selectedReport.status === 'Resolved' ? 'success' : 
                          selectedReport.status === 'Pending Confirmation' ? 'info' :
                          selectedReport.status === 'On Going' ? 'warning' : 
                          'danger'
                        } ms-2`}>
                          {selectedReport.status || 'Pending'}
                        </span>
                      </p>
                      <p><strong>Reported on:</strong><br/>{selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Only show description if not resolved or if description exists */}
                  {selectedReport.status !== 'Resolved' && selectedReport.description && (
                    <div className="mt-3">
                      <p><strong>Description:</strong></p>
                      <div className="description-text">
                        {selectedReport.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer" style={{ 
                padding: '20px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #e0e0e0'
              }}>
                <div>
                  {selectedReport.status !== 'Resolved' && selectedReport.status !== 'Pending Confirmation' && (userRole === 'admin' || userRole === 'superadmin') && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => {
                        // Reset photo states
                        setResolutionPhoto(null);
                        setResolutionPhotoPreview(null);
                        
                        setConfirmModal({
                          show: true,
                          title: 'Mark as Pending Confirmation',
                          message: 'resolution_photo_upload',
                          confirmText: 'Send for Confirmation',
                          cancelText: 'Cancel',
                          type: 'success',
                          reportId: selectedReport._id,
                          onConfirm: async () => {
                            await markReportAsResolved(selectedReport._id, resolutionPhoto);
                            setConfirmModal({ show: false, title: '', message: '', confirmText: '', cancelText: '', type: '', onConfirm: null });
                            setResolutionPhoto(null);
                            setResolutionPhotoPreview(null);
                          }
                        });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '600'
                      }}
                    >
                      <i className="fas fa-check-circle"></i>
                      Mark as Resolved
                    </button>
                  )}
                  {selectedReport.status === 'Resolved' && (
                    <span className="text-success" style={{ fontWeight: '600', fontSize: '14px' }}>
                      <i className="fas fa-check-circle"></i> This report has been resolved
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeReportModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div
          className="modal fade show"
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.6)',
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1060,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          tabIndex={-1}
          onClick={() => setConfirmModal({ ...confirmModal, show: false })}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ 
              maxWidth: '500px', 
              width: '100%',
              margin: '0'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-content" style={{
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 15px 50px rgba(0,0,0,0.4)',
              animation: 'slideIn 0.25s ease-out'
            }}>
              <div className="modal-header" style={{
                background: confirmModal.type === 'success' 
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                  : confirmModal.type === 'warning'
                  ? 'linear-gradient(135deg, #ff9800 0%, #ff6f00 100%)'
                  : confirmModal.type === 'danger'
                  ? 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)'
                  : 'linear-gradient(135deg, #424242 0%, #2a2e31 100%)',
                color: 'white',
                borderBottom: 'none',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h5 className="modal-title" style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    margin: '0',
                    color: 'white'
                  }}>
                    {confirmModal.title}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '0',
                    color: 'white',
                    opacity: 0.8,
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'all 0.15s ease',
                    lineHeight: '1'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.25)';
                    e.target.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.opacity = '0.8';
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body" style={{
                padding: '32px 28px',
                fontSize: '16px',
                color: '#424242',
                lineHeight: '1.6',
                minHeight: '80px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                {confirmModal.message === 'resolution_photo_upload' ? (
                  <>
                    <p style={{ margin: 0, textAlign: 'center', fontWeight: '600' }}>
                      Upload a photo showing the resolution (optional but recommended):
                    </p>
                    <div style={{ width: '100%' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setResolutionPhoto(file);
                            setResolutionPhotoPreview(URL.createObjectURL(file));
                            resolutionPhotoRef.current = file; // Store in ref too
                            console.log('📸 Photo selected:', file.name, file.size, 'bytes');
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px dashed #28a745',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      />
                      {resolutionPhotoPreview && (
                        <div style={{ marginTop: '15px', textAlign: 'center' }}>
                          <img 
                            src={resolutionPhotoPreview} 
                            alt="Preview" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '200px', 
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }} 
                          />
                        </div>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#666', textAlign: 'center' }}>
                      This will mark the report as "Pending Confirmation". The user will receive an email and must confirm in the mobile app. Points will be awarded upon user confirmation.
                    </p>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', fontWeight: '600' }}>
                    {confirmModal.message}
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{
                background: '#f8f9fa',
                borderTop: '1px solid #e0e0e0',
                padding: '20px 28px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'center'
              }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '100px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#5a6268';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#6c757d';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {confirmModal.cancelText}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setConfirmModal({ ...confirmModal, show: false });
                    if (confirmModal.onConfirm) {
                      confirmModal.onConfirm();
                    }
                  }}
                  style={{
                    background: confirmModal.type === 'success' 
                      ? '#28a745' 
                      : confirmModal.type === 'warning'
                      ? '#ff9800'
                      : confirmModal.type === 'danger'
                      ? '#6c757d'
                      : '#424242',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '120px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = confirmModal.type === 'success' 
                      ? '#218838' 
                      : confirmModal.type === 'warning'
                      ? '#f57c00'
                      : confirmModal.type === 'danger'
                      ? '#5a6268'
                      : '#2a2e31';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = confirmModal.type === 'success' 
                      ? '0 4px 12px rgba(40, 167, 69, 0.4)' 
                      : confirmModal.type === 'warning'
                      ? '0 4px 12px rgba(255, 152, 0, 0.4)'
                      : confirmModal.type === 'danger'
                      ? '0 4px 12px rgba(108, 117, 125, 0.4)'
                      : '0 4px 12px rgba(66, 66, 66, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = confirmModal.type === 'success' 
                      ? '#28a745' 
                      : confirmModal.type === 'warning'
                      ? '#ff9800'
                      : confirmModal.type === 'danger'
                      ? '#6c757d'
                      : '#424242';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Success/Error Alert Modal */}
      {successAlert.show && (
        <div
          className="modal fade show"
          style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.6)',
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1070,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          tabIndex={-1}
          onClick={() => setSuccessAlert({ ...successAlert, show: false })}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ 
              maxWidth: '450px', 
              width: '100%',
              margin: '0'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-content" style={{
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 15px 50px rgba(0,0,0,0.4)',
              animation: 'slideIn 0.25s ease-out'
            }}>
              <div className="modal-header" style={{
                background: successAlert.type === 'success' 
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                  : 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                color: 'white',
                borderBottom: 'none',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'center' }}>
                  <h5 className="modal-title" style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    margin: '0',
                    color: 'white'
                  }}>
                    {successAlert.type === 'success' ? 'SUCCESS' : 'ERROR'}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSuccessAlert({ ...successAlert, show: false })}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '0',
                    color: 'white',
                    opacity: 0.8,
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'all 0.15s ease',
                    lineHeight: '1',
                    position: 'absolute',
                    right: '20px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.25)';
                    e.target.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.opacity = '0.8';
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body" style={{
                padding: '32px 28px',
                fontSize: '16px',
                color: '#424242',
                lineHeight: '1.6',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                {successAlert.message}
              </div>
              <div className="modal-footer" style={{
                background: '#f8f9fa',
                borderTop: '1px solid #e0e0e0',
                padding: '20px 28px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSuccessAlert({ ...successAlert, show: false })}
                  style={{
                    background: successAlert.type === 'success' ? '#28a745' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '10px 32px',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '120px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = successAlert.type === 'success' ? '#218838' : '#c82333';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = successAlert.type === 'success' 
                      ? '0 4px 12px rgba(40, 167, 69, 0.4)' 
                      : '0 4px 12px rgba(220, 53, 69, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = successAlert.type === 'success' ? '#28a745' : '#dc3545';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;