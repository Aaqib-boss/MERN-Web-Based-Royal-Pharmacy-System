import React, { useState, useEffect, useRef } from 'react';
import api, { BACKEND_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Camera, Trash2, Shield, UserPlus, Users, Loader2, X, Plus, Edit2, Phone, Mail, User, MapPin } from 'lucide-react';

const Profile = () => {
  const { user, updateProfilePhoto, deleteProfilePhoto, logout } = useAuth();
  const fileInputRef = useRef(null);

  // States
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Form states - Create User
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Editing state - Admin Panel User
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('User');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Delete User state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);

  // Self account delete state
  const [showDeleteSelfConfirm, setShowDeleteSelfConfirm] = useState(false);

  useEffect(() => {
    if (user && user.role === 'Admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    setAdminLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsersList(data);
    } catch (error) {
      toast.error('Failed to load user directories');
    } finally {
      setAdminLoading(false);
    }
  };

  // Avatar Upload / Remove handlers
  const handlePhotoUploadChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setLoading(true);
    try {
      await updateProfilePhoto(file);
      toast.success('Profile photo updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setLoading(false);
      e.target.value = null; // Clear file input
    }
  };

  const handleRemovePhoto = async () => {
    setLoading(true);
    try {
      await deleteProfilePhoto();
      toast.success('Profile photo deleted');
    } catch (error) {
      toast.error('Failed to remove image');
    } finally {
      setLoading(false);
    }
  };

  // Create User submit (Admin only)
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password || !phone || !address) {
      toast.warning('Please fill in all fields');
      return;
    }

    if (phone.length !== 10) {
      toast.error('Contact phone must be exactly 10 digits');
      return;
    }

    if (password.length !== 6) {
      toast.error('Password must be exactly 6 characters');
      return;
    }

    setAdminLoading(true);
    try {
      const { data } = await api.post('/auth/create-user', {
        name,
        email,
        password,
        role,
        phone,
        address,
      });
      toast.success(`User Account "${data.name}" created!`);
      // Refetch
      fetchUsers();
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setAddress('');
      setRole('User');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating user account');
    } finally {
      setAdminLoading(false);
    }
  };

  // Edit User modal trigger
  const handleOpenEditUserModal = (targetUser) => {
    setEditUserTarget(targetUser);
    setEditName(targetUser.name);
    setEditEmail(targetUser.email);
    setEditRole(targetUser.role);
    setEditPhone(targetUser.phone || '');
    setEditAddress(targetUser.address || '');
    setShowEditModal(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editName || !editEmail || !editPhone || !editAddress) {
      toast.warning('Fields cannot be empty');
      return;
    }

    if (editPhone.length !== 10) {
      toast.error('Contact phone must be exactly 10 digits');
      return;
    }

    // Wait! Do we have a PUT /api/auth/users/:id endpoint?
    // Let's create an endpoint in backend if we edit. In the auth controller, we didn't specify edit user, but we can write a simple endpoint or just delete and recreate.
    // Wait, the prompt says "Admin can create, view, edit, delete users". Yes! We should add support for updating user details.
    // Let's see: we can put a PUT `/api/auth/users/:id` route in backend. Let's make sure we write/update authController to support it. I will write the update route in backend later.
    // For now, let's call `PUT /api/auth/users/${editUserTarget._id}` in the frontend.
    setAdminLoading(true);
    try {
      await api.put(`/auth/users/${editUserTarget._id}`, {
        name: editName,
        email: editEmail,
        role: editRole,
        phone: editPhone,
        address: editAddress,
      });
      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setAdminLoading(false);
    }
  };

  // Delete user trigger
  const handleOpenDeleteUserConfirm = (targetUser) => {
    setDeleteUserTarget(targetUser);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUserSubmit = async () => {
    if (!deleteUserTarget) return;

    setAdminLoading(true);
    try {
      await api.delete(`/auth/users/${deleteUserTarget._id}`);
      toast.success('User account removed');
      setShowDeleteConfirm(false);
      setDeleteUserTarget(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setAdminLoading(false);
    }
  };

  // Self account delete handler
  const handleDeleteSelfSubmit = async () => {
    setLoading(true);
    try {
      await api.delete('/auth/profile');
      toast.success('Your account and all associated data have been permanently deleted.');
      logout();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoading(false);
      setShowDeleteSelfConfirm(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat text-slate-800 dark:text-slate-100 transition-colors duration-300 pb-16 relative"
      style={{ backgroundImage: "url('/dashboard_bg.png')" }}
    >
      <div className="absolute inset-0 bg-lightBg/96 dark:bg-darkBg/96 backdrop-blur-[1px] z-0"></div>
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary-emerald bg-clip-text text-transparent">
            My Account & Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 font-medium">
            Manage profile photo details and system user accounts permissions
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Card Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel rounded-3xl p-6 flex flex-col items-center card-hover">
              {/* Photo Upload Section */}
              <div className="relative group mb-6">
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white dark:border-darkBg bg-slate-100 dark:bg-darkBg-input shadow-lg relative flex items-center justify-center">
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : user?.profilePhoto ? (
                    <img
                      src={user.profilePhoto.startsWith('data:') ? user.profilePhoto : `${BACKEND_URL}${user.profilePhoto}`}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-extrabold text-primary dark:text-primary-emerald">
                      {user?.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Upload Trigger overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="absolute bottom-2 right-2 p-2 bg-primary text-white rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                  title="Upload profile photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUploadChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Remove Photo Trigger */}
              {user?.profilePhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs text-red-500 hover:underline font-semibold flex items-center mb-6"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Remove Profile Photo
                </button>
              )}

              {/* Account Details */}
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user?.name}</h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary dark:text-primary-emerald border border-primary/10 dark:border-white/5 mt-1.5 mb-6">
                {user?.role}
              </span>

              <div className="w-full space-y-4 pt-6 border-t border-slate-100 dark:border-emerald-950/10 text-sm">
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
                  <Mail className="w-4.5 h-4.5 text-slate-400" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
                  <Phone className="w-4.5 h-4.5 text-slate-400" />
                  <span>{user?.phone || 'No phone number'}</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4.5 h-4.5 text-slate-400" />
                  <span>{user?.address || 'No address'}</span>
                </div>
                
                <div className="pt-4 border-t border-slate-100 dark:border-emerald-950/10 mt-4 w-full">
                  <button
                    type="button"
                    onClick={() => setShowDeleteSelfConfirm(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-650/10 hover:bg-red-650/25 border border-red-500/20 text-red-500 font-bold rounded-xl shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete My Account</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Admin User Management Panel Column */}
          {user?.role === 'Admin' && (
            <div className="lg:col-span-3 space-y-6">
              {/* Add User panel */}
              <div className="glass-panel rounded-3xl p-6 card-hover">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                  <UserPlus className="w-5 h-5 mr-2 text-primary" />
                  <span>Register New User Account</span>
                </h3>

                <form onSubmit={handleCreateUserSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. jdoe@royal.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Temporary Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Exactly 6 characters"
                      maxLength={6}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="0774563201"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Address
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 123 Wellness Ave, NY"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      Access Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-sm"
                    >
                      <option value="User">User / Staff</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex items-end pt-2 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={adminLoading}
                      className="w-full flex items-center justify-center py-2.5 bg-gradient-to-r from-primary to-primary-emerald text-white rounded-xl font-bold shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-50 text-sm"
                    >
                      {adminLoading ? (
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4.5 h-4.5 mr-2" />
                          <span>Create Account</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Users Ledger Table */}
              <div className="glass-panel rounded-3xl overflow-hidden shadow-xl w-full">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                    <Users className="w-5 h-5 mr-2 text-primary" />
                    <span>Registered User Accounts</span>
                  </h3>
                </div>

                {adminLoading && usersList.length === 0 ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
) : (
                  <div className="overflow-x-auto">
                    <table className="w-full max-w-5xl mx-auto text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-primary/10 dark:bg-primary-emerald/10 text-primary dark:text-primary-emerald text-xs font-extrabold uppercase tracking-wider border-b border-primary/20 dark:border-primary-emerald/20">
                          <th className="px-6 py-4 w-[50%]">User Details</th>
                          <th className="px-6 py-4 w-[20%]">Phone</th>
                          <th className="px-6 py-4 w-[18%]">Role</th>
                          <th className="px-6 py-4 text-right w-[12%]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {usersList.map((usr) => (
                          <tr key={usr._id} className="hover:bg-slate-500/5 dark:hover:bg-white/5 transition-colors duration-150">
                            <td className="px-6 py-4 flex items-center space-x-3">
                              {usr.profilePhoto ? (
                                <img
                                  src={usr.profilePhoto.startsWith('data:') ? usr.profilePhoto : `${BACKEND_URL}${usr.profilePhoto}`}
                                  alt={usr.name}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-primary dark:text-primary-emerald font-bold">
                                  {usr.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200">{usr.name}</div>
                                <div className="text-slate-400 text-xs">{usr.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                              {usr.phone}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  usr.role === 'Admin'
                                    ? 'bg-amber-50 dark:bg-amber-950/30 text-accent border border-amber-100 dark:border-amber-950/20'
                                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-primary dark:text-primary-emerald border border-emerald-100 dark:border-emerald-950/20'
                                }`}
                              >
                                {usr.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => handleOpenEditUserModal(usr)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-darkBg-input transition-colors"
                                title="Edit Role/Phone"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteUserConfirm(usr)}
                                disabled={usr._id === user._id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                                title={usr._id === user._id ? "You cannot delete yourself" : "Delete user"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal (Admin only) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
              Edit User Settings
            </h3>

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Contact Phone
                </label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0774563201"
                  maxLength={10}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Address
                </label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Access Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={editUserTarget?._id === user._id}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-sm disabled:opacity-50"
                >
                  <option value="User">User / Staff</option>
                  <option value="Admin">Admin</option>
                </select>
                {editUserTarget?._id === user._id && (
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    You cannot change your own admin status.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-emerald-950/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-darkBg-input transition-colors duration-150 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-emerald text-white rounded-xl font-bold shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-50 text-sm"
                >
                  {adminLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200">
            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              Are you sure?
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You are about to permanently delete account{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {deleteUserTarget?.name} ({deleteUserTarget?.email})
              </span>
              . This user will lose system access.
            </p>

            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-darkBg-input transition-colors duration-150 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUserSubmit}
                disabled={adminLoading}
                className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all duration-150 disabled:opacity-50 text-sm"
              >
                {adminLoading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Self Account Confirmation Modal */}
      {showDeleteSelfConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200">
            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              Delete Your Account?
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You are about to permanently delete your account{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {user?.name} ({user?.email})
              </span>
              . This will erase all your master data, cash entries, cheques, and returns logs. This action cannot be undone.
            </p>

            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteSelfConfirm(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-darkBg-input transition-colors duration-150 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSelfSubmit}
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2.5 bg-red-650 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all duration-150 disabled:opacity-50 text-sm"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                <span>Confirm Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
