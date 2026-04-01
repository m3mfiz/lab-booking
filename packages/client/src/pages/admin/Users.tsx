import { useState } from 'react';
import { listUsersApi, createUserApi, deleteUserApi, type CreateUserData } from '../../api/admin';
import type { User } from '../../types';
import { useEffect } from 'react';

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [form, setForm] = useState<CreateUserData>({
    username: '',
    password: '',
    full_name: '',
    role: 'user',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listUsersApi());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await createUserApi(form);
      setForm({ username: '', password: '', full_name: '', role: 'user' });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось создать пользователя');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number, username: string) {
    if (!confirm(`Удалить пользователя "${username}"?`)) return;
    setDeleting(id);
    try {
      await deleteUserApi(id);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить пользователя');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Пользователи</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Отмена' : 'Добавить'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Новый пользователь</h3>
          <form onSubmit={handleCreateUser}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Имя пользователя</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Пароль</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Полное имя</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Роль</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'user' | 'admin' })}
                >
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
            </div>
            {formError && <div className="error-msg">{formError}</div>}
            <div style={{ marginTop: 12 }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="loading">Загрузка пользователей...</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Логин</th>
                <th>Полное имя</th>
                <th>Роль</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.full_name}</td>
                  <td>
                    <span className={`badge badge-${u.role}`}>{u.role === 'admin' ? 'админ' : 'пользователь'}</span>
                  </td>
                  <td>
                    <button
                      className="btn-danger"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      disabled={deleting === u.id}
                      onClick={() => handleDelete(u.id, u.username)}
                    >
                      {deleting === u.id ? 'Удаление...' : 'Удалить'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
