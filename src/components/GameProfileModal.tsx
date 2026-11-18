'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Gamepad2, CheckCircle2, Sparkles } from 'lucide-react';

interface GameProfileModalProps {
  userId: string;
  onSuccess: (gameId: string, gameName: string) => void;
}

export function GameProfileModal({ userId, onSuccess }: GameProfileModalProps) {
  const supabase = createClient();
  const [gameId, setGameId] = useState('');
  const [gameName, setGameName] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = gameId.trim();
    const cleanName = gameName.trim();

    if (!cleanId || !cleanName) {
      setErrorMsg('請完整填寫「遊戲 ID」與「遊戲名稱」喔！');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    // 檢查遊戲 ID 是否已被其他帳號綁定
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('game_id', cleanId)
      .neq('id', userId)
      .maybeSingle();

    if (existing) {
      setErrorMsg('這個遊戲 ID 已經被其他帳號綁定囉，請確認是否輸入正確！');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        game_id: cleanId,
        game_name: cleanName,
        nickname: cleanName, // 同步將市集顯示暱稱更新為遊戲名稱
      });

    if (error) {
      setErrorMsg('儲存失敗：' + error.message);
      setSaving(false);
      return;
    }

    setCreated(true);
    setTimeout(() => {
      onSuccess(cleanId, cleanName);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full border border-[#F3E8D2] shadow-2xl p-6 sm:p-8 text-[#4A4238]">
        {created ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
            <h2 className="text-2xl font-bold">遊戲名片創建成功！</h2>
            <p className="text-sm text-[#8C7B6B]">
              歡迎加入寵物島市集，正在為你進入大廳...
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">建立你的島民遊戲名片</h2>
                <p className="text-xs text-[#8C7B6B]">
                  完成綁定後即可發布道具與使用 1v1 私訊交易
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="my-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 mt-5">
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  遊戲 ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="請輸入你的遊戲內數字 / 英數 ID"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3] text-sm focus:outline-none focus:border-[#F59E0B]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  遊戲名稱 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="請輸入你在遊戲裡的顯示名稱"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3] text-sm focus:outline-none focus:border-[#F59E0B]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
              >
                <Sparkles className="w-4 h-4" />
                {saving ? '正在建立名片...' : '確認創建並進入市集'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}