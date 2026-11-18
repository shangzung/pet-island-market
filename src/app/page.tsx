'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RarityBadge, RarityType } from '@/components/RarityBadge';
import { GameProfileModal } from '@/components/GameProfileModal';
import { DirectChatModal } from '@/components/DirectChatModal';
import {
  Search,
  Plus,
  LogOut,
  User,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  MessageCircle,
  Bell,
  Clock,
  X,
  Send,
  ShieldCheck,
  ZoomIn,
  MessageSquareHeart,
  Users,
  Copy,
  Check,
  CheckCircle2,
  Flag,
  ThumbsUp,
  Store,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'fashion', label: '🧑 HOM' },
  { id: 'island', label: '🏝️ 島嶼裝飾' },
  { id: 'pet', label: '🐾 寵物' },
  { id: 'other', label: '📦 其他' },
];

const RARITIES = ['全部', 'SR', 'R', 'N'];

export default function HomePage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myProfile, setMyProfile] = useState<{
    game_id?: string;
    game_name?: string;
    good_reviews?: number;
  } | null>(null);
  const [needBindProfile, setNeedBindProfile] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRarity, setSelectedRarity] = useState('全部');
  const [showCompleted, setShowCompleted] = useState(false);

  // 彈窗狀態
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showMyMarketModal, setShowMyMarketModal] = useState(false);

  // 我的市集修改名稱狀態
  const [editGameName, setEditGameName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // 複製 ID 與檢舉狀態
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // 留言狀態
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // 通知 & 1v1 聊天室狀態
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(null);
  const [chatContextItem, setChatContextItem] = useState<any | null>(null);
  const [unreadDmCount, setUnreadDmCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    const { data: usersData } = await supabase
      .from('users')
      .select('id, nickname, game_id, game_name, is_admin, good_reviews, created_at')
      .order('created_at', { ascending: false });

    const map: Record<string, any> = {};
    let foundCurrentUserProfile = false;

    if (usersData) {
      setUsersList(usersData);
      usersData.forEach((u: any) => {
        map[u.id] = u;
        if (currentUser && u.id === currentUser.id) {
          foundCurrentUserProfile = true;
          setIsAdmin(u.is_admin === true);
          setMyProfile({
            game_id: u.game_id,
            game_name: u.game_name,
            good_reviews: u.good_reviews || 0,
          });
          setEditGameName(u.game_name || '');
          if (!u.game_id || !u.game_name) {
            setNeedBindProfile(true);
          }
        }
      });
      setUsersMap(map);
    }

    if (currentUser && !foundCurrentUserProfile) {
      setNeedBindProfile(true);
    }

    const { data: itemsData } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    if (itemsData) {
      const now = Date.now();
      const validItems = itemsData.filter((item) => {
        const expireTime = item.expires_at
          ? new Date(item.expires_at).getTime()
          : new Date(item.created_at).getTime() + 48 * 60 * 60 * 1000;
        return expireTime > now;
      });
      setItems(validItems);
    }

    if (currentUser) {
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (notifData) setNotifications(notifData);

      const { count } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);
      setUnreadDmCount(count || 0);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const usersChannel = supabase
      .channel('realtime-users-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          const updatedUser = payload.new as any;
          if (!updatedUser?.id) return;
          setUsersMap((prev) => ({ ...prev, [updatedUser.id]: updatedUser }));
          setUsersList((prev) => {
            const exists = prev.some((u) => u.id === updatedUser.id);
            if (exists) {
              return prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
            }
            return [updatedUser, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const notifChannel = supabase
      .channel(`realtime-notif-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as any, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user]);

  const getDisplayName = (uid: string) => {
    const u = usersMap[uid];
    if (!u) return '島民玩家';
    return u.game_name || u.nickname || '島民玩家';
  };

  const getRemainingHours = (item: any) => {
    const expireTime = item.expires_at
      ? new Date(item.expires_at).getTime()
      : new Date(item.created_at).getTime() + 48 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((expireTime - Date.now()) / (1000 * 60 * 60)));
  };

  // 一鍵複製遊戲 ID
  const handleCopyGameId = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(gameId);
    setCopiedId(gameId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 標記商品為「已換出」或重新開放「交換中」
  const handleToggleItemStatus = async (item: any) => {
    const nextStatus = item.status === 'completed' ? 'active' : 'completed';
    const { error } = await supabase
      .from('items')
      .update({ status: nextStatus })
      .eq('id', item.id);

    if (!error) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
      );
      if (activeItem?.id === item.id) {
        setActiveItem({ ...activeItem, status: nextStatus });
      }
    } else {
      alert('更新狀態失敗：' + error.message);
    }
  };

  // 刪除商品
  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!confirm('確定要刪除這筆道具嗎？刪除後無法復原喔！')) return;

    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (error) {
      alert('刪除失敗：' + error.message);
    } else {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      if (activeItem?.id === itemId) setActiveItem(null);
    }
  };

  // 檢舉商品通知管理員
  const handleReportItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeItem || !reportReason.trim()) return;

    setSubmittingReport(true);
    const reporterName = myProfile?.game_name || getDisplayName(user.id);

    const { error } = await supabase.rpc('report_item_to_admins', {
      p_item_id: activeItem.id,
      p_item_title: activeItem.title,
      p_reporter_name: reporterName,
      p_reason: reportReason.trim(),
    });

    if (!error) {
      alert('檢舉已送出！管理員會收到通知並盡快審核處理。');
      setShowReportBox(false);
      setReportReason('');
    } else {
      alert('檢舉送出失敗：' + error.message);
    }
    setSubmittingReport(false);
  };

  // 我的市集：更新遊戲名稱
  const handleUpdateMyName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editGameName.trim()) return;

    setSavingName(true);
    const cleanName = editGameName.trim();
    const { error } = await supabase
      .from('users')
      .update({ game_name: cleanName, nickname: cleanName })
      .eq('id', user.id);

    if (!error) {
      setMyProfile((prev) => (prev ? { ...prev, game_name: cleanName } : null));
      setUsersMap((prev) => ({
        ...prev,
        [user.id]: { ...prev[user.id], game_name: cleanName, nickname: cleanName },
      }));
      alert('遊戲名稱更新成功！');
    } else {
      alert('更新失敗：' + error.message);
    }
    setSavingName(false);
  };

  const openItemModal = async (item: any) => {
    setActiveItem(item);
    setShowReportBox(false);
    setReportReason('');
    setComments([]);
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('item_id', item.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('請先登入才能留言詢問喔！');
      return;
    }
    if (!newComment.trim() || !activeItem) return;

    setSendingComment(true);
    const content = newComment.trim();
    const senderDisplayName = myProfile?.game_name || getDisplayName(user.id);

    const { data: inserted, error } = await supabase
      .from('comments')
      .insert({
        item_id: activeItem.id,
        user_id: user.id,
        content,
      })
      .select()
      .single();

    if (!error && inserted) {
      setComments((prev) => [...prev, inserted]);
      setNewComment('');

      if (activeItem.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: activeItem.user_id,
          sender_name: senderDisplayName,
          item_id: activeItem.id,
          item_title: activeItem.title,
          message: content,
        });
      }
    } else if (error) {
      alert('留言失敗：' + error.message);
    }
    setSendingComment(false);
  };

  const markNotificationsRead = async () => {
    setShowNotifMenu(!showNotifMenu);
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const filteredItems = items.filter((item) => {
    const isItemCompleted = item.status === 'completed';
    if (!showCompleted && isItemCompleted) return false;

    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchRarity = selectedRarity === '全部' || item.rarity === selectedRarity;
    const keyword = searchQuery.trim().toLowerCase();
    const matchSearch =
      !keyword ||
      (item.title && item.title.toLowerCase().includes(keyword)) ||
      (item.wanted_items && item.wanted_items.toLowerCase().includes(keyword)) ||
      (item.description && item.description.toLowerCase().includes(keyword));
    return matchCategory && matchRarity && matchSearch;
  });

  const myItems = user ? items.filter((i) => i.user_id === user.id) : [];

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#4A4238]">
      {/* 首次登入未綁定遊戲 ID / 遊戲名稱時強制彈出設定視窗 */}
      {user && needBindProfile && (
        <GameProfileModal
          userId={user.id}
          onSuccess={(gId, gName) => {
            setMyProfile({ game_id: gId, game_name: gName, good_reviews: 0 });
            setNeedBindProfile(false);
            fetchData();
          }}
        />
      )}

      {/* 頂部導覽列 */}
      <header className="sticky top-0 z-20 bg-[#FFFDF7]/90 backdrop-blur-md border-b border-[#F3E8D2]">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#F59E0B] flex items-center justify-center text-white text-xl shadow-sm">
                🐾
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight block leading-none">
                  寵物島市集
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-700 font-bold mt-0.5">
                    <ShieldCheck className="w-3 h-3" /> 管理者模式
                  </span>
                )}
              </div>
            </Link>

            {/* 我的市集個人名片膠囊（點擊可管理自己的道具與名稱） */}
            {user && myProfile?.game_name && (
              <button
                onClick={() => setShowMyMarketModal(true)}
                title="點擊打開「我的市集」個人中心"
                className="hidden md:inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-full bg-white border border-[#E6D8C3] hover:border-[#F59E0B] text-xs transition"
              >
                <Store className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="font-bold">{myProfile.game_name}</span>
                <span className="text-[#8C7B6B]">(ID:{myProfile.game_id})</span>
                <span className="text-emerald-700 font-bold">👍{myProfile.good_reviews || 0}</span>
              </button>
            )}
          </div>

          {/* 搜尋框 */}
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="w-4 h-4 text-[#A39585] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋道具名稱、想交換的物品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-[#E6D8C3] text-sm focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          {/* 右側操作按鈕 */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  onClick={() => setShowMyMarketModal(true)}
                  title="我的市集"
                  className="md:hidden p-2.5 rounded-full bg-white border border-[#E6D8C3] text-[#6E6254]"
                >
                  <Store className="w-4 h-4 text-[#F59E0B]" />
                </button>

                <button
                  onClick={() => {
                    setChatTargetUserId(null);
                    setChatContextItem(null);
                    setShowChatModal(true);
                    setUnreadDmCount(0);
                  }}
                  className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#E6D8C3] hover:border-[#F59E0B] text-xs font-bold text-[#4A4238] transition"
                >
                  <MessageSquareHeart className="w-4 h-4 text-[#F59E0B]" />
                  <span className="hidden sm:inline">1v1 私訊</span>
                  {unreadDmCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">
                      {unreadDmCount}
                    </span>
                  )}
                </button>

                {/* 通知鈴鐺 */}
                <div className="relative">
                  <button
                    onClick={markNotificationsRead}
                    title="通知中心"
                    className="relative p-2.5 rounded-full bg-white border border-[#E6D8C3] text-[#6E6254] hover:border-[#F59E0B] transition"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifMenu && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-lg border border-[#F3E8D2] p-3 z-30">
                      <div className="text-xs font-bold text-[#8C7B6B] pb-2 mb-2 border-b border-[#F3E8D2]">
                        最新通知中心
                      </div>
                      {notifications.length === 0 ? (
                        <p className="text-xs text-[#A39585] py-4 text-center">
                          目前還沒有新的通知喔！
                        </p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                if (n.item_id) {
                                  const target = items.find((i) => i.id === n.item_id);
                                  if (target) openItemModal(target);
                                } else if (isAdmin) {
                                  setShowUsersModal(true);
                                }
                                setShowNotifMenu(false);
                              }}
                              className="p-2.5 rounded-xl bg-[#FFFDF7] hover:bg-[#FEF3C7]/50 cursor-pointer border border-[#F3E8D2] text-xs"
                            >
                              <p className="font-bold text-[#4A4238]">
                                {n.item_id && !n.item_title.startsWith('🚩')
                                  ? `${n.sender_name} 在「${n.item_title}」留言：`
                                  : n.item_title}
                              </p>
                              <p className="text-[#6E6254] line-clamp-2 mt-0.5">{n.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href="/items/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> 發布
                </Link>
                <button
                  onClick={handleLogout}
                  title="登出"
                  className="p-2.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238] transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold shadow-sm transition"
              >
                <User className="w-4 h-4" /> 登入 / 註冊
              </Link>
            )}
          </div>
        </div>

        {/* 分類標籤列 */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-[#F59E0B] text-white shadow-sm'
                  : 'bg-white border border-[#E6D8C3] text-[#6E6254] hover:border-[#F59E0B]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* 主內容區 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[#8C7B6B]">稀有度：</span>
            {RARITIES.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRarity(r)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  selectedRarity === r
                    ? 'bg-[#2C2520] text-white'
                    : 'bg-white border border-[#E6D8C3] text-[#6E6254] hover:border-[#2C2520]'
                }`}
              >
                {r}
              </button>
            ))}

            {/* 顯示已換出開關 */}
            <label className="ml-2 inline-flex items-center gap-1.5 text-xs text-[#6E6254] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded accent-[#F59E0B]"
              />
              顯示已換出商品
            </label>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => isAdmin && setShowUsersModal(true)}
              title={isAdmin ? '點擊查看完整島民註冊名冊' : '寵物島市集總註冊人數'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                isAdmin
                  ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#B45309] hover:bg-[#FDE68A] cursor-pointer'
                  : 'bg-white border-[#E6D8C3] text-[#6E6254] cursor-default'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#F59E0B]" />
              已註冊島民：{usersList.length} 人
              {isAdmin && <span className="underline ml-1">查看名單</span>}
            </button>

            <span className="text-xs sm:text-sm text-[#8C7B6B]">
              共 {filteredItems.length} 件道具
            </span>
          </div>
        </div>

        {/* 商品卡片網格 */}
        {loading ? (
          <div className="text-center py-20 text-[#8C7B6B]">載入道具中...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#F3E8D2] py-16 px-4 text-center">
            <Sparkles className="w-10 h-10 text-[#F59E0B] mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-1">目前還沒有符合條件的道具喔！</h2>
            <p className="text-sm text-[#8C7B6B] mb-5">成為第一位上架商品的島民吧 ✨</p>
            <Link
              href="/items/new"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> 立即發布第一件道具
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredItems.map((item) => {
              const coverImg =
                Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
              const sellerInfo = usersMap[item.user_id];
              const sellerName = getDisplayName(item.user_id);
              const canDelete = isAdmin || (user && user.id === item.user_id);
              const hoursLeft = getRemainingHours(item);
              const isCompleted = item.status === 'completed';

              return (
                <div
                  key={item.id}
                  onClick={() => openItemModal(item)}
                  className={`cursor-pointer bg-white rounded-3xl border border-[#F3E8D2] overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition flex flex-col ${
                    isCompleted ? 'opacity-75' : ''
                  }`}
                >
                  <div className="relative aspect-square bg-[#FDF8EC] flex items-center justify-center overflow-hidden">
                    {coverImg ? (
                      <img src={coverImg} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-[#C4B5A0]">
                        <ImageIcon className="w-10 h-10 mb-1" />
                        <span className="text-xs">無圖片</span>
                      </div>
                    )}

                    {/* 已換出半透明印章 */}
                    {isCompleted && (
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                        <span className="px-4 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-sm border-2 border-white shadow-lg -rotate-6">
                          ✅ 已換出
                        </span>
                      </div>
                    )}

                    {item.rarity && (
                      <div className="absolute top-3 left-3">
                        <RarityBadge rarity={item.rarity as RarityType} />
                      </div>
                    )}

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="px-2 py-1 rounded-full bg-black/55 text-white text-[10px] font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 剩 {hoursLeft}h
                      </span>
                      {canDelete && (
                        <button
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          title="刪除道具"
                          className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-sm transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base mb-1.5 line-clamp-1">{item.title}</h3>
                      <div className="bg-[#FFFDF7] border border-[#F3E8D2] rounded-2xl p-2.5 mb-3">
                        <span className="text-[11px] font-semibold text-[#D97706] block mb-0.5">
                          想換物品：
                        </span>
                        <p className="text-xs text-[#4A4238] line-clamp-2">
                          {item.wanted_items || '歡迎留言報價'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#F7EFE0] text-xs text-[#8C7B6B]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate max-w-[90px] font-medium">{sellerName}</span>
                        <span className="text-[10px] text-emerald-700 font-bold shrink-0">
                          👍{sellerInfo?.good_reviews || 0}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[#D97706] font-medium shrink-0">
                        <MessageCircle className="w-3.5 h-3.5" /> 詢問 / 看圖
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 我的市集（個人中心彈窗） */}
      {user && showMyMarketModal && (
        <div
          onClick={() => setShowMyMarketModal(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full max-h-[88vh] flex flex-col border border-[#F3E8D2] shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#F59E0B]" />
                <h2 className="font-bold text-lg">我的市集個人中心</h2>
              </div>
              <button
                onClick={() => setShowMyMarketModal(false)}
                className="p-1.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {/* 個人名片與修改名稱 */}
              <div className="bg-[#FFFDF7] border border-[#F3E8D2] rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs text-[#8C7B6B] mb-3">
                  <span>
                    遊戲 ID：<strong className="text-[#4A4238] font-mono">{myProfile?.game_id}</strong>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    👍 累計交換好評：{myProfile?.good_reviews || 0} 次
                  </span>
                </div>

                <form onSubmit={handleUpdateMyName} className="flex gap-2">
                  <input
                    type="text"
                    value={editGameName}
                    onChange={(e) => setEditGameName(e.target.value)}
                    placeholder="修改遊戲名稱..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#E6D8C3] text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                  <button
                    type="submit"
                    disabled={savingName || !editGameName.trim()}
                    className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold disabled:opacity-50"
                  >
                    {savingName ? '儲存中...' : '更新遊戲名稱'}
                  </button>
                </form>
              </div>

              {/* 我發布的道具管理 */}
              <div>
                <h3 className="font-bold text-sm mb-2.5">
                  我上架的道具（共 {myItems.length} 件）
                </h3>
                {myItems.length === 0 ? (
                  <p className="text-xs text-[#A39585] text-center py-6 bg-[#FFFDF7] rounded-2xl border border-[#F3E8D2]">
                    你目前還沒有上架中的道具喔！
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {myItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                item.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status === 'completed' ? '已換出' : '交換中'}
                            </span>
                            <span className="font-bold text-sm truncate">{item.title}</span>
                          </div>
                          <p className="text-[11px] text-[#8C7B6B] truncate mt-0.5">
                            許願：{item.wanted_items}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleToggleItemStatus(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E6D8C3] hover:border-[#F59E0B] text-xs font-bold text-[#4A4238]"
                          >
                            {item.status === 'completed' ? '重新上架' : '標記已換出'}
                          </button>
                          <button
                            onClick={(e) => handleDeleteItem(e, item.id)}
                            className="p-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 管理者專屬：即時註冊島民名冊視窗 */}
      {isAdmin && showUsersModal && (
        <div
          onClick={() => setShowUsersModal(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col border border-[#F3E8D2] shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#F59E0B]" />
                <h2 className="font-bold text-lg">
                  已註冊島民名冊（共 {usersList.length} 人）
                </h2>
              </div>
              <button
                onClick={() => setShowUsersModal(false)}
                className="p-1.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5">
              {usersList.map((u, index) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl bg-[#FFFDF7] border border-[#F3E8D2] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-bold">
                        #{usersList.length - index}
                      </span>
                      <span className="font-bold text-sm text-[#4A4238]">
                        {u.game_name || u.nickname || '未設定名稱'}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-bold">
                        👍 {u.good_reviews || 0}
                      </span>
                      {u.is_admin && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                          管理者
                        </span>
                      )}
                    </div>
                    <div className="text-[#8C7B6B] mt-1">
                      遊戲 ID：
                      <span className="font-mono font-bold text-[#4A4238]">
                        {u.game_id || '尚未綁定'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-[#A39585] shrink-0">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleString('zh-TW', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 點擊卡片彈出的詳情與留言板視窗 */}
      {activeItem && (
        <div
          onClick={() => setActiveItem(null)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#F3E8D2] shadow-xl p-6"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  {activeItem.rarity && <RarityBadge rarity={activeItem.rarity as RarityType} />}
                  <span className="text-xs font-bold text-[#4A4238]">
                    {getDisplayName(activeItem.user_id)}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-0.5">
                    <ThumbsUp className="w-3 h-3" /> {usersMap[activeItem.user_id]?.good_reviews || 0}
                  </span>
                </div>

                {/* 一鍵複製賣家遊戲 ID 列 */}
                {usersMap[activeItem.user_id]?.game_id && (
                  <div className="flex items-center gap-1.5 mt-1 mb-1">
                    <span className="text-xs text-[#8C7B6B]">
                      遊戲 ID：<strong className="font-mono text-[#4A4238]">{usersMap[activeItem.user_id].game_id}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleCopyGameId(e, usersMap[activeItem.user_id].game_id)
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFFDF7] border border-[#E6D8C3] hover:border-[#F59E0B] text-[11px] font-bold text-[#6E6254] transition"
                    >
                      {copiedId === usersMap[activeItem.user_id].game_id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> 已複製
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> 複製 ID
                        </>
                      )}
                    </button>
                  </div>
                )}

                <h2 className="text-xl font-bold mt-1">{activeItem.title}</h2>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {/* 賣家自己可標記「已換出」 */}
                {user && user.id === activeItem.user_id && (
                  <button
                    onClick={() => handleToggleItemStatus(activeItem)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                      activeItem.status === 'completed'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {activeItem.status === 'completed' ? '重新上架' : '標記已換出'}
                  </button>
                )}

                {/* 買家可點「1v1 私訊」並自動帶入此商品卡片 */}
                {user && activeItem.user_id !== user.id && (
                  <button
                    onClick={() => {
                      const targetId = activeItem.user_id;
                      const itemContext = {
                        id: activeItem.id,
                        title: activeItem.title,
                        wanted_items: activeItem.wanted_items,
                        image:
                          Array.isArray(activeItem.images) && activeItem.images.length > 0
                            ? activeItem.images[0]
                            : undefined,
                      };
                      setActiveItem(null);
                      setChatTargetUserId(targetId);
                      setChatContextItem(itemContext);
                      setShowChatModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] text-xs font-bold transition"
                  >
                    <MessageSquareHeart className="w-3.5 h-3.5" /> 1v1 私訊
                  </button>
                )}

                {(isAdmin || (user && user.id === activeItem.user_id)) && (
                  <button
                    onClick={(e) => handleDeleteItem(e, activeItem.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 刪除
                  </button>
                )}

                <button
                  onClick={() => setActiveItem(null)}
                  className="p-1.5 rounded-full bg-[#FFFDF7] border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {Array.isArray(activeItem.images) && activeItem.images.length > 0 && (
              <div className="mb-4">
                <div className="flex gap-2.5 overflow-x-auto pb-2">
                  {activeItem.images.map((img: string, i: number) => (
                    <div
                      key={i}
                      onClick={() => setZoomedImage(img)}
                      className="relative group cursor-zoom-in w-44 h-44 rounded-2xl border border-[#F3E8D2] overflow-hidden shrink-0"
                    >
                      <img src={img} alt="item" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 transition">
                          <ZoomIn className="w-3.5 h-3.5" /> 點擊放大
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#8C7B6B] mt-1">💡 點擊圖片可放大檢視完整細節</p>
              </div>
            )}

            <div className="bg-[#FFFDF7] border border-[#F3E8D2] rounded-2xl p-3.5 mb-4 space-y-2 text-sm">
              <div>
                <span className="font-bold text-[#D97706]">想交換物品：</span>
                <span>{activeItem.wanted_items}</span>
              </div>
              {activeItem.description && (
                <div>
                  <span className="font-bold text-[#8C7B6B]">補充說明：</span>
                  <span>{activeItem.description}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[#8C7B6B]">
                  ⏳ 距離自動下架還有約 {getRemainingHours(activeItem)} 小時
                </span>

                {/* 異常檢舉按鈕 */}
                {user && user.id !== activeItem.user_id && (
                  <button
                    type="button"
                    onClick={() => setShowReportBox(!showReportBox)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#A39585] hover:text-red-500 transition"
                  >
                    <Flag className="w-3 h-3" /> 檢舉此道具
                  </button>
                )}
              </div>

              {/* 檢舉輸入框 */}
              {showReportBox && (
                <form
                  onSubmit={handleReportItem}
                  className="mt-2 pt-2.5 border-t border-[#F3E8D2] flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="請簡述異常原因（例如：非遊戲道具、疑似詐騙...）"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs focus:outline-none focus:border-red-400"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-50"
                  >
                    送出檢舉
                  </button>
                </form>
              )}
            </div>

            {/* 公開留言詢問區塊 */}
            <div className="border-t border-[#F3E8D2] pt-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-[#F59E0B]" /> 公開留言詢問 ({comments.length})
              </h3>

              <div className="space-y-2.5 max-h-48 overflow-y-auto mb-4 pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-[#A39585] text-center py-4">
                    還沒有人留言，也可以直接點右上角「1v1 私訊」找賣家洽談喔！
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-[#FFFDF7] border border-[#F3E8D2] rounded-2xl p-3 text-xs"
                    >
                      <div className="flex justify-between text-[#8C7B6B] mb-1">
                        <span className="font-bold text-[#4A4238]">
                          {getDisplayName(c.user_id)}
                        </span>
                        <span>
                          {new Date(c.created_at).toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[#4A4238]">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder={user ? '輸入想交換的道具或留言...' : '請先登入後再留言詢問'}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user || sendingComment}
                  className="flex-1 px-4 py-2.5 rounded-full bg-[#FFFDF7] border border-[#E6D8C3] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
                <button
                  type="submit"
                  disabled={!user || sendingComment || !newComment.trim()}
                  className="px-4 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> 送出
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 1 對 1 聊天室視窗 */}
      {user && showChatModal && (
        <DirectChatModal
          currentUserId={user.id}
          initialTargetUserId={chatTargetUserId}
          initialContextItem={chatContextItem}
          onClose={() => setShowChatModal(false)}
          onReviewSuccess={fetchData}
        />
      )}

      {/* 全螢幕圖片放大燈箱 */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomedImage}
            alt="放大檢視"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}