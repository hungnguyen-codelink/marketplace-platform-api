import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { authApi, type RegisterPayload } from '../../api/auth';
import Button from '../../components/Button';
import Input from '../../components/Input';
import FormField from '../../components/FormField';

interface FormErrors {
  email?: string;
  full_name?: string;
  password?: string;
  role?: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    // Validate full name
    if (!fullName.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Validate role
    if (!role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterPayload = {
        email,
        full_name: fullName,
        password,
        role: role as 'buyer' | 'seller',
      };

      const response = await authApi.register(payload);
      login(response.user, response.token);
      navigate('/');
    } catch (error: any) {
      // Handle 409 Conflict (email already exists)
      if (error.response?.status === 409) {
        addToast('Email already exists', 'error');
        return;
      }

      // Handle 400 with field errors
      if (error.response?.status === 400 && error.response?.data?.errors) {
        const serverErrors: FormErrors = {};
        const errorObj = error.response.data.errors;

        if (errorObj.email) {
          serverErrors.email = Array.isArray(errorObj.email)
            ? errorObj.email[0]
            : errorObj.email;
        }
        if (errorObj.full_name) {
          serverErrors.full_name = Array.isArray(errorObj.full_name)
            ? errorObj.full_name[0]
            : errorObj.full_name;
        }
        if (errorObj.password) {
          serverErrors.password = Array.isArray(errorObj.password)
            ? errorObj.password[0]
            : errorObj.password;
        }
        if (errorObj.role) {
          serverErrors.role = Array.isArray(errorObj.role)
            ? errorObj.role[0]
            : errorObj.role;
        }

        setErrors(serverErrors);
        return;
      }

      // Generic error
      addToast('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <FormField
            label="Email Address"
            htmlFor="email"
            error={errors.email}
            required
          >
            <Input
              id="email"
              type="email"
              placeholder="your@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <FormField
            label="Full Name"
            htmlFor="full_name"
            error={errors.full_name}
            required
          >
            <Input
              id="full_name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <FormField
            label="Password"
            htmlFor="password"
            error={errors.password}
            required
          >
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <FormField
            label="Account Type"
            htmlFor="role"
            error={errors.role}
            required
          >
            <div className="w-full">
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.role
                    ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 text-gray-900 focus:border-indigo-500'
                }`}
              >
                <option value="">Select account type</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            </div>
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading}
          >
            Register
          </Button>
        </form>
      </div>
    </div>
  );
}
