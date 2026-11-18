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
  const [myProfile, setMyProfile] = useState<{ game_id?: string; game_name?: string } | null>(null);
  const [needBindProfile, setNeedBindProfile] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRarity, setSelectedRarity] = useState('全部');

  // 留言彈窗與圖片放大狀態
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // 通知鈴鐺 & 1v1 聊天室狀態
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(null);
  const [unreadDmCount, setUnreadDmCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    const { data: usersData } = await supabase
      .from('users')
      .select('id, nickname, game_id, game_name, is_admin');

    const map: Record<string, any> = {};
    let foundCurrentUserProfile = false;

    if (usersData) {
      usersData.forEach((u: any) => {
        map[u.id] = u;
        if (currentUser && u.id === currentUser.id) {
          foundCurrentUserProfile = true;
          setIsAdmin(u.is_admin === true);
          setMyProfile({ game_id: u.game_id, game_name: u.game_name });
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
        return expireTime > now && (!item.status || item.status === 'active');
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
  }, []);

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

  const openItemModal = async (item: any) => {
    setActiveItem(item);
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

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#4A4238]">
      {/* 首次登入未綁定遊戲 ID / 遊戲名稱時強制彈出設定視窗 */}
      {user && needBindProfile && (
        <GameProfileModal
          userId={user.id}
          onSuccess={(gId, gName) => {
            setMyProfile({ game_id: gId, game_name: gName });
            setNeedBindProfile(false);
            fetchData();
          }}
        />
      )}

      {/* 頂部導覽列 */}
      <header className="sticky top-0 z-20 bg-[#FFFDF7]/90 backdrop-blur-md border-b border-[#F3E8D2]">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F59E0B] flex items-center justify-center text-white text-xl shadow-sm">
              🐾
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight block leading-none">
                寵物島市集
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-700 font-bold">
                    <ShieldCheck className="w-3 h-3" /> 管理者
                  </span>
                )}
                {myProfile?.game_name && (
                  <span className="text-[11px] text-[#8C7B6B]">
                    {myProfile.game_name} (ID: {myProfile.game_id})
                  </span>
                )}
              </div>
            </div>
          </Link>

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
                {/* 1v1 私訊聊天室按鈕 */}
                <button
                  onClick={() => {
                    setChatTargetUserId(null);
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

                {/* 留言通知鈴鐺 */}
                <div className="relative">
                  <button
                    onClick={markNotificationsRead}
                    title="留言通知"
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
                        最新留言通知
                      </div>
                      {notifications.length === 0 ? (
                        <p className="text-xs text-[#A39585] py-4 text-center">
                          目前還沒有新的留言通知喔！
                        </p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                const target = items.find((i) => i.id === n.item_id);
                                if (target) openItemModal(target);
                                setShowNotifMenu(false);
                              }}
                              className="p-2.5 rounded-xl bg-[#FFFDF7] hover:bg-[#FEF3C7]/50 cursor-pointer border border-[#F3E8D2] text-xs"
                            >
                              <p className="font-bold text-[#4A4238]">
                                {n.sender_name} 在「{n.item_title}」留言：
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
          </div>
          <span className="text-sm text-[#8C7B6B]">
            共 {filteredItems.length} 件交換中道具（每筆上架保留 48 小時）
          </span>
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

              return (
                <div
                  key={item.id}
                  onClick={() => openItemModal(item)}
                  className="cursor-pointer bg-white rounded-3xl border border-[#F3E8D2] overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition flex flex-col"
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
                      <span className="truncate max-w-[120px]" title={`ID: ${sellerInfo?.game_id || ''}`}>
                        {sellerName}
                      </span>
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
                  <span className="text-xs text-[#8C7B6B]">
                    發布者：{getDisplayName(activeItem.user_id)}
                    {usersMap[activeItem.user_id]?.game_id &&
                      ` (ID: ${usersMap[activeItem.user_id].game_id})`}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{activeItem.title}</h2>
              </div>

              <div className="flex items-center gap-2">
                {user && activeItem.user_id !== user.id && (
                  <button
                    onClick={() => {
                      const targetId = activeItem.user_id;
                      setActiveItem(null);
                      setChatTargetUserId(targetId);
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
              <div className="text-xs text-[#8C7B6B] pt-1">
                ⏳ 距離自動下架還有約 {getRemainingHours(activeItem)} 小時
              </div>
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
          onClose={() => setShowChatModal(false)}
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