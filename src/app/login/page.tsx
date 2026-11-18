'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Mail, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else {
        setMessage('註冊成功！正在進入寵物島...');
        router.push('/');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        router.push('/');
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-amber-100/60 border border-amber-100 p-8">
        <Link href="/" className="inline-flex items-center text-sm text-stone-400 hover:text-amber-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回市集
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800">歡迎來到寵物島市集</h1>
          <p className="text-sm text-stone-500 mt-1">登入後即可發布交換道具、管理專屬圖鑑</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-3 px-4 rounded-2xl border-2 border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 font-semibold text-stone-700 flex items-center justify-center gap-2 transition"
        >
          <span>🐾</span> 使用 Google 帳號快速登入
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-stone-400">或使用 Email 測試登入</span></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                placeholder="輸入電子信箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 text-stone-800 text-sm"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="輸入密碼 (至少6碼)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 text-stone-800 text-sm"
              />
            </div>
          </div>

          {message && <p className="text-xs text-rose-500 text-center font-medium">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold shadow-md shadow-amber-200 transition disabled:opacity-50"
          >
            {loading ? '處理中...' : isSignUp ? '註冊並進入島嶼' : '登入島嶼'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-500 mt-5">
          {isSignUp ? '已經有島民帳號了？' : '第一次來到寵物島？'}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-amber-600 font-bold ml-1 hover:underline"
          >
            {isSignUp ? '點此登入' : '免費註冊新帳號'}
          </button>
        </p>
      </div>
    </div>
  );
}