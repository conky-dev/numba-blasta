'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import AlertModal from '@/components/modals/AlertModal';
import { api } from '@/lib/api-client';

export default function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in all fields',
      });
      return;
    }

    if (password.length < 8) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Weak Password',
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    if (!/\d/.test(password)) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Weak Password',
        message: 'Password must contain at least one number',
      });
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Weak Password',
        message: 'Password must contain at least one symbol (!@#$%^&* etc.)',
      });
      return;
    }

    if (password !== confirmPassword) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Password Mismatch',
        message: 'Passwords do not match',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await api.auth.signup(email, password, fullName);

      if (error) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Signup Failed',
          message: error || 'An error occurred during signup',
        });
        setIsLoading(false);
        return;
      }

      // Success: show verification modal instead of auto-redirect
      setSignupEmail(email);
      setVerificationCode('');
      setShowVerifyModal(true);
    } catch (error) {
      console.error('Signup error:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!signupEmail || !verificationCode.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Code',
        message: 'Please enter the 6-digit verification code from your email.',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await api.auth.verifyCode(signupEmail, verificationCode.trim());

      if (error) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Verification Failed',
          message: error || 'Invalid or expired verification code. Please try again.',
        });
        return;
      }

      // Store auth token and user, then redirect
      if (data?.token) {
        localStorage.setItem('auth_token', data.token);
      }
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setShowVerifyModal(false);

      // If there's a redirect URL (e.g., from invite), use it
      // Otherwise, go to onboarding to create/join org
      if (redirect) {
        router.push(redirect);
      } else {
        router.push('/onboarding');
      }
    } catch (err: any) {
      console.error('Verify code error:', err);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Verification Error',
        message: err.message || 'An unexpected error occurred while verifying your code.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-4xl font-bold text-blue-600 mb-2">
          SMSblast
        </h1>
        <h2 className="text-center text-2xl font-semibold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/')}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign in
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
          <form onSubmit={handleSignup} className="space-y-6">
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="text-gray-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with 1 number and 1 symbol
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm px-4 py-3">
          <p className="text-center text-xs text-gray-600">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Verification Code Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify your email</h2>
            <p className="text-sm text-gray-600 mb-4">
              We&apos;ve sent a 6-digit verification code to{' '}
              <span className="font-medium">{signupEmail}</span>. Enter it below to complete your
              signup.
            </p>
            <div className="mb-4">
              <label
                htmlFor="verificationCode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Verification code
              </label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456"
              />
            </div>
            <div className="flex justify-between items-center mt-4">
              <button
                type="button"
                onClick={async () => {
                  if (!signupEmail) return;
                  setIsResending(true);
                  try {
                    const { data, error } = await api.auth.resendCode(signupEmail);
                    if (error) {
                      setAlertModal({
                        isOpen: true,
                        type: 'error',
                        title: 'Resend Failed',
                        message: error || 'Could not resend verification code. Please try again.',
                      });
                    } else {
                      setAlertModal({
                        isOpen: true,
                        type: 'info',
                        title: 'Code Resent',
                        message:
                          data?.message ||
                          'A new verification code has been sent to your email address.',
                      });
                    }
                  } catch (err: any) {
                    console.error('Resend code error:', err);
                    setAlertModal({
                      isOpen: true,
                      type: 'error',
                      title: 'Resend Error',
                      message:
                        err.message || 'An unexpected error occurred while resending the code.',
                    });
                  } finally {
                    setIsResending(false);
                  }
                }}
                disabled={isResending || isVerifying}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Resending...' : 'Resend code'}
              </button>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  disabled={isVerifying}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={isVerifying}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

