import { useState } from 'react';
import { api } from '@/lib/api-client';
import AlertModal from './AlertModal';

interface VerificationModalProps {
  isOpen: boolean;
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

export default function VerificationModal({
  isOpen,
  email,
  onVerified,
  onCancel,
}: VerificationModalProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
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

  const handleVerifyCode = async () => {
    if (!email || !verificationCode.trim()) {
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
      const { data, error } = await api.auth.verifyCode(email, verificationCode.trim());

      if (error) {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Verification Failed',
          message: error || 'Invalid or expired verification code. Please try again.',
        });
        return;
      }

      // Store auth token and user
      if (data?.token) {
        localStorage.setItem('auth_token', data.token);
      }
      if (data?.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Call the onVerified callback to let parent handle redirect
      onVerified();
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

  const handleResendCode = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      const { data, error } = await api.auth.resendCode(email);
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
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify your email</h2>
          <p className="text-sm text-gray-600 mb-4">
            We&apos;ve sent a 6-digit verification code to{' '}
            <span className="font-medium">{email}</span>. Enter it below to continue.
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleVerifyCode();
                }
              }}
              maxLength={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="123456"
              autoFocus
            />
          </div>
          <div className="flex justify-between items-center mt-4">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending || isVerifying}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? 'Resending...' : 'Resend code'}
            </button>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onCancel}
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

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
}

