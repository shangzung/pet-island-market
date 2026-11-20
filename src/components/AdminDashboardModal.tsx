'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { removeUnusedStorageImages } from '@/lib/storageCleanup';
import {
  X,
  BarChart3,
  Users,
  Repeat,
  HeartHandshake,
  CheckCircle2,
  Flag,
  Trash2,
  Ban,
  Check,
  BookOpenCheck,
  Crown,
  SlidersHorizontal,
} from 'lucide-react';

interface AdminDashboardModalProps {
  usersList: any[];
  items: any[];
  vipEnabled: boolean;
  dailyPostLimit: number;
  onToggleVipSystem: (nextEnabled: boolean) => Promise<void>;
  onUpdateDailyPostLimit: (nextLimit: number) => Promise<void>;
  onClose: () => void;
  onRefreshData: () => void;
}

export function AdminDashboardModal({
  usersList,
  items,
  vipEnabled,
  dailyPostLimit,
  onToggleVipSystem,
  onUpdateDailyPostLimit,
  onClose,
  onRefreshData,
}: AdminDashboardModalProps) {
  const supabase = createClient();
  const [reports, setReports] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingVip, setTogglingVip] = useState(false);
  const [limitInput, setLimitInput] = useState<number>(dailyPostLimit || 5);
  const [savingLimit, setSavingLimit] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    const { data: reportData } = await supabase
      .from('item_reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (reportData) setReports(reportData);

    const { data: catData } = await supabase
      .from('item_catalog')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);
    if (catData) setCatalogItems(catData);

    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSwitchVip = async () => {
    setTogglingVip(true);
    await onToggleVipSystem(!vipEnabled);
    setTogglingVip(false);
  };

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Math.max(1, Math.min(50, Number(limitInput) || 5));
    setSavingLimit(true);
    await onUpdateDailyPostLimit(val);
    setSavingLimit(false);
    alert(`已將一般島民每日發文上限調整為 ${val} 篇！`);
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  const todayUsersCount = usersList.filter(
    (u) => u.created_at && new Date(u.created_at).getTime() >= startOfToday
  ).length;

  const yesterdayUsersCount = usersList.filter((u) => {
    if (!u.created_at) return false;
    const t = new Date(u.created_at).getTime();
    return t >= startOfYesterday && t < startOfToday;
  }).length;

  const todayOffersCount = items.filter(
    (i) => i.post_type !== 'wish' && new Date(i.created_at).getTime() >= startOfToday
  ).length;

  const todayWishesCount = items.filter(
    (i) => i.post_type === 'wish' && new Date(i.created_at).getTime() >= startOfToday
  ).length;

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const completionRate =
    items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handleApproveCatalog = async (catId: string) => {
    const { error } = await supabase
      .from('item_catalog')
      .update({ status: 'approved' })
      .eq('id', catId);
    if (!error) {
      setCatalogItems((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, status: 'approved' } : c))
      );
    }
  };

  const handleDeleteCatalog = async (catItem: any) => {
    if (!confirm(`確定要從圖鑑庫移除「${catItem.item_name}」並刪除實體圖片檔嗎？`)) return;
    await removeUnusedStorageImages(supabase, [catItem.image_url], true);
    await supabase.from('item_catalog').delete().eq('id', catItem.id);
    setCatalogItems((prev) => prev.filter((c) => c.id !== catItem.id));
  };

  const handleDismissReport = async (reportId: string) => {
    await supabase.from('item_reports').update({ status: 'resolved' }).eq('id', reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const handleDeleteReportedItem = async (report: any) => {
    if (!confirm(`確定要刪除被檢舉貼文「${report.item_title}」並清理未入庫圖片嗎？`)) return;
    const targetItem = items.find((i) => i.id === report.item_id);
    if (targetItem) {
      await removeUnusedStorageImages(supabase, targetItem.images, false);
    }
    await supabase.from('items').delete().eq('id', report.item_id);
    await supabase.from('item_reports').update({ status: 'resolved' }).eq('id', report.id);
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    onRefreshData();
  };

  const handleDeleteAndBan = async (report: any) => {
    if (
      !confirm(
        `確定要刪除「${report.item_title}」並永久停權發文者（連同遊戲 ID 加入黑名單）嗎？`
      )
    ) {
      return;
    }

    const targetItem = items.find((i) => i.id === report.item_id);
    if (targetItem) {
      await removeUnusedStorageImages(supabase, targetItem.images, true);
    }
    await supabase.from('items').delete().eq('id', report.item_id);

    if (report.reported_user_id) {
      const targetUser = usersList.find((u) => u.id === report.reported_user_id);
      await supabase
        .from('users')
        .update({ is_banned: true })
        .eq('id', report.reported_user_id);

      if (targetUser?.game_id) {
        await supabase.from('banned_game_ids').upsert({
          game_id: targetUser.game_id,
          reason: `檢舉處分：${report.reason}`,
        });
      }
    }

    await supabase.from('item_reports').update({ status: 'resolved' }).eq('id', report.id);
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    onRefreshData();
  };

  const pendingCatalog = catalogItems.filter((c) => c.status === 'pending');
  const approvedCatalog = catalogItems.filter((c) => c.status === 'approved');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col border border-[#F3E8D2] shadow-2xl overflow-hidden text-[#4A4238]"
      >
        <div className="px-6 py-4 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="font-bold text-lg">📊 站長數據戰情室 & 審核中心</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {/* 系統營運開關與參數設定區 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 👑 全站 VIP 制度總開關 */}
            <div
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                vipEnabled
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-[#FFFDF7] border-[#E6D8C3]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Crown className={`w-4 h-4 ${vipEnabled ? 'text-amber-500' : 'text-[#8C7B6B]'}`} />
                  <span>全站 VIP 制度開關</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      vipEnabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {vipEnabled ? '開放中' : '已關閉'}
                  </span>
                </div>
                <p className="text-xs text-[#6E6254]">
                  關閉時隱藏全站 VIP 入口與徽章；一般玩家已永久享有 7 天貼文保留。
                </p>
              </div>

              <button
                type="button"
                disabled={togglingVip}
                onClick={handleSwitchVip}
                className={`w-full py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 ${
                  vipEnabled
                    ? 'bg-gray-700 hover:bg-gray-800 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                }`}
              >
                {togglingVip
                  ? '切換中...'
                  : vipEnabled
                  ? '關閉 VIP 功能'
                  : '開啟 VIP 功能'}
              </button>
            </div>

            {/* 📝 一般島民每日發文上限設定 */}
            <form
              onSubmit={handleSaveLimit}
              className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3] flex flex-col justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <SlidersHorizontal className="w-4 h-4 text-[#F59E0B]" />
                  <span>一般島民每日發文上限</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    目前：{dailyPostLimit} 篇 / 24h
                  </span>
                </div>
                <p className="text-xs text-[#6E6254]">
                  可隨時調整每位一般玩家 24 小時內可發布的貼文數量（預設 5 篇）。
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={limitInput}
                  onChange={(e) => setLimitInput(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-xl bg-white border border-[#E6D8C3] text-xs font-bold text-center"
                />
                <span className="text-xs text-[#6E6254]">篇 / 日</span>
                <button
                  type="submit"
                  disabled={savingLimit}
                  className="ml-auto px-4 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {savingLimit ? '儲存中...' : '套用上限'}
                </button>
              </div>
            </form>
          </div>

          {/* 數據卡片 4 宮格 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C7B6B] font-bold mb-1">
                <Users className="w-3.5 h-3.5 text-[#F59E0B]" /> 今日新增註冊
              </div>
              <div className="text-2xl font-bold text-[#4A4238]">{todayUsersCount} 人</div>
              <div className="text-[11px] text-[#8C7B6B] mt-1">
                昨日新增：{yesterdayUsersCount} 人（總計 {usersList.length}）
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C7B6B] font-bold mb-1">
                <Repeat className="w-3.5 h-3.5 text-amber-600" /> 今日交換貼文
              </div>
              <div className="text-2xl font-bold text-[#4A4238]">{todayOffersCount} 篇</div>
              <div className="text-[11px] text-[#8C7B6B] mt-1">目前線上活躍交換中</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C7B6B] font-bold mb-1">
                <HeartHandshake className="w-3.5 h-3.5 text-pink-500" /> 今日許願徵求
              </div>
              <div className="text-2xl font-bold text-[#4A4238]">{todayWishesCount} 篇</div>
              <div className="text-[11px] text-[#8C7B6B] mt-1">島民許願池活躍度</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C7B6B] font-bold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 成交率統計
              </div>
              <div className="text-2xl font-bold text-emerald-700">{completionRate}%</div>
              <div className="text-[11px] text-[#8C7B6B] mt-1">
                已換出/徵得：{completedCount} / {items.length}
              </div>
            </div>
          </div>

          {/* 共用圖鑑審核與 Storage 清理中心 */}
          <div>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
              <BookOpenCheck className="w-4 h-4 text-[#F59E0B]" /> 共用圖鑑審核中心（待審核：
              {pendingCatalog.length} 張 ／ 已收錄：{approvedCatalog.length} 張）
            </h3>

            {loading ? (
              <p className="text-xs text-[#8C7B6B] py-4 text-center">載入圖鑑資料中...</p>
            ) : catalogItems.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] text-center text-xs text-[#8C7B6B]">
                目前還沒有玩家上傳新的圖鑑圖片喔！
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {catalogItems.map((c) => (
                  <div
                    key={c.id}
                    className={`p-2.5 rounded-2xl border flex flex-col justify-between text-xs ${
                      c.status === 'pending'
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-[#FFFDF7] border-[#F3E8D2]'
                    }`}
                  >
                    <div>
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-white mb-2 border border-[#F3E8D2]">
                        <img
                          src={c.image_url}
                          alt={c.item_name}
                          className="w-full h-full object-cover"
                        />
                        <span
                          className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'pending'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {c.status === 'pending' ? '待審核' : '已入庫'}
                        </span>
                      </div>
                      <p className="font-bold truncate mb-2">{c.item_name}</p>
                    </div>

                    <div className="flex gap-1">
                      {c.status === 'pending' && (
                        <button
                          onClick={() => handleApproveCatalog(c.id)}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                        >
                          核准
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCatalog(c)}
                        className="flex-1 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px]"
                      >
                        移除並刪圖
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 待處理檢舉集中審核清單 */}
          <div>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-red-500" /> 待處理檢舉案件（{reports.length} 件）
            </h3>

            {reports.length === 0 ? (
              <div className="p-5 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] text-center text-xs text-[#8C7B6B]">
                ✨ 太棒了！目前沒有任何待處理的檢舉案件。
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => {
                  const targetOwner = r.reported_user_id
                    ? usersList.find((u) => u.id === r.reported_user_id)
                    : null;

                  return (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl bg-red-50/50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-[#4A4238]">
                          被檢舉貼文：【{r.item_title}】
                        </div>
                        <div className="text-red-700 font-bold">檢舉原因：{r.reason}</div>
                        <div className="text-[#8C7B6B]">
                          檢舉人：{r.reporter_name} ｜ 發文者：
                          {targetOwner
                            ? `${targetOwner.game_name || targetOwner.nickname} (ID: ${
                                targetOwner.game_id || '無'
                              })`
                            : '未知'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <button
                          onClick={() => handleDismissReport(r.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-[#E6D8C3] hover:bg-gray-50 text-[#6E6254] font-bold"
                        >
                          <Check className="w-3.5 h-3.5" /> 忽略結案
                        </button>
                        <button
                          onClick={() => handleDeleteReportedItem(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 僅刪貼文
                        </button>
                        <button
                          onClick={() => handleDeleteAndBan(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                          <Ban className="w-3.5 h-3.5" /> 刪文+黑名單停權
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}