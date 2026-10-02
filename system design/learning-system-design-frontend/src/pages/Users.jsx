import { useState, useEffect } from 'react';
import { usersAPI } from '../api/users';
import UserModal from '../components/UserModal';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersAPI.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      await usersAPI.deleteUser(userId);
      alert('User deactivated successfully');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.error || 'Failed to deactivate user');
    }
  };

  const handleModalClose = (shouldReload) => {
    setShowModal(false);
    setSelectedUser(null);
    if (shouldReload) {
      loadUsers();
    }
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      ADMIN: 'role-admin',
      SALES: 'role-sales',
      PRODUCTION: 'role-production',
      ACCOUNTANT: 'role-accountant',
    };
    return classes[role] || '';
  };

  const filteredUsers = users.filter((user) => {
    if (filterRole !== 'ALL' && user.role !== filterRole) return false;
    if (filterStatus === 'ACTIVE' && !user.isActive) return false;
    if (filterStatus === 'INACTIVE' && user.isActive) return false;
    return true;
  });

  return (
    <div className="users-page">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <h1>User Management</h1>
          <div className="sub">Manage team members and permissions</div>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          + Add User
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Role:</label>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="SALES">Sales</option>
            <option value="PRODUCTION">Production</option>
            <option value="ACCOUNTANT">Accountant</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="filter-stats">
          {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="content">
        {loading ? (
          <div className="loading-state">Loading users...</div>
        ) : (
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="user-name">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="email">{user.email}</td>
                      <td>
                        <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="phone">{user.phone || '-'}</td>
                      <td>
                        <span className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="date">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Never'}
                      </td>
                      <td className="actions">
                        <button className="btn-icon" onClick={() => handleEdit(user)} title="Edit">
                          ✎
                        </button>
                        {user.isActive && (
                          <button
                            className="btn-icon btn-danger"
                            onClick={() => handleDelete(user.id)}
                            title="Deactivate"
                          >
                            ⊗
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showModal && (
        <UserModal user={selectedUser} onClose={handleModalClose} />
      )}
    </div>
  );
};

export default Users;
