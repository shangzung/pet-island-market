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
  Sparkles,
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
  initialTab = 'feedback',
  onClose,
  onOpenChatWithAdmin,
  onSaveSponsorUrl,
}: CommunitySupportModalProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'feedback' | 'vip'>(initialTab);

  // 許願留言板狀態
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIdea, setNewIdea] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 管理者編輯贊助網址狀態
  const [editUrl, setEditUrl] = useState(sponsorUrl || '');
  const [savingUrl, setSavingUrl] = useState(false);

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

  useEffect(() => {
    fetchRequests();
  }, []);

  // 提交新功能許願
  const handlePostIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('請先登入後再留言許願喔！');
      return;
    }
    if (isBanned) {
      alert('您的帳號已被停權，無法留言。');
      return;
    }
    const cleanText = newIdea.trim();
    if (!cleanText) return;

    const filterCheck = checkSensitiveContent(cleanText);
    if (!filterCheck.isClean) {
      alert(`留言包含禁止字詞「${filterCheck.matchedWord}」，請重新輸入！`);
      return;
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
    } else if (error) {
      alert('送出失敗：' + error.message);
    }
    setSubmitting(false);
  };

  // 按讚附議投票
  const handleUpvote = async (req: any) => {
    if (!currentUser) {
      alert('請先登入才能為喜歡的功能投票喔！');
      return;
    }
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
          .map((r) =>
            r.id === req.id ? { ...r, upvotes: nextCount, upvoted_by: nextVoters } : r
          )
          .sort((a, b) => b.upvotes - a.upvotes)
      );
    }
  };

  // 管理者標記「已採納開發中」
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

  // 刪除許願留言
  const handleDeleteIdea = async (id: string) => {
    if (!confirm('確定要刪除這則功能建議嗎？')) return;
    const { error } = await supabase.from('feature_requests').delete().eq('id', id);
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // 管理者儲存第三方贊助網址
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
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col border border-[#F3E8D2] shadow-2xl overflow-hidden text-[#4A4238]"
      >
        {/* 頂部切換頁籤 */}
        <div className="px-6 py-4 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition ${
                activeTab === 'feedback'
                  ? 'bg-[#F59E0B] text-white shadow-2xs'
                  : 'bg-white border border-[#E6D8C3] text-[#6E6254] hover:text-[#4A4238]'
              }`}
            >
              <Lightbulb className="w-4 h-4" /> 💡 功能許願留言板
            </button>
            <button
              onClick={() => setActiveTab('vip')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition ${
                activeTab === 'vip'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-2xs'
                  : 'bg-white border border-[#E6D8C3] text-[#6E6254] hover:text-[#4A4238]'
              }`}
            >
              <Crown className="w-4 h-4" /> 👑 贊助與 VIP 島主
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 分頁一：功能許願與投票留言板 */}
        {activeTab === 'feedback' ? (
          <div className="p-5 flex-1 overflow-y-auto flex flex-col">
            <div className="mb-4 p-3.5 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] text-xs text-[#6E6254] leading-relaxed">
              ✨ <strong>希望寵物島市集推出什麼新功能呢？</strong>
              歡迎在下方留言許願！也可以幫其他島民的好點子按「👍 附議」，高票建議將會優先排入開發清單喔！
            </div>

            {/* 發布新許願表單 */}
            <form onSubmit={handlePostIdea} className="flex gap-2 mb-5">
              <input
                type="text"
                placeholder={
                  currentUser
                    ? '例如：希望增加卡池標籤篩選、聊天室傳圖片...'
                    : '請先登入後再發表功能建議'
                }
                value={newIdea}
                onChange={(e) => setNewIdea(e.target.value)}
                disabled={!currentUser || isBanned || submitting}
                className="flex-1 px-4 py-2.5 rounded-full bg-[#FFFDF7] border border-[#E6D8C3] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
              <button
                type="submit"
                disabled={!currentUser || isBanned || submitting || !newIdea.trim()}
                className="px-4 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> 許願
              </button>
            </form>

            {/* 留言列表 */}
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              {loading ? (
                <p className="text-center text-xs text-[#8C7B6B] py-8">載入許願留言中...</p>
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
                  const canDelete =
                    isAdmin || (currentUser && currentUser.id === req.user_id);

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
                          <span className="font-bold text-[#4A4238]">{req.author_name}</span>
                          {req.status === 'planned' && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> 站長已採納 / 開發中
                            </span>
                          )}
                          <span className="text-[10px] text-[#A39585]">
                            {new Date(req.created_at).toLocaleDateString('zh-TW')}
                          </span>
                        </div>
                        <p className="text-sm text-[#4A4238] leading-relaxed break-words">
                          {req.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleUpvote(req)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                            hasVoted
                              ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#B45309]'
                              : 'bg-white border-[#E6D8C3] text-[#6E6254] hover:border-[#F59E0B]'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> {req.upvotes || 0}
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => handleTogglePlanned(req)}
                            title="標記/取消已採納"
                            className="p-1.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDeleteIdea(req.id)}
                            title="刪除留言"
                            className="p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500"
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
        ) : (
          /* 分頁二：贊助市集與 VIP 島主開通說明（安全不露個人帳號） */
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> 支持伺服器營運・解鎖大戶賣家便利特權
              </div>
              <h3 className="text-xl font-bold">升級「👑 VIP 島主」加值方案</h3>
              <p className="text-xs text-[#8C7B6B]">
                一般島民永久免費使用所有基本交換與私訊功能；小額贊助維護市集主機，即可獲贈 30 天 VIP 便利特權！
              </p>
            </div>

            {/* 一般島民 vs VIP 島主對照表 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] space-y-2">
                <div className="font-bold text-sm text-[#6E6254]">🌱 一般島民（永久免費）</div>
                <ul className="space-y-1.5 text-[#6E6254]">
                  <li>• 每 24 小時可發布 <strong>1 篇</strong> 交換/許願</li>
                  <li>• 貼文保留 <strong>48 小時</strong></li>
                  <li>• 完整 1v1 即時私訊與共用圖鑑套用</li>
                  <li>• 愛心收藏與評價信用系統</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FEF3C7]/80 to-[#FFFDF7] border-2 border-[#F59E0B] space-y-2">
                <div className="font-bold text-sm text-[#B45309] flex items-center gap-1">
                  <Crown className="w-4 h-4 text-[#F59E0B]" /> 👑 VIP 島主（贊助開通 30 天）
                </div>
                <ul className="space-y-1.5 text-[#4A4238] font-medium">
                  <li>• 每日發文上限提升至 <strong>5 篇</strong>（清倉首選）</li>
                  <li>• 貼文保留時間延長至 <strong>7 天（168 小時）</strong></li>
                  <li>• 全站名片與商品顯示專屬 <strong>👑 VIP 皇冠徽章</strong></li>
                  <li>• 優先支持市集持續開發新功能</li>
                </ul>
              </div>
            </div>

            {/* 安全贊助開通操作區（不公開個人銀行帳號） */}
            <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] space-y-3">
              <div className="font-bold text-sm">📌 如何安全贊助並開通 VIP？</div>
              <ol className="text-xs text-[#6E6254] space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  點擊下方<strong>「前往安全贊助平台」</strong>或<strong>「1v1 私訊站長索取收款碼」</strong>（支援街口 / LINE Pay 等小額贊助）。
                </li>
                <li>
                  贊助時請務必備註您的<strong>「遊戲 ID：{myGameId || '登入後顯示'}」</strong>，並透過 1v1 私訊通知站長。
                </li>
                <li>
                  站長核對後將立即為您的帳號開啟 <strong>30 天 VIP 島主特權</strong>！
                </li>
              </ol>

              <div className="flex flex-wrap gap-2.5 pt-2">
                {sponsorUrl && (
                  <a
                    href={sponsorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[180px] py-2.5 px-4 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
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
                    className="flex-1 min-w-[180px] py-2.5 px-4 rounded-2xl bg-white border-2 border-[#F59E0B] text-[#B45309] hover:bg-[#FEF3C7]/50 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <MessageSquareHeart className="w-4 h-4" /> 1v1 私訊站長索取收款碼
                  </button>
                )}
              </div>

              {/* 管理者專屬：設定第三方贊助連結 */}
              {isAdmin && (
                <form
                  onSubmit={handleUpdateUrl}
                  className="mt-3 pt-3 border-t border-[#F3E8D2] space-y-2"
                >
                  <label className="block text-[11px] font-bold text-[#B45309]">
                    🛡️ 管理者設定：第三方安全贊助網址（例如 Portaly / Buy Me a Coffee，留空則隱藏按鈕）
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://portaly.cc/..."
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-[#E6D8C3] text-xs"
                    />
                    <button
                      type="submit"
                      disabled={savingUrl}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold"
                    >
                      {savingUrl ? '儲存中' : '儲存網址'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* 合規與防詐騙聲明 */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>安全與合規聲明：</strong>
                本方案僅為「網站伺服器維護贊助與系統展示便利功能」，非販售任何遊戲內虛擬道具。為防範第三方詐騙，僅接受玩家本人帳號小額贊助，不明來源款項將原路退回。
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}