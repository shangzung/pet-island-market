'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
} from 'lucide-react';

interface AdminDashboardModalProps {
  usersList: any[];
  items: any[];
  onClose: () => void;
  onRefreshData: () => void;
}

export function AdminDashboardModal({
  usersList,
  items,
  onClose,
  onRefreshData,
}: AdminDashboardModalProps) {
  const supabase = createClient();
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReports = async () => {
    setLoadingReports(true);
    const { data } = await supabase
      .from('item_reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setReports(data);
    setLoadingReports(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // 計算今日與昨日時間區間
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

  // 忽略 / 結案檢舉
  const handleDismissReport = async (reportId: string) => {
    await supabase.from('item_reports').update({ status: 'resolved' }).eq('id', reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  // 一鍵刪除被檢舉貼文
  const handleDeleteReportedItem = async (report: any) => {
    if (!confirm(`確定要刪除被檢舉貼文「${report.item_title}」嗎？`)) return;
    await supabase.from('items').delete().eq('id', report.item_id);
    await supabase.from('item_reports').update({ status: 'resolved' }).eq('id', report.id);
    setReports((prev) => prev.filter((r) => r.id !== report.id));
    onRefreshData();
  };

  // 一鍵刪除貼文 + 永久停權該帳號與遊戲 ID
  const handleDeleteAndBan = async (report: any) => {
    if (
      !confirm(
        `確定要刪除「${report.item_title}」並永久停權發文者（連同遊戲 ID 加入黑名單）嗎？`
      )
    ) {
      return;
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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col border border-[#F3E8D2] shadow-2xl overflow-hidden text-[#4A4238]"
      >
        {/* 頂部標題 */}
        <div className="px-6 py-4 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="font-bold text-lg">📊 站長數據戰情室 & 檢舉審核中心</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
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
              <div className="text-[11px] text-[#8C7B6B] mt-1">
                目前線上活躍交換中
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C7B6B] font-bold mb-1">
                <HeartHandshake className="w-3.5 h-3.5 text-pink-500" /> 今日許願徵求
              </div>
              <div className="text-2xl font-bold text-[#4A4238]">{todayWishesCount} 篇</div>
              <div className="text-[11px] text-[#8C7B6B] mt-1">
                島民許願池活躍度
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2]">
              <div className="flex items-center gap-1.5 text-xs text-[#8C7B6B] font-bold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 48h 內成交率
              </div>
              <div className="text-2xl font-bold text-emerald-700">{completionRate}%</div>
              <div className="text-[11px] text-[#8C7B6B] mt-1">
                已換出/徵得：{completedCount} / {items.length}
              </div>
            </div>
          </div>

          {/* 待處理檢舉集中審核清單 */}
          <div>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-red-500" /> 待處理檢舉案件（{reports.length} 件）
            </h3>

            {loadingReports ? (
              <p className="text-xs text-[#8C7B6B] py-6 text-center">載入檢舉紀錄中...</p>
            ) : reports.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] text-center text-xs text-[#8C7B6B]">
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