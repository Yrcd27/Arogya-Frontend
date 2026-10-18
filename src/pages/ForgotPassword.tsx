import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Home,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { userAPI } from '../services/userService';
import { ApiError } from '../services/httpClient';
import {
  EMAIL_MAX_LENGTH, PASSWORD_REQUIREMENTS, focusFirstInvalidField, getApiFieldErrors, getConfirmationError, getEmailError,
  getOtpError, getPasswordStrength, getResetPasswordCriteria, getResetPasswordError, normalizeEmail,
  type FieldErrors,
} from '../utils/formValidation';

type Step = 1 | 2 | 3 | 4;
type RecoveryField = 'email' | 'otp' | 'newPassword' | 'confirmPassword';

export function ForgotPassword() {
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RecoveryField>>({});
  const [formError, setFormError] = useState('');
  const pendingRef = useRef(false);

  // Step 1: Email
  const [email, setEmail] = useState<string>('');

  // Step 2: OTP (6 digits)
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: Reset Password
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (step === 2 && resendCooldown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (resendCooldown === 0) {
      setCanResend(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCooldown]);

  // Auto-focus first OTP input when entering step 2
  useEffect(() => {
    if (step === 2) {
      const timer = window.setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [step]);

  const returnToEmail = () => {
    if (pendingRef.current) return;
    setStep(1);
    setOtp(['', '', '', '', '', '']);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setFieldErrors({});
    setFormError('');
  };

  const showRequestError = (cause: unknown, form: HTMLFormElement | null, fields: readonly RecoveryField[], fallback: string) => {
    const errors = getApiFieldErrors(cause, fields, { password: 'newPassword', code: 'otp' });
    if (Object.keys(errors).length && form) {
      setFieldErrors(errors);
      focusFirstInvalidField(form);
    } else {
      setFormError(cause instanceof Error ? cause.message : fallback);
    }
  };

  // ----------------------------------------------------------------------
  // Step 1 Handler: Request OTP
  // ----------------------------------------------------------------------
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingRef.current) return;
    const form = e.currentTarget as HTMLFormElement;
    const cleanEmail = normalizeEmail(email);
    const emailError = getEmailError(cleanEmail);
    setEmail(cleanEmail);
    setFormError('');
    setFieldErrors({ email: emailError });
    if (emailError) {
      focusFirstInvalidField(form);
      return;
    }

    pendingRef.current = true;
    setLoading(true);
    try {
      const res = await userAPI.forgotPassword(cleanEmail);
      toast.success(res.message || 'Verification code sent to your email.');
      setOtp(['', '', '', '', '', '']);
      setResetToken('');
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      showRequestError(err, form, ['email'], 'Failed to send verification code. Please try again.');
    } finally {
      pendingRef.current = false;
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Step 2 Handlers: OTP Inputs & Verification
  // ----------------------------------------------------------------------
  const handleOtpChange = (index: number, value: string) => {
    setFormError('');
    if (!/^[0-9]*$/.test(value) || (value.length !== 1 && value.length !== 0 && value.length !== 6)) {
      setFieldErrors(previous => ({ ...previous, otp: 'Use numbers only. Paste the complete 6-digit code.' }));
      return;
    }
    if (value.length === 6) {
      setOtp(value.split(''));
      setFieldErrors(previous => ({ ...previous, otp: undefined }));
      otpInputsRef.current[5]?.focus();
      return;
    }
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    setFieldErrors(previous => ({ ...previous, otp: previous.otp ? getOtpError(updated.join('')) : undefined }));
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const target = otp[index] || index === 0 ? index : index - 1;
      setOtp(previous => previous.map((digit, digitIndex) => digitIndex === target ? '' : digit));
      setFieldErrors(previous => ({ ...previous, otp: undefined }));
      setFormError('');
      otpInputsRef.current[target]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const message = getOtpError(pastedData);
    setFieldErrors(previous => ({ ...previous, otp: message }));
    setFormError('');
    if (message) return;
    setOtp(pastedData.split(''));
    otpInputsRef.current[5]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingRef.current) return;
    const form = e.currentTarget as HTMLFormElement;
    const code = otp.join('');
    const message = getOtpError(code);
    setFieldErrors({ otp: message });
    setFormError('');
    if (message) {
      otpInputsRef.current[Math.max(0, otp.findIndex(digit => !digit))]?.focus();
      return;
    }

    pendingRef.current = true;
    setLoading(true);
    try {
      const res = await userAPI.verifyOtp(normalizeEmail(email), code);
      if (!res || typeof res.resetToken !== 'string' || !res.resetToken.trim()) {
        throw new Error('Verification could not be completed. Please verify your code again.');
      }
      setResetToken(res.resetToken);
      toast.success('Code verified successfully! Please enter your new password.');
      setStep(3);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFieldErrors({ otp: err.message || 'Invalid or expired verification code.' });
        focusFirstInvalidField(form);
      } else {
        showRequestError(err, form, ['otp'], 'Invalid or expired verification code.');
      }
    } finally {
      pendingRef.current = false;
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || pendingRef.current) return;
    pendingRef.current = true;
    setLoading(true);
    setFormError('');
    setFieldErrors({});
    try {
      const res = await userAPI.forgotPassword(normalizeEmail(email));
      toast.success(res.message || 'A new verification code has been sent.');
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60);
      setCanResend(false);
      window.requestAnimationFrame(() => otpInputsRef.current[0]?.focus());
    } catch (err) {
      showRequestError(err, null, [], 'Failed to resend code. Please try again.');
    } finally {
      pendingRef.current = false;
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Step 3 Handler: Reset Password
  // ----------------------------------------------------------------------
  const passwordCriteria = getResetPasswordCriteria(newPassword);

  const passwordStrength = getPasswordStrength(newPassword);
  const showPasswordRequirements = !!newPassword && !!getResetPasswordError(newPassword) && fieldErrors.newPassword !== PASSWORD_REQUIREMENTS;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingRef.current) return;
    const form = e.currentTarget as HTMLFormElement;
    const errors: FieldErrors<RecoveryField> = {
      newPassword: getResetPasswordError(newPassword),
      confirmPassword: getConfirmationError(newPassword, confirmPassword),
    };
    setFieldErrors(errors);
    setFormError('');
    if (Object.values(errors).some(Boolean)) {
      focusFirstInvalidField(form);
      return;
    }
    if (!resetToken.trim()) {
      setFormError('Your password reset session is missing. Please start over to request another code.');
      return;
    }

    pendingRef.current = true;
    setLoading(true);
    try {
      const res = await userAPI.resetPassword(normalizeEmail(email), resetToken, newPassword);
      toast.success(res.message || 'Password reset successfully!');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setStep(4);
    } catch (err) {
      showRequestError(err, form, ['newPassword', 'confirmPassword'], 'Failed to reset password. Please try again.');
    } finally {
      pendingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12 relative">
      {/* Home Button */}
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Go to home"
        className="hidden md:flex group absolute top-7 left-8 z-10 items-center w-11 hover:w-28 focus-visible:w-28 h-11 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_2px_8px_rgba(15,28,43,0.06)] transition-[width,background-color] duration-200 ease hover:bg-[#38A3A5]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38A3A5]"
      >
        <span className="flex items-center justify-center w-11 h-11 shrink-0 text-[#38A3A5]">
          <Home className="w-5 h-5" />
        </span>
        <span className="whitespace-nowrap pr-4 text-sm font-medium text-[#111827] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150">
          Home
        </span>
      </button>

      <div className="max-w-md w-full">
        {/* Mobile Home Button */}
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Go to home"
          className="md:hidden inline-flex items-center gap-2 h-10 px-4 mb-6 rounded-xl border border-gray-200 bg-white shadow-sm text-sm font-medium text-[#111827] hover:bg-[#38A3A5]/10 transition-colors"
        >
          <Home className="w-4 h-4 text-[#38A3A5]" />
          Home
        </button>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#38A3A5]/10 text-[#38A3A5] mb-4 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Recovery</h1>
          <p className="text-gray-600 text-sm">
            {step === 1 && 'Enter your email to receive a verification code'}
            {step === 2 && 'Enter the 6-digit code sent to your inbox'}
            {step === 3 && 'Choose a strong new password for your account'}
            {step === 4 && 'Your password has been successfully updated'}
          </p>
        </div>

        {/* Progress Step Indicator (visible during steps 1-3) */}
        {step < 4 && (
          <div className="flex items-center justify-between mb-8 px-4">
            {/* Step 1 Pill */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step >= 1 ? 'bg-[#38A3A5] text-white shadow-md' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-xs mt-1.5 font-medium text-gray-600">Email</span>
            </div>

            {/* Connecting Line 1-2 */}
            <div
              className={`flex-1 h-0.5 mx-2 -mt-4 transition-all duration-300 ${
                step >= 2 ? 'bg-[#38A3A5]' : 'bg-gray-200'
              }`}
            />

            {/* Step 2 Pill */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step >= 2 ? 'bg-[#38A3A5] text-white shadow-md' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-xs mt-1.5 font-medium text-gray-600">Verify</span>
            </div>

            {/* Connecting Line 2-3 */}
            <div
              className={`flex-1 h-0.5 mx-2 -mt-4 transition-all duration-300 ${
                step >= 3 ? 'bg-[#38A3A5]' : 'bg-gray-200'
              }`}
            />

            {/* Step 3 Pill */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step === 3 ? 'bg-[#38A3A5] text-white shadow-md' : 'bg-gray-200 text-gray-500'
                }`}
              >
                3
              </div>
              <span className="text-xs mt-1.5 font-medium text-gray-600">Reset</span>
            </div>
          </div>
        )}

        {/* Card Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 transition-all duration-300">
          {formError && (
            <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{formError}</p>
              {step > 1 && <button type="button" onClick={returnToEmail} disabled={loading} className="mt-2 font-medium underline disabled:opacity-50">Start over</button>}
            </div>
          )}
          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} noValidate className="space-y-6">
              <div>
                <label htmlFor="recovery-email" className="block text-sm font-medium text-gray-900 mb-2">Registered Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    id="recovery-email"
                    name="email"
                    type="email"
                    maxLength={EMAIL_MAX_LENGTH}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'recovery-email-error' : undefined}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFormError('');
                      setFieldErrors(previous => ({ ...previous, email: previous.email ? getEmailError(e.target.value) : undefined }));
                    }}
                    onBlur={() => {
                      setEmail(normalizeEmail(email));
                      setFieldErrors(previous => ({ ...previous, email: getEmailError(email) ?? previous.email }));
                    }}
                    placeholder="e.g. name@example.com"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent text-gray-900 text-sm"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                {fieldErrors.email && <p id="recovery-email-error" role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
                <p className="mt-2 text-xs text-gray-500">
                  We will send a 6-digit one-time password (OTP) to this address.
                </p>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#38A3A5] text-white py-3 rounded-xl font-semibold hover:bg-[#2d8284] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-[#38A3A5]/30"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#38A3A5] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Verify 6-digit OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} noValidate className="space-y-6">
              <div className="bg-[#38A3A5]/5 border border-[#38A3A5]/20 rounded-xl p-3.5 flex items-center justify-between text-xs text-gray-700">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4 text-[#38A3A5] shrink-0" />
                  <span className="truncate">Sent to <strong className="text-gray-900">{email}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={returnToEmail}
                  disabled={loading}
                  className="text-[#38A3A5] font-semibold hover:underline shrink-0 ml-2"
                >
                  Change
                </button>
              </div>

              <div>
                <p id="recovery-otp-label" className="block text-sm font-medium text-gray-900 mb-3 text-center">
                  Enter 6-Digit Code
                </p>
                <div role="group" aria-labelledby="recovery-otp-label" className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`recovery-otp-${idx}`}
                      name={`otp-${idx + 1}`}
                      aria-label={`Verification code digit ${idx + 1} of 6`}
                      aria-invalid={!!fieldErrors.otp}
                      aria-describedby={fieldErrors.otp ? 'recovery-otp-error' : undefined}
                      ref={(el) => (otpInputsRef.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-gray-300 text-gray-900 transition-all bg-gray-50 focus:bg-white"
                      disabled={loading}
                    />
                  ))}
                </div>
                {fieldErrors.otp && <p id="recovery-otp-error" role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors.otp}</p>}
              </div>

              {/* Countdown / Resend */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>⏱ Code expires in 10 minutes</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-[#38A3A5] font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Resend Code
                  </button>
                ) : (
                  <span className="text-gray-400">
                    Resend in <strong className="text-gray-600">{resendCooldown}s</strong>
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#38A3A5] text-white py-3 rounded-xl font-semibold hover:bg-[#2d8284] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-[#38A3A5]/30"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={returnToEmail}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#38A3A5] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} noValidate className="space-y-5">
              {/* New Password */}
              <div>
                <label htmlFor="recovery-password" className="block text-sm font-medium text-gray-900 mb-2">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                    <KeyRound className="w-5 h-5" />
                  </span>
                  <input
                    id="recovery-password"
                    name="newPassword"
                    aria-invalid={!!fieldErrors.newPassword}
                    aria-describedby={[showPasswordRequirements && 'recovery-password-requirements', fieldErrors.newPassword && 'recovery-password-error'].filter(Boolean).join(' ') || undefined}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewPassword(value);
                      setFormError('');
                      setFieldErrors(previous => ({
                        ...previous,
                        newPassword: previous.newPassword ? getResetPasswordError(value) : undefined,
                        confirmPassword: confirmPassword ? getConfirmationError(value, confirmPassword) : previous.confirmPassword,
                      }));
                    }}
                    onBlur={() => setFieldErrors(previous => ({ ...previous, newPassword: getResetPasswordError(newPassword) ?? previous.newPassword }))}
                    placeholder="Enter new password"
                    className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent text-gray-900 text-sm"
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {showPasswordRequirements && <p id="recovery-password-requirements" className="mt-2 text-xs text-gray-500">{PASSWORD_REQUIREMENTS}</p>}
                {fieldErrors.newPassword && <p id="recovery-password-error" role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors.newPassword}</p>}
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-600">Password Strength:</span>
                    <span
                      className={`font-semibold ${
                        passwordStrength.level === 1
                          ? 'text-red-500'
                          : passwordStrength.level === 3
                          ? 'text-yellow-600'
                          : 'text-[#38A3A5]'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>

                  {/* Strength Bar */}
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`rounded-full transition-all duration-300 ${
                          passwordStrength.level >= level
                            ? passwordStrength.level === 1
                              ? 'bg-red-400'
                              : passwordStrength.level === 3
                              ? 'bg-yellow-400'
                              : 'bg-[#38A3A5]'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 text-[11px] text-gray-500">
                    <div className="flex items-center gap-1.5">
                      {passwordCriteria.length ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-300" />
                      )}
                      <span>8+ characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordCriteria.uppercase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-300" />
                      )}
                      <span>1 uppercase</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordCriteria.lowercase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-300" />
                      )}
                      <span>1 lowercase</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordCriteria.number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-300" />
                      )}
                      <span>1 number</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordCriteria.special ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-gray-300" />}
                      <span>1 special character</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div>
                <label htmlFor="recovery-confirm-password" className="block text-sm font-medium text-gray-900 mb-2">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <input
                    id="recovery-confirm-password"
                    name="confirmPassword"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? 'recovery-confirm-password-error' : confirmPassword ? 'recovery-password-match' : undefined}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFormError('');
                      setFieldErrors(previous => ({ ...previous, confirmPassword: previous.confirmPassword || e.target.value ? getConfirmationError(newPassword, e.target.value) : undefined }));
                    }}
                    onBlur={() => setFieldErrors(previous => ({ ...previous, confirmPassword: getConfirmationError(newPassword, confirmPassword) ?? previous.confirmPassword }))}
                    placeholder="Re-enter new password"
                    className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent text-gray-900 text-sm"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p id="recovery-confirm-password-error" role="alert" className="mt-1.5 text-sm text-red-600">{fieldErrors.confirmPassword}</p>}
                {confirmPassword && !fieldErrors.confirmPassword && (
                  <p
                    id="recovery-password-match"
                    className={`mt-1.5 text-xs flex items-center gap-1 ${
                      passwordsMatch ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Passwords match
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5" /> Passwords do not match
                      </>
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#38A3A5] text-white py-3 rounded-xl font-semibold hover:bg-[#2d8284] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-[#38A3A5]/30 pt-3"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: Success View */}
          {step === 4 && (
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border-4 border-emerald-100 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Password Updated!</h3>
                <p className="text-sm text-gray-600 max-w-xs mx-auto">
                  Your password has been reset successfully. You can now use your new password to sign in.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login', { state: { email } })}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#38A3A5] text-white py-3 rounded-xl font-semibold hover:bg-[#2d8284] transition-colors shadow-sm shadow-[#38A3A5]/30"
              >
                Sign In Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
