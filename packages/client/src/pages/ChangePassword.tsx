import { useState } from 'react';
import { changePasswordApi } from '../api/auth';

export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Пароли не совпадают' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Пароль должен быть не менее 6 символов' });
      return;
    }

    setLoading(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Пароль успешно изменён' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Не удалось сменить пароль' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Смена пароля</h1>
      </div>

      <div className="card" style={{ maxWidth: 400 }}>
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {message && (
            <div className={message.type === 'success' ? 'success-msg' : 'error-msg'}>
              {message.text}
            </div>
          )}

          <label>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Текущий пароль</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>

          <label>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Новый пароль</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          <label>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Подтвердите новый пароль</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Сохранение...' : 'Сменить пароль'}
          </button>
        </form>
      </div>
    </div>
  );
}
