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

// Validation functions
const validateUsername = (value: string): ValidationResult => {
  if (!value) return { valid: false, message: '请输入用户名' };
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
    return { valid: false, message: '仅支持字母、数字、下划线，长度3-20' };
  }
  return { valid: true, message: '用户名可用' };
};

const validateEmail = (value: string): ValidationResult => {
  if (!value) return { valid: false, message: '请输入邮箱' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { valid: false, message: '请输入有效的邮箱地址' };
  }
  return { valid: true, message: '邮箱格式正确' };
};

const validatePassword = (value: string): ValidationResult => {
  if (!value) return { valid: false, message: '请输入密码' };
  if (value.length < 8) return { valid: false, message: '密码至少8位' };
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const types = [hasUpper, hasLower, hasNumber].filter(Boolean).length;
  if (types < 2) return { valid: false, message: '需包含大小写字母和数字中的至少两类' };
  return { valid: true, message: '密码强度满足' };
};

const validateConfirmPassword = (value: string, password: string): ValidationResult => {
  if (!value) return { valid: false, message: '请再次输入密码' };
  if (value !== password) return { valid: false, message: '两次密码不一致' };
  return { valid: true, message: '密码一致' };
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = useCallback(async () => {
    if (!username || !email || !password || !confirmPassword) {
      setError('请填写所有必填项');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
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
          })
        );
        navigate('/chat');
      } else {
        setError(data.error?.message || '注册失败');
      }
    } catch (err) {
      setError('网络错误，请检查服务器是否运行');
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, dispatch, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>SecureP2P Chat</h1>
          <p>创建您的账户</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRegister();
          }}
        >
          <FormField
            label="用户名"
            name="username"
            value={username}
            onChange={setUsername}
            validate={validateUsername}
            placeholder="仅支持字母、数字、下划线"
            autoComplete="username"
          />

          <FormField
            label="邮箱"
            name="email"
            type="email"
            value={email}
            onChange={setEmail}
            validate={validateEmail}
            placeholder="your@email.com"
            autoComplete="email"
          />

          <FormField
            label="密码"
            name="password"
            type="password"
            value={password}
            onChange={setPassword}
            validate={validatePassword}
            placeholder="至少8位，含大小写字母和数字"
            autoComplete="new-password"
          />

          <FormField
            label="确认密码"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            validate={(value) => validateConfirmPassword(value, password)}
            placeholder="再次输入密码"
            autoComplete="new-password"
          />

          {error && <div className="auth-error">{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            loading={loading}
            onClick={handleRegister}
          >
            注册
          </Button>
        </form>

        <div className="auth-footer">
          已有账户？<Link to="/login">登录</Link>
        </div>
      </div>
    </div>
  );
}