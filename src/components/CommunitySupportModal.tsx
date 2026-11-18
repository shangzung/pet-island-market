'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { checkSensitiveContent } from '@/lib/contentFilter';
import {
  X,
  Lightbulb,
  Crown,
  ThumbsUp,
  Send,
  Trash2,
  CheckCircle2,
  ExternalLink,
  MessageSquareHeart,
  ShieldAlert,
  Flame,
} from 'lucide-react';

interface CommunitySupportModalProps {
  currentUser: any;
  isAdmin: boolean;
  isBanned: boolean;
  myDisplayName: string;
  myGameId: string;
  sponsorUrl: string;
  adminUserId?: string;
  initialTab?: 'feedback' | 'vip';
  onClose: () => void;
  onOpenChatWithAdmin: (adminId: string) => void;
  onSaveSponsorUrl?: (newUrl: string) => Promise<void>;
}

export function CommunitySupportModal({
  currentUser,
  isAdmin,
  isBanned,
  myDisplayName,
  myGameId,
  sponsorUrl,
  adminUserId,
  initialTab = 'vip',
  onClose,
  onOpenChatWithAdmin,
  onSaveSponsorUrl,
}: CommunitySupportModalProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'feedback' | 'vip'>(initialTab);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIdea, setNewIdea] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editUrl, setEditUrl] = useState(sponsorUrl || '');
  const [savingUrl, setSavingUrl] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('feature_requests')
        .select('*')
        .order('upvotes', { ascending: false })
        .order('created_at', { ascending: false });
      if (data) setRequests(data);
      setLoading(false);
    };
    fetchRequests();
  }, []);

  const handlePostIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return alert('請先登入後再留言許願喔！');
    if (isBanned) return alert('您的帳號已被停權，無法留言。');
    const cleanText = newIdea.trim();
    if (!cleanText) return;

    const filterCheck = checkSensitiveContent(cleanText);
    if (!filterCheck.isClean) {
      return alert(`留言包含禁止字詞「${filterCheck.matchedWord}」，請重新輸入！`);
    }

    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from('feature_requests')
      .insert({
        user_id: currentUser.id,
        author_name: myDisplayName || '島民玩家',
        content: cleanText,
        upvotes: 1,
        upvoted_by: [currentUser.id],
      })
      .select()
      .single();

    if (!error && inserted) {
      setRequests((prev) => [inserted, ...prev]);
      setNewIdea('');
    }
    setSubmitting(false);
  };

  const handleUpvote = async (req: any) => {
    if (!currentUser) return alert('請先登入才能為喜歡的功能投票喔！');
    const voters: string[] = Array.isArray(req.upvoted_by) ? req.upvoted_by : [];
    const hasVoted = voters.includes(currentUser.id);
    const nextVoters = hasVoted
      ? voters.filter((id) => id !== currentUser.id)
      : [...voters, currentUser.id];
    const nextCount = nextVoters.length;

    const { error } = await supabase
      .from('feature_requests')
      .update({ upvotes: nextCount, upvoted_by: nextVoters })
      .eq('id', req.id);
    if (!error) {
      setRequests((prev) =>
        prev
          .map((r) => (r.id === req.id ? { ...r, upvotes: nextCount, upvoted_by: nextVoters } : r))
          .sort((a, b) => b.upvotes - a.upvotes)
      );
    }
  };

  const handleTogglePlanned = async (req: any) => {
    const nextStatus = req.status === 'planned' ? 'open' : 'planned';
    const { error } = await supabase
      .from('feature_requests')
      .update({ status: nextStatus })
      .eq('id', req.id);
    if (!error) {
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: nextStatus } : r))
      );
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm('確定要刪除這則功能建議嗎？')) return;
    const { error } = await supabase.from('feature_requests').delete().eq('id', id);
    if (!error) setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveSponsorUrl) return;
    setSavingUrl(true);
    await onSaveSponsorUrl(editUrl.trim());
    setSavingUrl(false);
    alert('贊助連結已更新！');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90dvh] flex flex-col border border-[#F3E8D2] shadow-2xl overflow-hidden text-[#4A4238]"
      >
        <div className="px-4 sm:px-6 py-3.5 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('vip')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition ${
                activeTab === 'vip'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-xs'
                  : 'bg-white border border-[#E6D8C3] text-[#6E6254]'
              }`}
            >
              <Crown className="w-4 h-4" /> 👑 尊榮 VIP 島主
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition ${
                activeTab === 'feedback'
                  ? 'bg-[#F59E0B] text-white shadow-xs'
                  : 'bg-white border border-[#E6D8C3] text-[#6E6254]'
              }`}
            >
              <Lightbulb className="w-4 h-4" /> 💡 功能許願板
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeTab === 'vip' ? (
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> 急出 SR / 課長清倉必備神器
              </div>
              <h3 className="text-lg sm:text-xl font-bold">升級「👑 VIP 島主」加值特權</h3>
              <p className="text-xs text-[#8C7B6B]">
                小額贊助支持伺服器穩定營運，立即解鎖全站最醒目置頂曝光與 5 倍發文額度！
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] space-y-2">
                <div className="font-bold text-sm text-[#6E6254]">🌱 一般島民（永久免費）</div>
                <ul className="space-y-1.5 text-[#6E6254]">
                  <li>• 每 24 小時可發布 <strong>1 篇</strong> 貼文</li>
                  <li>• 貼文保留 <strong>48 小時</strong>（到期需重發）</li>
                  <li>• 一般列表排序顯示</li>
                  <li>• 完整 1v1 私訊、圖鑑套用與收藏</li>
                </ul>
              </div>

              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-[#FEF3C7] via-[#FFFBEB] to-white border-2 border-[#F59E0B] shadow-md shadow-amber-100 space-y-2">
                <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-bold shadow-2xs">
                  🔥 最多大戶選擇
                </span>
                <div className="font-bold text-sm text-[#B45309] flex items-center gap-1">
                  <Crown className="w-4 h-4 text-[#F59E0B]" /> 👑 VIP 島主（30 天特權）
                </div>
                <ul className="space-y-1.5 font-medium text-[#4A4238]">
                  <li>• <strong>首頁最前排「✨ VIP 置頂曝光」</strong>（成交快 3 倍）</li>
                  <li>• 每日發文上限提升至 <strong>5 篇</strong>（抽卡清倉無壓力）</li>
                  <li>• 貼文保留延長至 <strong>7 天（168 小時）</strong>免重發</li>
                  <li>• 全站專屬 <strong>👑 VIP 皇冠徽章</strong>＋流光金卡框</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] space-y-3">
              <div className="font-bold text-sm">📌 安全贊助與快速開通流程</div>
              <p className="text-xs text-[#6E6254] leading-relaxed">
                點擊下方按鈕前往安全贊助平台或私訊站長索取收款碼（支援街口 / LINE Pay），贊助時請備註您的
                <strong>「遊戲 ID：{myGameId || '登入後顯示'}」</strong>，核對後立即為您開啟 30 天 VIP 尊榮特權！
              </p>
              <div className="flex flex-wrap gap-2.5">
                {sponsorUrl && (
                  <a
                    href={sponsorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[180px] py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" /> 前往安全贊助連結
                  </a>
                )}
                {adminUserId && currentUser && currentUser.id !== adminUserId && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenChatWithAdmin(adminUserId);
                    }}
                    className="flex-1 min-w-[180px] py-2.5 px-4 rounded-2xl bg-white border-2 border-[#F59E0B] text-[#B45309] hover:bg-[#FEF3C7]/40 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <MessageSquareHeart className="w-4 h-4" /> 1v1 私訊站長索取收款碼
                  </button>
                )}
              </div>
              {isAdmin && (
                <form onSubmit={handleUpdateUrl} className="mt-3 pt-3 border-t border-[#F3E8D2] flex flex-wrap gap-2">
                  <input
                    type="url"
                    placeholder="輸入第三方贊助網址 (如 Portaly)..."
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl bg-white border border-[#E6D8C3] text-xs"
                  />
                  <button
                    type="submit"
                    disabled={savingUrl}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold"
                  >
                    儲存網址
                  </button>
                </form>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-2 text-[11px] text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                本方案僅為「網站伺服器維護贊助與系統展示便利功能」，非販售遊戲內虛擬道具。僅接受玩家本人帳號小額贊助。
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto flex flex-col">
            <div className="mb-4 p-3.5 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] text-xs text-[#6E6254]">
              ✨ <strong>希望寵物島市集推出什麼新功能呢？</strong>
              歡迎在下方留言許願！也可以幫其他島民按「👍 附議」，高票建議將優先開發！
            </div>
            <form onSubmit={handlePostIdea} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder={currentUser ? '輸入希望新增的功能...' : '請先登入後再留言'}
                value={newIdea}
                onChange={(e) => setNewIdea(e.target.value)}
                disabled={!currentUser || isBanned || submitting}
                className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-[#FFFDF7] border border-[#E6D8C3] text-xs"
              />
              <button
                type="submit"
                disabled={!currentUser || isBanned || submitting || !newIdea.trim()}
                className="px-4 py-2.5 rounded-full bg-[#F59E0B] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> 許願
              </button>
            </form>
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              {loading ? (
                <p className="text-center text-xs text-[#8C7B6B] py-8">載入中...</p>
              ) : requests.length === 0 ? (
                <p className="text-center text-xs text-[#A39585] py-10">
                  目前還沒有功能許願，成為第一位提出好點子的島民吧！
                </p>
              ) : (
                requests.map((req) => {
                  const hasVoted =
                    currentUser &&
                    Array.isArray(req.upvoted_by) &&
                    req.upvoted_by.includes(currentUser.id);
                  const canDelete = isAdmin || (currentUser && currentUser.id === req.user_id);
                  return (
                    <div
                      key={req.id}
                      className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 text-xs ${
                        req.status === 'planned'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-[#FFFDF7] border-[#F3E8D2]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{req.author_name}</span>
                          {req.status === 'planned' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                              ✅ 站長已採納
                            </span>
                          )}
                        </div>
                        <p className="text-sm break-words">{req.content}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleUpvote(req)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border ${
                            hasVoted
                              ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#B45309]'
                              : 'bg-white border-[#E6D8C3] text-[#6E6254]'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> {req.upvotes || 0}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleTogglePlanned(req)}
                            className="p-1.5 rounded-full bg-emerald-100 text-emerald-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteIdea(req.id)}
                            className="p-1.5 rounded-full bg-red-50 text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}