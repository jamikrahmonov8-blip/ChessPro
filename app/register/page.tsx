'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  Zap,
  Palette,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Начинающий', icon: '♟️' },
  { value: 'intermediate', label: 'Средний', icon: '♞' },
  { value: 'advanced', label: 'Продвинутый', icon: '♛' },
  { value: 'master', label: 'Мастер', icon: '♚' },
];

const BOARD_THEMES = [
  { value: 'classic', label: 'Классический', color: 'bg-amber-600' },
  { value: 'ocean', label: 'Океан', color: 'bg-blue-600' },
  { value: 'forest', label: 'Лес', color: 'bg-green-600' },
  { value: 'midnight', label: 'Полночь', color: 'bg-purple-600' },
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    difficulty: 'intermediate',
    boardTheme: 'classic',
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle difficulty level change
  const handleDifficultyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      difficulty: value,
    }));
  };

  // Handle board theme change
  const handleThemeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      boardTheme: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form fields
      if (!formData.email.trim()) {
        throw new Error('Email не может быть пустым');
      }
      if (!formData.password.trim()) {
        throw new Error('Пароль не может быть пустым');
      }
      if (!formData.username.trim()) {
        throw new Error('Имя пользователя не может быть пустым');
      }
      if (formData.password.length < 8) {
        throw new Error('Пароль должен содержать минимум 8 символов');
      }

      // Register with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            username: formData.username.trim(),
            difficulty_level: formData.difficulty,
            board_theme: formData.boardTheme,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!data.user) {
        throw new Error('Ошибка при создании аккаунта');
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const inputVariants = {
    initial: { scale: 0.95 },
    focus: { scale: 1.02 },
  };

  return (
    <div className="relative min-h-screen bg-gray-950 overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20"
      >
        <source src="/videos/bg-chess.mp4" type="video/mp4" />
      </video>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-gray-950 via-gray-900 to-gray-950 opacity-75" />

      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center mb-8"
          >
            <motion.h1
              variants={itemVariants}
              className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-2"
            >
              <span className="text-3xl">♟️</span>
              ChessPro
            </motion.h1>
            <motion.p variants={itemVariants} className="text-gray-400 text-sm">
              Присоединись к миру глобальных шахматных баталий
            </motion.p>
          </motion.div>

          {/* Card */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-linear-to-b from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl"
          >
            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-semibold">Успешно!</p>
                  <p className="text-green-300 text-sm">
                    Вы будете перенаправлены на страницу входа...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && !success && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-semibold">Ошибка регистрации</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email адрес
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                  <motion.input
                    variants={inputVariants}
                    initial="initial"
                    whileFocus="focus"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading || success}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-600 disabled:opacity-50 transition-all"
                  />
                </div>
              </motion.div>

              {/* Username Input */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Имя пользователя
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                  <motion.input
                    variants={inputVariants}
                    initial="initial"
                    whileFocus="focus"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={isLoading || success}
                    placeholder="your_username"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-600 disabled:opacity-50 transition-all"
                  />
                </div>
              </motion.div>

              {/* Password Input */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                  <motion.input
                    variants={inputVariants}
                    initial="initial"
                    whileFocus="focus"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading || success}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-600 disabled:opacity-50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || success}
                    className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Difficulty Level Selection */}
              <motion.div variants={itemVariants}>
                <label className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Уровень игры
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTY_LEVELS.map((level) => (
                    <motion.button
                      key={level.value}
                      type="button"
                      onClick={() => handleDifficultyChange(level.value)}
                      disabled={isLoading || success}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                        formData.difficulty === level.value
                          ? 'bg-blue-600 text-white border border-blue-400'
                          : 'bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:border-blue-500/50'
                      } disabled:opacity-50`}
                    >
                      <span>{level.icon}</span>
                      <span>{level.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Board Theme Selection */}
              <motion.div variants={itemVariants}>
                <label className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Тема доски
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BOARD_THEMES.map((theme) => (
                    <motion.button
                      key={theme.value}
                      type="button"
                      onClick={() => handleThemeChange(theme.value)}
                      disabled={isLoading || success}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`py-2 px-3 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                        formData.boardTheme === theme.value
                          ? `${theme.color} text-white border border-white/50`
                          : 'bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:border-white/30'
                      } disabled:opacity-50`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${theme.color}`}
                      />
                      <span>{theme.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || success}
                className="w-full mt-6 py-3 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Регистрация...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Успешно!</span>
                  </>
                ) : (
                  <span>Зарегистрироваться</span>
                )}
              </motion.button>

              {/* Login Link */}
              <motion.p
                variants={itemVariants}
                className="text-center text-sm text-gray-400 mt-4"
              >
                Уже есть аккаунт?{' '}
                <a
                  href="/login"
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  Войти
                </a>
              </motion.p>
            </form>
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="text-center text-xs text-gray-600 mt-6"
          >
            Продолжая, вы принимаете наши условия использования
          </motion.p>
        </motion.div>
      </div>

      {/* Custom CSS for blob animation */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}