import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import { setCredentials } from '../stores/authSlice';
import './AuthPages.css';

interface ValidationResult {
  valid: boolean;
  message: string;
}

const validateLogin = (value: string): ValidationResult => {
  if (!value) return { valid: false, message: '请输入用户名或邮箱' };
  return { valid: true, message: '格式正确' };
};

const validatePassword = (value: string): ValidationResult => {
  if (!value) return { valid: false, message: '请输入密码' };
  return { valid: true, message: '已输入' };
};

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    if (!login || !password) {
      setError('请填写所有必填项');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      const data = await response.json();

      if (data.success) {
        dispatch(
          setCredentials({
            userId: data.data.userId,
            username: data.data.username,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            pubKeyHash: data.data.pubKeyHash,
            salt: data.data.salt,
          })
        );
        navigate('/chat');
      } else {
        setError(data.error?.message || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请检查服务器是否运行');
    } finally {
      setLoading(false);
    }
  }, [login, password, dispatch, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>SecureP2P Chat</h1>
          <p>登录您的账户</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <FormField
            label="登录名"
            name="login"
            value={login}
            onChange={setLogin}
            validate={validateLogin}
            placeholder="用户名或邮箱"
            autoComplete="username"
          />

          <FormField
            label="密码"
            name="password"
            type="password"
            value={password}
            onChange={setPassword}
            validate={validatePassword}
            placeholder="请输入密码"
            autoComplete="current-password"
          />

          {error && <div className="auth-error">{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            loading={loading}
            onClick={handleLogin}
          >
            登录
          </Button>
        </form>

        <div className="auth-footer">
          没有账户？<Link to="/register">注册</Link>
        </div>
      </div>
    </div>
  );
}