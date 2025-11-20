'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MdCheckCircle, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import AlertModal from '@/components/modals/AlertModal';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  // Validate token on page load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setIsValidToken(false);
        setAlertModal({
          isOpen: true,
          message: 'Invalid reset link',
          title: 'Error',
          type: 'error'
        });
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await response.json();

        if (data.valid) {
          setIsValidToken(true);
          setUserEmail(data.email || '');
          setUserName(data.name || '');
        } else {
          setIsValidToken(false);
          setAlertModal({
            isOpen: true,
            message: data.error || 'Invalid or expired reset link',
            title: 'Invalid Link',
            type: 'error'
          });
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setIsValidToken(false);
        setAlertModal({
          isOpen: true,
          message: 'Failed to validate reset link',
          title: 'Error',
          type: 'error'
        });
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (newPassword.length < 8) {
      setAlertModal({
        isOpen: true,
        message: 'Password must be at least 8 characters long',
        title: 'Validation Error',
        type: 'error'
      });
      return;
    }

    if (!/\d/.test(newPassword)) {
      setAlertModal({
        isOpen: true,
        message: 'Password must contain at least one number',
        title: 'Validation Error',
        type: 'error'
      });
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      setAlertModal({
        isOpen: true,
        message: 'Password must contain at least one symbol (!@#$%^&* etc.)',
        title: 'Validation Error',
        type: 'error'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlertModal({
        isOpen: true,
        message: 'Passwords do not match',
        title: 'Validation Error',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess(true);
        setAlertModal({
          isOpen: true,
          message: 'Password reset successful! Redirecting to login...',
          title: 'Success',
          type: 'success'
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setAlertModal({
          isOpen: true,
          message: data.error || 'Failed to reset password',
          title: 'Error',
          type: 'error'
        });
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      setAlertModal({
        isOpen: true,
        message: 'Failed to reset password',
        title: 'Error',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-4xl text-red-600">✕</span>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-red-600">Invalid Reset Link</h2>
            <p className="text-gray-600">
              This password reset link is invalid or has expired.
            </p>
            <p className="text-sm text-gray-500">
              Password reset links expire after 1 hour for security purposes.
            </p>
            <Link href="/">
              <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Return to Login
              </button>
            </Link>
          </div>
        </div>
        
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          message={alertModal.message}
          title={alertModal.title}
          type={alertModal.type}
        />
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                <MdCheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-green-600">Password Reset Successful!</h2>
            <p className="text-gray-600">
              Your password has been updated successfully.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to the login page...
            </p>
            <Link href="/">
              <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Go to Login
              </button>
            </Link>
          </div>
        </div>
        
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          message={alertModal.message}
          title={alertModal.title}
          type={alertModal.type}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Reset Your Password</h1>
          <p className="text-gray-600">
            {userName && `Hi ${userName}, `}Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {userEmail && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Resetting password for: <strong>{userEmail}</strong>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                required
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  newPassword && newPassword.length < 8 ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
              </button>
            </div>
            {newPassword && newPassword.length < 8 ? (
              <p className="text-xs text-red-600">Password must be at least 8 characters</p>
            ) : (
              <p className="text-xs text-gray-500">Must be at least 8 characters with 1 number and 1 symbol</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                required
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            disabled={isSubmitting || newPassword.length < 8 || newPassword !== confirmPassword || !/\d/.test(newPassword) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)}
          >
            {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
          </button>

          <div className="text-center">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
      
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        message={alertModal.message}
        title={alertModal.title}
        type={alertModal.type}
      />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

