'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Gamepad2, CheckCircle2, Sparkles } from 'lucide-react';
import { checkSensitiveContent } from '@/lib/contentFilter';

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

    const filterCheck = checkSensitiveContent(cleanName);
    if (!filterCheck.isClean) {
      setErrorMsg(`遊戲名稱包含違禁字詞「${filterCheck.matchedWord}」，請重新輸入！`);
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const { data: bannedRecord } = await supabase
      .from('banned_game_ids')
      .select('game_id, reason')
      .eq('game_id', cleanId)
      .maybeSingle();

    if (bannedRecord) {
      setErrorMsg(
        `⚠️ 系統安全攔截：遊戲 ID「${cleanId}」因曾違反交易規範（${bannedRecord.reason}）已被列入永久黑名單，無法綁定使用！`
      );
      setSaving(false);
      return;
    }

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
        nickname: cleanName,
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
              <div className="my-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs leading-relaxed">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 mt-5">
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  遊戲 ID（供買賣家搜尋加好友） <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="請填寫英數字帳號 ID（例：rraknam9）"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3] text-sm font-mono focus:outline-none focus:border-[#F59E0B]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  遊戲名稱（角色顯示暱稱） <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="請填寫遊戲內角色名稱（例：花無缺）"
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