import React, { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext";

const EmployeeTaskbar = ({ 
  onSearch, 
  employeeName: initialEmployeeName = "Employee",
  notifications = 0,
  onProfileClick,
  onLogoutClick,
  onPersonalDetailsClick,
  onHomeScreenClick
}) => {
  const { user, isAuthenticated } = useApp ? useApp() : { user: null, isAuthenticated: false };
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [employeeName, setEmployeeName] = useState(initialEmployeeName);
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeId, setEmployeeId] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", variant: "success" });
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    Department: "",
    accountType: "",
    position: ""
  });
  const [originalProfile, setOriginalProfile] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !user || isEditing) return;

    const derivedName = (() => {
      const first = user.first_name || user.firstName || null;
      const last = user.last_name || user.lastName || null;
      if (first || last) return `${first || ""} ${last || ""}`.trim();
      return user.name || initialEmployeeName;
    })();

    setEmployeeName(derivedName);

    const parts = derivedName.split(/\s+/).filter(Boolean);
    const first = user.first_name || user.firstName || parts[0] || "";
    const last = user.last_name || user.lastName || (parts.length > 1 ? parts.slice(-1)[0] : "");

    const updated = {
      firstName: first,
      lastName: last,
      email: user.email || "",
      accountType: user.role?.name || "employee",
      Department: user.department || user.Department || "",
      position: user.position || "",
      phoneNumber: formData.phoneNumber || "",
    };
    setFormData(prev => ({ ...prev, ...updated }));
    setOriginalProfile(prev => prev || updated);
  }, [isAuthenticated, user, isEditing, initialEmployeeName]);

  // Load detailed employee profile from backend to reflect accurate info
  useEffect(() => {
    let cancelled = false;
    const loadEmployee = async () => {
      try {
        if (isEditing) return; // don't override while editing
        const authRes = await fetch('/check-auth', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'same-origin'
        });
        const authData = await authRes.json();
        if (!authData?.authenticated || !authData.user) return;

        let employee = null;
        // 1) Linked employee id
        if (authData.user.linked_employee_id) {
          try {
            const empRes = await fetch(`/api/employees/${authData.user.linked_employee_id}`);
            const empData = await empRes.json();
            if (empData?.success && empData.data) employee = empData.data;
          } catch (_) {}
        }
        // 2) Fallback: search list and match by id/email/name
        if (!employee) {
          try {
            const listRes = await fetch('/api/employees');
            const listJson = await listRes.json();
            const list = listJson?.success ? listJson.data : listJson;
            if (Array.isArray(list)) {
              if (authData.user.linked_employee_id) {
                employee = list.find(e => e.id === authData.user.linked_employee_id) || employee;
              }
              if (!employee && authData.user.employee_id) {
                employee = list.find(e => e.employee_id === authData.user.employee_id) || employee;
              }
              if (!employee && authData.user.email) {
                employee = list.find(e => (e.email || '').toLowerCase() === authData.user.email.toLowerCase()) || employee;
              }
              if (!employee && authData.user.name) {
                const parts = String(authData.user.name).trim().split(/\s+/);
                const f = parts[0] || '';
                const l = parts.length > 1 ? parts.slice(-1)[0] : '';
                employee = list.find(e => (e.first_name || '').toLowerCase() === f.toLowerCase() && (e.last_name || '').toLowerCase() === l.toLowerCase()) || employee;
              }
            }
          } catch (_) {}
        }

        if (cancelled) return;
        if (employee) {
          try { setEmployeeId(employee.id || authData.user.linked_employee_id || null); } catch (_) {}
          const first = employee.first_name || user?.first_name || user?.firstName || '';
          const last = employee.last_name || user?.last_name || user?.lastName || '';
          const full = `${first} ${last}`.trim() || employee.name || user?.name || initialEmployeeName;
          setEmployeeName(full);
          const profile = {
            firstName: first || '',
            lastName: last || '',
            email: employee.email || user?.email || '',
            phoneNumber: employee.phone || employee.contact || '',
            Department: employee.department || employee.Department || '',
            position: employee.position || employee.job_title || user?.position || '',
            accountType: user?.role?.name || 'employee',
          };
          setFormData(prev => ({ ...prev, ...profile }));
          setOriginalProfile(profile);
          // Try to derive existing profile photo url if provided by API/user
          const photo = employee.photo_url || employee.avatar_url || employee.profile_photo_url || user?.avatar_url || user?.profile_photo_url || "";
          if (photo) setProfileImageUrl(photo);
        }
      } catch (_) {
        // ignore and keep existing UI defaults
      }
    };
    loadEmployee();
    return () => { cancelled = true; };
  }, [isAuthenticated, user, isEditing, initialEmployeeName]);

  // When opening the modal, ensure form has the latest loaded profile
  useEffect(() => {
    if (showProfileModal && originalProfile) {
      setFormData(prev => ({ ...prev, ...originalProfile }));
    }
  }, [showProfileModal, originalProfile]);

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleMenuItemClick = (action) => {
    setShowProfileMenu(false);
    
    switch(action) {
      case 'personalDetails':
        setShowProfileModal(true);
        onPersonalDetailsClick?.();
        break;
      case 'profile':
        // Backward-compat: treat as open modal in edit mode
        setShowProfileModal(true);
        setIsEditing(true);
        onProfileClick?.();
        break;
      case 'profile_edit':
        setShowProfileModal(true);
        setIsEditing(true);
        onProfileClick?.();
        break;
      case 'logout':
        onLogoutClick?.();
        break;
      case 'homescreen':
        onHomeScreenClick?.();
        break;
      default:
        break;
    }
  };

  const handleEdit = () => {
    // Snapshot current values for cancel
    setOriginalProfile({ ...formData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (originalProfile) {
      setFormData(prev => ({ ...prev, ...originalProfile }));
      setEmployeeName(`${originalProfile.firstName} ${originalProfile.lastName}`.trim() || employeeName);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    // Update the displayed name in the header
    setEmployeeName(`${formData.firstName} ${formData.lastName}`);
    console.log("Saved data:", formData);
    // After save, update snapshot so future cancel doesn't jump back further
    setOriginalProfile({ ...formData });
    try { showSuccess('Profile updated successfully'); } catch (_) {}
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n.charAt(0).toUpperCase()).join('');
  };

  const getModalInitials = () => {
    return `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase();
  };

  const showSuccess = (message) => {
    setToast({ show: true, message, variant: 'success' });
    setTimeout(() => setToast({ show: false, message: '', variant: 'success' }), 2000);
  };

  const modalFileInputRef = React.useRef(null);

  const handleModalAvatarClick = () => {
    if (modalFileInputRef.current) modalFileInputRef.current.click();
  };

  const uploadProfilePhoto = async (file) => {
    if (!file) return false;
    try {
      setUploadingPhoto(true);
      const form = new FormData();
      form.append('photo', file);
      // Attempt employee-specific endpoint first if we have an id
      let res = null;
      if (employeeId) {
        try {
          res = await fetch(`/api/employees/${employeeId}/photo`, { method: 'POST', body: form });
        } catch (_) { res = null; }
      }
      if (!res || !res.ok) {
        // Fallback to a generic profile photo endpoint
        try {
          res = await fetch('/api/profile/photo', { method: 'POST', body: form });
        } catch (_) { res = null; }
      }
      if (res && res.ok) {
        let data = null; try { data = await res.json(); } catch (_) {}
        const url = data?.url || data?.photo_url || data?.path || profileImageUrl;
        // Update UI immediately
        const localUrl = url || URL.createObjectURL(file);
        setProfileImageUrl(localUrl);
        showSuccess('Profile photo updated');
        return true;
      } else {
        // Still show local preview if upload failed silently
        const localUrl = URL.createObjectURL(file);
        setProfileImageUrl(localUrl);
        showSuccess('Profile photo updated locally');
        return false;
      }
    } catch (_) {
      try {
        const localUrl = URL.createObjectURL(file);
        setProfileImageUrl(localUrl);
      } catch (_) {}
      return false;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    await uploadProfilePhoto(file);
  };

  const performGlobalSearch = async (q) => {
    const query = String(q || '').trim();
    if (!query) {
      window.dispatchEvent(new CustomEvent('employee-search-results', { detail: { query, equipment: [], requests: [], transactions: [], history: [] } }));
      return;
    }

    const safeJson = async (res) => {
      try { return await res.json(); } catch (_) { return null; }
    };
    const includesQ = (s) => (String(s || '').toLowerCase().includes(query.toLowerCase()));
    const matchAny = (obj, keys) => keys.some(k => includesQ(obj?.[k]));

    try {
      const [reqPendingRes, reqDeniedRes, trxApprovedRes, trxHistoryRes] = await Promise.all([
        fetch('/api/requests?status=pending'),
        fetch('/api/requests?status=denied'),
        fetch('/api/transactions/approved'),
        fetch('/api/transactions/history')
      ]);

      const [reqPendingJson, reqDeniedJson, trxApprovedJson, trxHistoryJson] = await Promise.all([
        safeJson(reqPendingRes),
        safeJson(reqDeniedRes),
        safeJson(trxApprovedRes),
        safeJson(trxHistoryRes)
      ]);

      const reqPending = Array.isArray(reqPendingJson?.data) ? reqPendingJson.data : (Array.isArray(reqPendingJson) ? reqPendingJson : []);
      const reqDenied = Array.isArray(reqDeniedJson?.data) ? reqDeniedJson.data : (Array.isArray(reqDeniedJson) ? reqDeniedJson : []);
      const trxApproved = Array.isArray(trxApprovedJson?.data) ? trxApprovedJson.data : (Array.isArray(trxApprovedJson) ? trxApprovedJson : []);
      const trxHistory = Array.isArray(trxHistoryJson?.data) ? trxHistoryJson.data : (Array.isArray(trxHistoryJson) ? trxHistoryJson : []);

      const requestsAll = [...reqPending, ...reqDenied].filter(r =>
        matchAny(r, ['equipment_name', 'item', 'items', 'brand', 'model', 'description', 'request_number', 'status'])
      );
      const requests = requestsAll.filter(r => matchAny(r, ['equipment_name', 'item', 'items', 'brand', 'model', 'description', 'request_number', 'status']));

      const transactions = trxApproved.filter(t => matchAny(t, ['equipment_name', 'description', 'status', 'request_number']));
      const history = trxHistory.filter(h => matchAny(h, ['item', 'message', 'status', 'equipment_name', 'request_number']));

      const detail = { query, equipment: [], requests, transactions, history };
      window.dispatchEvent(new CustomEvent('employee-search-results', { detail }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('employee-search-error', { detail: { query, error: String(e && e.message ? e.message : e) } }));
    }
  };

  return (
    <>
      <header className="flex items-center justify-end px-10 py-6">
        <div className="flex items-center space-x-4">
          

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={handleProfileClick}
              className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {employeeName}
              </span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  getInitials(employeeName)
                )}
              </div>
            </button>
            {/* No header upload input; uploads are handled in the modal while editing */}

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                {/* Profile Header */}
                <div className="px-4 py-5 border-b border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl font-semibold flex-shrink-0 overflow-hidden">
                      {profileImageUrl ? (
                        <img src={profileImageUrl} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(employeeName)
                      )}
                    </div>
                    {/* Hidden modal input exists below in the Profile Card where editing happens */}
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-gray-900 truncate">{employeeName}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{formData.accountType ? (formData.accountType.charAt(0).toUpperCase()+formData.accountType.slice(1)) : 'Employee'}</div>
                      <button 
                        onClick={() => handleMenuItemClick('personalDetails')}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center mt-2 font-medium"
                      >
                        Personal Details
                        <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={() => handleMenuItemClick('profile_edit')}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                  <button
                    onClick={() => handleMenuItemClick('homescreen')}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Add to Home Screen
                  </button>
                </div>

                {/* Logout Button */}
                <div className="border-t border-gray-200">
                  <button
                    onClick={() => handleMenuItemClick('logout')}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Click outside to close menu */}
        {showProfileMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowProfileMenu(false)}
          />
        )}
      </header>

      {/* Profile Details Modal (Side Panel) */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl animate-slide-in pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Profile Details</h2>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setIsEditing(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile Card */}
            <div className="p-6">
              <div className="bg-blue-600 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div onClick={isEditing ? handleModalAvatarClick : undefined} title={isEditing ? "Change photo" : ""} className={`w-24 h-24 bg-blue-500 bg-opacity-50 rounded-2xl flex items-center justify-center text-white text-3xl font-semibold overflow-hidden ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                      {profileImageUrl ? (
                        <img src={profileImageUrl} alt="profile" className="w-full h-full object-cover" />
                      ) : (
                        getModalInitials()
                      )}
                    </div>
                    <input ref={modalFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                    <div className="text-white">
                      <h3 className="text-2xl font-semibold">{formData.firstName} {formData.lastName}</h3>
                      <p className="text-blue-100 text-sm mt-1">{formData.accountType}</p>
                      <p className="text-blue-100 text-sm">{formData.Department}</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={handleEdit}
                      className="flex items-center space-x-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span className="text-white">Edit</span>
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={handleCancel}
                      className="flex items-center space-x-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors"
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span className="text-white">Cancel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>

                {/* First Name and Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-base text-gray-900 font-medium">{formData.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-base text-gray-900 font-medium">{formData.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <p className="text-base text-gray-900 font-medium">{formData.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleChange('phoneNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <p className="text-base text-gray-900 font-medium">{formData.phoneNumber || '-'}</p>
                    )}
                  </div>
                </div>

                {/* Department (not editable; shows Employee role) */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <p className="text-base text-gray-900 font-medium">{formData.accountType ? (formData.accountType.charAt(0).toUpperCase()+formData.accountType.slice(1)) : 'Employee'}</p>
                  </div>
                </div>

                {/* Position (view mode only) */}
                {!isEditing && formData.position && (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                      <p className="text-base text-gray-900 font-medium">{formData.position}</p>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.variant === 'success' ? 'bg-green-600' : 'bg-gray-800'}`}>
          {toast.message}
        </div>
      )}
    </>
  );
};

export default EmployeeTaskbar;