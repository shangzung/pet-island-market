'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RarityBadge, RarityType } from '@/components/RarityBadge';
import { GameProfileModal } from '@/components/GameProfileModal';
import { DirectChatModal } from '@/components/DirectChatModal';
import { AdminDashboardModal } from '@/components/AdminDashboardModal';
import { CommunitySupportModal } from '@/components/CommunitySupportModal';
import { checkSensitiveContent } from '@/lib/contentFilter';
import { removeUnusedStorageImages } from '@/lib/storageCleanup';
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
  Heart,
  Megaphone,
  Repeat,
  HeartHandshake,
  Ban,
  AlertTriangle,
  Flame,
  BarChart3,
  PartyPopper,
  Lightbulb,
  Crown,
  ArrowUpDown,
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
  const [isBanned, setIsBanned] = useState(false);
  const [myProfile, setMyProfile] = useState<{
    game_id?: string;
    game_name?: string;
    good_reviews?: number;
    vip_expires_at?: string | null;
  } | null>(null);
  const [needBindProfile, setNeedBindProfile] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // 看板切換、篩選與排序
  const [activeBoard, setActiveBoard] = useState<'offer' | 'wish'>('offer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRarity, setSelectedRarity] = useState('全部');
  const [sortBy, setSortBy] = useState<'vip_first' | 'newest' | 'reviews' | 'expiring'>('vip_first');
  const [showCompleted, setShowCompleted] = useState(false);

  // 成交快報輪播索引
  const [tickerIndex, setTickerIndex] = useState(0);

  // 全站公告與贊助連結狀態
  const [announcement, setAnnouncement] = useState<{
    content: string;
    is_active: boolean;
    sponsor_url?: string;
  }>({
    content: '',
    is_active: false,
    sponsor_url: '',
  });
  const [showEditAnnounce, setShowEditAnnounce] = useState(false);
  const [editAnnounceText, setEditAnnounceText] = useState('');
  const [editAnnounceActive, setEditAnnounceActive] = useState(true);

  // 彈窗狀態
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showMyMarketModal, setShowMyMarketModal] = useState(false);
  const [myMarketTab, setMyMarketTab] = useState<'my_items' | 'favorites'>('my_items');

  // 功能許願與贊助 VIP 彈窗
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportModalTab, setSupportModalTab] = useState<'feedback' | 'vip'>('vip');

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

  const isUserVip = (u: any) => {
    if (!u?.vip_expires_at) return false;
    return new Date(u.vip_expires_at).getTime() > Date.now();
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    const { data: annData } = await supabase
      .from('site_announcements')
      .select('content, is_active, sponsor_url')
      .eq('id', 1)
      .maybeSingle();
    if (annData) {
      setAnnouncement(annData);
      setEditAnnounceText(annData.content);
      setEditAnnounceActive(annData.is_active);
    }

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: searchLogsData } = await supabase
      .from('search_logs')
      .select('keyword')
      .gte('created_at', fortyEightHoursAgo)
      .limit(200);
    if (searchLogsData) {
      setRecentSearches(searchLogsData.map((s) => s.keyword));
    }

    const { data: usersData } = await supabase
      .from('users')
      .select(
        'id, nickname, game_id, game_name, is_admin, is_banned, vip_expires_at, good_reviews, created_at'
      )
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
          setIsBanned(u.is_banned === true);
          setMyProfile({
            game_id: u.game_id,
            game_name: u.game_name,
            good_reviews: u.good_reviews || 0,
            vip_expires_at: u.vip_expires_at,
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
      const { data: favData } = await supabase
        .from('favorites')
        .select('item_id')
        .eq('user_id', currentUser.id);
      if (favData) {
        setFavoriteIds(favData.map((f) => f.item_id));
      }

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

  const trendingKeywords = useMemo(() => {
    const freq: Record<string, number> = {};

    items.forEach((item) => {
      if (item.post_type === 'wish' && item.title) {
        const cleanTitle = item.title.replace(/急徵|徵求|徵|！|!/g, '').trim();
        if (cleanTitle.length >= 2 && cleanTitle.length <= 12) {
          freq[cleanTitle] = (freq[cleanTitle] || 0) + 2;
        }
      }
    });

    recentSearches.forEach((kw) => {
      const cleanKw = kw.trim();
      if (cleanKw.length >= 2 && cleanKw.length <= 12) {
        freq[cleanKw] = (freq[cleanKw] || 0) + 1;
      }
    });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }, [items, recentSearches]);

  const completedTickers = useMemo(() => {
    return items.filter((i) => i.status === 'completed').slice(0, 10);
  }, [items]);

  useEffect(() => {
    if (completedTickers.length <= 1) return;
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % completedTickers.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [completedTickers.length]);

  useEffect(() => {
    const kw = searchQuery.trim();
    if (kw.length < 2 || kw.length > 15) return;
    const timer = setTimeout(() => {
      supabase.from('search_logs').insert({ keyword: kw }).then(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleToggleFavorite = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!user) {
      alert('請先登入才能使用愛心收藏功能喔！');
      return;
    }

    const isFav = favoriteIds.includes(itemId);
    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);
      if (!error) {
        setFavoriteIds((prev) => prev.filter((id) => id !== itemId));
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, item_id: itemId });
      if (!error) {
        setFavoriteIds((prev) => [...prev, itemId]);
      }
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('site_announcements')
      .upsert({
        id: 1,
        content: editAnnounceText.trim(),
        is_active: editAnnounceActive,
        updated_at: new Date().toISOString(),
      });

    if (!error) {
      setAnnouncement((prev) => ({
        ...prev,
        content: editAnnounceText.trim(),
        is_active: editAnnounceActive,
      }));
      setShowEditAnnounce(false);
    } else {
      alert('公告儲存失敗：' + error.message);
    }
  };

  const handleSaveSponsorUrl = async (newUrl: string) => {
    const { error } = await supabase
      .from('site_announcements')
      .upsert({
        id: 1,
        content: announcement.content || '🎉 歡迎來到寵物島市集！',
        is_active: announcement.is_active,
        sponsor_url: newUrl,
        updated_at: new Date().toISOString(),
      });
    if (!error) {
      setAnnouncement((prev) => ({ ...prev, sponsor_url: newUrl }));
    }
  };

  const handleToggleVipUser = async (targetUser: any) => {
    const currentlyVip = isUserVip(targetUser);
    const nextVipExpires = currentlyVip
      ? null
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const msg = currentlyVip
      ? `確定要取消「${targetUser.game_name || targetUser.nickname}」的 VIP 資格嗎？`
      : `確定要為「${targetUser.game_name || targetUser.nickname}」開通 30 天 👑 VIP 島主特權嗎？`;
    if (!confirm(msg)) return;

    const { error } = await supabase
      .from('users')
      .update({ vip_expires_at: nextVipExpires })
      .eq('id', targetUser.id);

    if (!error) {
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, vip_expires_at: nextVipExpires } : u
        )
      );
      setUsersMap((prev) => ({
        ...prev,
        [targetUser.id]: { ...prev[targetUser.id], vip_expires_at: nextVipExpires },
      }));
    } else {
      alert('設定 VIP 失敗：' + error.message);
    }
  };

  const handleToggleBanUser = async (targetUser: any) => {
    const nextBanned = !targetUser.is_banned;
    const actionText = nextBanned
      ? '停權（並將其遊戲 ID 加入跨帳號永久黑名單）'
      : '解除停權（並移出遊戲 ID 黑名單）';
    if (!confirm(`確定要將「${targetUser.game_name || targetUser.nickname}」${actionText}嗎？`)) {
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ is_banned: nextBanned })
      .eq('id', targetUser.id);

    if (!error) {
      if (targetUser.game_id) {
        if (nextBanned) {
          await supabase.from('banned_game_ids').upsert({
            game_id: targetUser.game_id,
            reason: '管理員手動停權封鎖',
          });
        } else {
          await supabase.from('banned_game_ids').delete().eq('game_id', targetUser.game_id);
        }
      }

      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_banned: nextBanned } : u))
      );
      setUsersMap((prev) => ({
        ...prev,
        [targetUser.id]: { ...prev[targetUser.id], is_banned: nextBanned },
      }));
    } else {
      alert('操作失敗：' + error.message);
    }
  };

  const handleCopyGameId = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(gameId);
    setCopiedId(gameId);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!confirm('確定要刪除這筆貼文嗎？刪除後無法復原喔！')) return;

    const targetItem = items.find((i) => i.id === itemId);
    if (targetItem) {
      await removeUnusedStorageImages(supabase, targetItem.images, false);
    }

    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (error) {
      alert('刪除失敗：' + error.message);
    } else {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      if (activeItem?.id === itemId) setActiveItem(null);
    }
  };

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
      alert('檢舉已送出！管理員會收到通知並進入戰情室審核處理。');
      setShowReportBox(false);
      setReportReason('');
    } else {
      alert('檢舉送出失敗：' + error.message);
    }
    setSubmittingReport(false);
  };

  const handleUpdateMyName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editGameName.trim()) return;

    const cleanName = editGameName.trim();
    const filterResult = checkSensitiveContent(cleanName);
    if (!filterResult.isClean) {
      alert(`遊戲名稱包含禁止字詞「${filterResult.matchedWord}」，請重新輸入！`);
      return;
    }

    setSavingName(true);
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
    if (isBanned) {
      alert('您的帳號已被停權，無法留言。');
      return;
    }
    if (!newComment.trim() || !activeItem) return;

    const content = newComment.trim();
    const filterResult = checkSensitiveContent(content);
    if (!filterResult.isClean) {
      alert(
        `⚠️ 安全系統攔截：留言包含禁止字詞「${filterResult.matchedWord}」。本平台嚴禁現金買賣或私下金錢交易！`
      );
      return;
    }

    setSendingComment(true);
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

  // 篩選 + 排序（支援 VIP 優先置頂曝光）
  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
      const itemPostType = item.post_type === 'wish' ? 'wish' : 'offer';
      if (itemPostType !== activeBoard) return false;

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

    return [...list].sort((a, b) => {
      if (sortBy === 'vip_first') {
        const aVip = isUserVip(usersMap[a.user_id]) ? 1 : 0;
        const bVip = isUserVip(usersMap[b.user_id]) ? 1 : 0;
        if (bVip !== aVip) return bVip - aVip;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'reviews') {
        const aRev = usersMap[a.user_id]?.good_reviews || 0;
        const bRev = usersMap[b.user_id]?.good_reviews || 0;
        return bRev - aRev;
      }
      if (sortBy === 'expiring') {
        return getRemainingHours(a) - getRemainingHours(b);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, activeBoard, showCompleted, selectedCategory, selectedRarity, searchQuery, sortBy, usersMap]);

  const myItems = user ? items.filter((i) => i.user_id === user.id) : [];
  const myFavoriteItems = items.filter((i) => favoriteIds.includes(i.id));
  const firstAdminUser = usersList.find((u) => u.is_admin);

  return (
    <div className="min-h-dvh bg-[#FFFDF7] text-[#4A4238] flex flex-col overflow-x-hidden">
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

      {/* 全站公告橫幅 */}
      {(announcement.is_active || isAdmin) && (
        <div className="bg-[#FEF3C7] border-b border-[#F59E0B]/30 px-3 sm:px-4 py-1.5 landscape:py-1 text-xs text-[#92400E]">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Megaphone className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              <span className="font-medium truncate">
                {announcement.is_active
                  ? announcement.content
                  : '（目前全站公告已隱藏，點擊右側可重新開啟）'}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowEditAnnounce(!showEditAnnounce)}
                className="px-2.5 py-0.5 rounded-full bg-white/80 hover:bg-white border border-[#F59E0B]/40 text-[#B45309] font-bold whitespace-nowrap shrink-0"
              >
                編輯公告
              </button>
            )}
          </div>

          {isAdmin && showEditAnnounce && (
            <form
              onSubmit={handleSaveAnnouncement}
              className="max-w-6xl mx-auto mt-2 pt-2 border-t border-[#F59E0B]/20 flex flex-wrap items-center gap-2"
            >
              <input
                type="text"
                value={editAnnounceText}
                onChange={(e) => setEditAnnounceText(e.target.value)}
                placeholder="輸入全站公告內容..."
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-white border border-[#E6D8C3] text-xs text-[#4A4238]"
              />
              <label className="inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={editAnnounceActive}
                  onChange={(e) => setEditAnnounceActive(e.target.checked)}
                />
                顯示公告
              </label>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-[#F59E0B] text-white font-bold text-xs whitespace-nowrap"
              >
                儲存公告
              </button>
            </form>
          )}
        </div>
      )}

      {/* 近期成交動態跑馬燈 */}
      {completedTickers.length > 0 && (
        <div className="bg-emerald-50/90 border-b border-emerald-200/70 px-3 sm:px-4 py-1 text-xs text-emerald-800">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-1.5">
            <PartyPopper className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate font-medium">
              🎉 成交快報：島民【{getDisplayName(completedTickers[tickerIndex]?.user_id)}】剛完成一筆{' '}
              <strong>{completedTickers[tickerIndex]?.rarity}</strong>「
              {completedTickers[tickerIndex]?.title}」交換！
            </span>
          </div>
        </div>
      )}

      {/* 停權警告橫幅 */}
      {isBanned && (
        <div className="bg-red-600 text-white text-xs font-bold text-center py-1.5 px-4">
          ⚠️ 您的帳號因違反市集規範已被管理員停權，目前僅供瀏覽，無法發布貼文、留言或使用私訊。
        </div>
      )}

      {/* 頂部導覽列 */}
      <header className="sticky top-0 z-20 bg-[#FFFDF7]/95 backdrop-blur-md border-b border-[#F3E8D2]">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 landscape:py-2 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#F59E0B] flex items-center justify-center text-white text-lg sm:text-xl shadow-xs shrink-0">
                🐾
              </div>
              <div className="whitespace-nowrap">
                <span className="text-base sm:text-xl font-bold tracking-tight block leading-none">
                  寵物島市集
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] text-amber-700 font-bold mt-0.5">
                    <ShieldCheck className="w-3 h-3" /> 管理者
                  </span>
                )}
              </div>
            </Link>

            {user && myProfile?.game_name && (
              <button
                onClick={() => setShowMyMarketModal(true)}
                title="點擊打開「我的市集」與收藏清單"
                className="hidden lg:inline-flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded-full bg-white border border-[#E6D8C3] hover:border-[#F59E0B] text-xs whitespace-nowrap transition"
              >
                <Store className="w-3.5 h-3.5 text-[#F59E0B]" />
                {isUserVip(myProfile) && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    👑 VIP
                  </span>
                )}
                <span className="font-bold max-w-[90px] truncate">{myProfile.game_name}</span>
                <span className="text-emerald-700 font-bold">👍{myProfile.good_reviews || 0}</span>
              </button>
            )}
          </div>

          <div className="hidden md:block relative flex-1 max-w-md min-w-[160px]">
            <Search className="w-4 h-4 text-[#A39585] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋道具名稱、想交換的物品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-full bg-white border border-[#E6D8C3] text-sm focus:outline-none focus:border-[#F59E0B]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A39585] hover:text-[#4A4238]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => {
                setSupportModalTab('vip');
                setShowSupportModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold shadow-2xs whitespace-nowrap shrink-0 hover:opacity-95 transition"
              title="升級 VIP 島主 & 功能許願"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>VIP</span>
            </button>

            {user ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminDashboard(true)}
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold whitespace-nowrap shrink-0 transition"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">戰情室</span>
                  </button>
                )}

                <button
                  onClick={() => setShowMyMarketModal(true)}
                  title="我的市集與收藏"
                  className="lg:hidden p-2 rounded-full bg-white border border-[#E6D8C3] text-[#6E6254] shrink-0"
                >
                  <Store className="w-4 h-4 text-[#F59E0B]" />
                </button>

                <button
                  onClick={() => {
                    if (isBanned) {
                      alert('您的帳號已被停權，無法使用私訊功能。');
                      return;
                    }
                    setChatTargetUserId(null);
                    setChatContextItem(null);
                    setShowChatModal(true);
                    setUnreadDmCount(0);
                  }}
                  className="relative inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-white border border-[#E6D8C3] hover:border-[#F59E0B] text-xs font-bold text-[#4A4238] whitespace-nowrap shrink-0 transition"
                >
                  <MessageSquareHeart className="w-4 h-4 text-[#F59E0B]" />
                  <span className="hidden sm:inline">私訊</span>
                  {unreadDmCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">
                      {unreadDmCount}
                    </span>
                  )}
                </button>

                <div className="relative shrink-0">
                  <button
                    onClick={markNotificationsRead}
                    title="通知中心"
                    className="relative p-2 rounded-full bg-white border border-[#E6D8C3] text-[#6E6254] hover:border-[#F59E0B] transition"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifMenu && (
                    <div className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto mt-2 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#F3E8D2] p-3 z-30">
                      <div className="text-xs font-bold text-[#8C7B6B] pb-2 mb-2 border-b border-[#F3E8D2] flex justify-between items-center">
                        <span>最新通知中心</span>
                        <button onClick={() => setShowNotifMenu(false)} className="sm:hidden text-[#8C7B6B]">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {notifications.length === 0 ? (
                        <p className="text-xs text-[#A39585] py-4 text-center">
                          目前還沒有新的通知喔！
                        </p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2">
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

                {!isBanned && (
                  <Link
                    href="/items/new"
                    className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs sm:text-sm font-bold shadow-xs whitespace-nowrap shrink-0 transition"
                  >
                    <Plus className="w-4 h-4" /> <span>發布</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  title="登出"
                  className="p-2 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238] shrink-0 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs sm:text-sm font-bold shadow-xs whitespace-nowrap shrink-0 transition"
              >
                <User className="w-4 h-4" /> <span>登入 / 註冊</span>
              </Link>
            )}
          </div>
        </div>

        {/* 手機直式專屬搜尋列 */}
        <div className="md:hidden px-3 pb-2.5">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#A39585] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋道具名稱、想交換的物品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-full bg-white border border-[#E6D8C3] text-xs focus:outline-none focus:border-[#F59E0B]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A39585]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 雙看板切換頁籤 + 分類標籤 */}
        <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-2.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[#E6D8C3] shrink-0">
            <button
              onClick={() => setActiveBoard('offer')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition ${
                activeBoard === 'offer'
                  ? 'bg-[#F59E0B] text-white shadow-2xs'
                  : 'text-[#6E6254] hover:text-[#4A4238]'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" /> 🔄 交換市集
            </button>
            <button
              onClick={() => setActiveBoard('wish')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition ${
                activeBoard === 'wish'
                  ? 'bg-pink-500 text-white shadow-2xs'
                  : 'text-[#6E6254] hover:text-[#4A4238]'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" /> 🙏 島民許願池
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition ${
                  selectedCategory === cat.id
                    ? 'bg-[#2C2520] text-white shadow-2xs'
                    : 'bg-white border border-[#E6D8C3] text-[#6E6254] hover:border-[#F59E0B]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-5 flex-1 w-full">
        {trendingKeywords.length > 0 && (
          <div className="mb-4 px-3.5 py-2 rounded-2xl bg-white border border-[#F3E8D2] flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 whitespace-nowrap shrink-0">
              <Flame className="w-4 h-4 fill-orange-500" /> 48h 熱門榜：
            </span>
            {trendingKeywords.map((kw, idx) => (
              <button
                key={kw}
                onClick={() => setSearchQuery(kw)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFFDF7] hover:bg-[#FEF3C7] border border-[#E6D8C3] text-xs font-medium text-[#4A4238] whitespace-nowrap shrink-0 transition"
              >
                <span className="text-[10px] font-bold text-[#D97706]">TOP {idx + 1}</span>
                <span>{kw}</span>
              </button>
            ))}
          </div>
        )}

        {/* 篩選、排序與管理名單列 */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-5">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
            <span className="text-xs sm:text-sm text-[#8C7B6B] whitespace-nowrap shrink-0">稀有度：</span>
            {RARITIES.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRarity(r)}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition ${
                  selectedRarity === r
                    ? 'bg-[#2C2520] text-white'
                    : 'bg-white border border-[#E6D8C3] text-[#6E6254] hover:border-[#2C2520]'
                }`}
              >
                {r}
              </button>
            ))}

            <div className="inline-flex items-center gap-1 ml-1 px-2.5 py-1 rounded-xl bg-white border border-[#E6D8C3] text-xs shrink-0">
              <ArrowUpDown className="w-3 h-3 text-[#8C7B6B]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-[#4A4238] focus:outline-none cursor-pointer"
              >
                <option value="vip_first">👑 VIP 置頂優先</option>
                <option value="newest">🕒 最新上架</option>
                <option value="reviews">👍 好評最高</option>
                <option value="expiring">⏳ 即將到期</option>
              </select>
            </div>

            <label className="ml-1 inline-flex items-center gap-1 text-xs text-[#6E6254] whitespace-nowrap shrink-0 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded accent-[#F59E0B]"
              />
              顯示已換出
            </label>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSupportModalTab('feedback');
                setShowSupportModal(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#E6D8C3] hover:border-[#F59E0B] text-xs font-bold text-[#6E6254] whitespace-nowrap shrink-0 transition"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B]" /> 功能許願板
            </button>

            <button
              type="button"
              onClick={() => isAdmin && setShowUsersModal(true)}
              title={isAdmin ? '點擊查看完整島民註冊名冊、VIP 開通與停權管理' : '寵物島市集總註冊人數'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap shrink-0 transition ${
                isAdmin
                  ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#B45309] hover:bg-[#FDE68A] cursor-pointer'
                  : 'bg-white border-[#E6D8C3] text-[#6E6254] cursor-default'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#F59E0B]" />
              已註冊：{usersList.length} 人
              {isAdmin && <span className="underline ml-0.5">管理</span>}
            </button>

            <span className="text-xs text-[#8C7B6B] whitespace-nowrap shrink-0">
              共 {filteredItems.length} 筆
            </span>
          </div>
        </div>

        {/* 商品卡片網格 */}
        {loading ? (
          <div className="text-center py-20 text-[#8C7B6B]">載入資料中...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#F3E8D2] py-16 px-4 text-center">
            <Sparkles className="w-10 h-10 text-[#F59E0B] mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-1">
              {activeBoard === 'offer'
                ? '目前交換市集還沒有符合條件的道具喔！'
                : '目前許願池還沒有符合條件的徵求文喔！'}
            </h2>
            <p className="text-sm text-[#8C7B6B] mb-5">成為第一位發布貼文的島民吧 ✨</p>
            {!isBanned && (
              <Link
                href="/items/new"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> 立即發布貼文
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 landscape:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredItems.map((item) => {
              const coverImg =
                Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
              const sellerInfo = usersMap[item.user_id];
              const sellerIsVip = isUserVip(sellerInfo);
              const sellerName = getDisplayName(item.user_id);
              const canDelete = isAdmin || (user && user.id === item.user_id);
              const hoursLeft = getRemainingHours(item);
              const isCompleted = item.status === 'completed';
              const isFav = favoriteIds.includes(item.id);
              const isWish = item.post_type === 'wish';

              return (
                <div
                  key={item.id}
                  onClick={() => openItemModal(item)}
                  className={`group cursor-pointer bg-white rounded-3xl border overflow-hidden transition-all duration-200 flex flex-col ${
                    sellerIsVip
                      ? 'border-amber-400 ring-2 ring-amber-300/60 shadow-md shadow-amber-200/50 hover:shadow-lg hover:shadow-amber-200/80 hover:-translate-y-1'
                      : isWish
                      ? 'border-pink-200 shadow-xs hover:shadow-md hover:-translate-y-0.5'
                      : 'border-[#F3E8D2] shadow-xs hover:shadow-md hover:-translate-y-0.5'
                  } ${isCompleted ? 'opacity-75' : ''}`}
                >
                  <div
                    className={`relative aspect-[4/3] flex items-center justify-center overflow-hidden ${
                      isWish ? 'bg-pink-50/60' : 'bg-[#FDF8EC]'
                    }`}
                  >
                    {coverImg ? (
                      <img
                        src={coverImg}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-[#C4B5A0] px-4 text-center">
                        {isWish ? (
                          <>
                            <HeartHandshake className="w-9 h-9 mb-1 text-pink-400" />
                            <span className="text-xs text-pink-600 font-bold">島民許願徵求中</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-9 h-9 mb-1" />
                            <span className="text-xs">無圖片</span>
                          </>
                        )}
                      </div>
                    )}

                    {isCompleted && (
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                        <span className="px-4 py-1.5 rounded-full bg-emerald-600 text-white font-bold text-sm border-2 border-white shadow-lg -rotate-6">
                          ✅ {isWish ? '已徵得' : '已換出'}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 flex-wrap">
                      {item.rarity && <RarityBadge rarity={item.rarity as RarityType} />}
                      {sellerIsVip && (
                        <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold shadow-xs whitespace-nowrap">
                          ✨ VIP 置頂
                        </span>
                      )}
                      {isWish && (
                        <span className="px-2 py-0.5 rounded-lg bg-pink-500 text-white text-[10px] font-bold shadow-2xs whitespace-nowrap">
                          🙏 徵求
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> {hoursLeft}h
                      </span>

                      <button
                        onClick={(e) => handleToggleFavorite(e, item.id)}
                        title={isFav ? '取消收藏' : '加入收藏'}
                        className={`p-1.5 rounded-full backdrop-blur-xs shadow-xs transition ${
                          isFav
                            ? 'bg-pink-500 text-white'
                            : 'bg-white/85 text-[#8C7B6B] hover:text-pink-500'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>

                      {canDelete && (
                        <button
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          title="刪除貼文"
                          className="p-1.5 rounded-full bg-red-500/90 hover:bg-red-600 text-white shadow-xs transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base mb-2 line-clamp-1 text-[#4A4238]">
                        {item.title}
                      </h3>
                      <div
                        className={`border rounded-2xl p-2.5 mb-3 ${
                          isWish
                            ? 'bg-pink-50/40 border-pink-100'
                            : 'bg-[#FFFDF7] border-[#F3E8D2]'
                        }`}
                      >
                        <span
                          className={`text-[11px] font-bold block mb-0.5 ${
                            isWish ? 'text-pink-600' : 'text-[#D97706]'
                          }`}
                        >
                          {isWish ? '可提供交換籌碼：' : '想換物品：'}
                        </span>
                        <p className="text-xs text-[#4A4238] line-clamp-2 leading-relaxed">
                          {item.wanted_items || '歡迎留言報價'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#F7EFE0] space-y-2">
                      <div className="flex items-center justify-between gap-1.5 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {sellerIsVip && (
                            <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-bold whitespace-nowrap shrink-0">
                              👑 VIP
                            </span>
                          )}
                          <span className="font-bold text-[#4A4238] truncate">{sellerName}</span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold whitespace-nowrap shrink-0">
                          👍 {sellerInfo?.good_reviews || 0}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#8C7B6B]">
                        <span className="font-mono truncate">
                          ID: {sellerInfo?.game_id || '---'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#D97706] font-bold whitespace-nowrap shrink-0 group-hover:translate-x-0.5 transition-transform">
                          <MessageCircle className="w-3.5 h-3.5" /> 詳情 / 私訊
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 頁尾免責與交易安全警語 */}
      <footer className="border-t border-[#F3E8D2] bg-white/70 py-6 px-4 mt-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto text-center space-y-2.5">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-[#FEF3C7] px-3.5 py-1.5 rounded-full">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
              交易安全與平台免責聲明
            </div>
            <button
              onClick={() => {
                setSupportModalTab('feedback');
                setShowSupportModal(true);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#6E6254] hover:text-[#D97706] bg-white border border-[#E6D8C3] px-3.5 py-1.5 rounded-full transition"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" /> 功能許願板 & 贊助 VIP
            </button>
          </div>
          <p className="text-xs text-[#8C7B6B] max-w-3xl mx-auto leading-relaxed">
            本網站（寵物島市集）僅提供遊戲玩家道具交換資訊刊登與溝通便利之媒合平台，不介入雙方實際遊戲內道具轉移，亦不提供任何交易擔保、保管或賠償責任。交換前請務必核對對方遊戲 ID 與累計好評紀錄，嚴禁進行私下金錢買賣或帳號交易；若發生任何交易糾紛，請自行承擔風險並透過遊戲官方客服處理。
          </p>
        </div>
      </footer>

      {/* 功能許願板 & 贊助 VIP 彈窗 */}
      {showSupportModal && (
        <CommunitySupportModal
          currentUser={user}
          isAdmin={isAdmin}
          isBanned={isBanned}
          myDisplayName={myProfile?.game_name || '島民玩家'}
          myGameId={myProfile?.game_id || ''}
          sponsorUrl={announcement.sponsor_url || ''}
          adminUserId={firstAdminUser?.id}
          initialTab={supportModalTab}
          onClose={() => setShowSupportModal(false)}
          onOpenChatWithAdmin={(adminId) => {
            setChatTargetUserId(adminId);
            setChatContextItem({
              id: 'vip-support',
              title: `申請贊助開通 👑 VIP 島主（遊戲 ID：${myProfile?.game_id || '請填寫'}）`,
              wanted_items: '請站長提供安全的贊助收款方式，謝謝！',
            });
            setShowChatModal(true);
          }}
          onSaveSponsorUrl={handleSaveSponsorUrl}
        />
      )}

      {/* 站長數據戰情室彈窗 */}
      {isAdmin && showAdminDashboard && (
        <AdminDashboardModal
          usersList={usersList}
          items={items}
          onClose={() => setShowAdminDashboard(false)}
          onRefreshData={fetchData}
        />
      )}

      {/* 我的市集（個人中心 + 愛心收藏彈窗） */}
      {user && showMyMarketModal && (
        <div
          onClick={() => setShowMyMarketModal(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full max-h-[90dvh] flex flex-col border border-[#F3E8D2] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#F59E0B]" />
                <h2 className="font-bold text-base sm:text-lg">我的市集與追蹤收藏</h2>
              </div>
              <button
                onClick={() => setShowMyMarketModal(false)}
                className="p-1.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              <div className="bg-[#FFFDF7] border border-[#F3E8D2] rounded-2xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-[#8C7B6B] mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      遊戲 ID：<strong className="text-[#4A4238] font-mono">{myProfile?.game_id}</strong>
                    </span>
                    {isUserVip(myProfile) ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                        👑 VIP 到期：{new Date(myProfile!.vip_expires_at!).toLocaleDateString('zh-TW')}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setShowMyMarketModal(false);
                          setSupportModalTab('vip');
                          setShowSupportModal(true);
                        }}
                        className="text-[11px] text-[#D97706] underline font-bold"
                      >
                        升級 👑 VIP
                      </button>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    👍 累計好評：{myProfile?.good_reviews || 0} 次
                  </span>
                </div>

                <form onSubmit={handleUpdateMyName} className="flex gap-2">
                  <input
                    type="text"
                    value={editGameName}
                    onChange={(e) => setEditGameName(e.target.value)}
                    placeholder="修改遊戲名稱..."
                    className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-white border border-[#E6D8C3] text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                  <button
                    type="submit"
                    disabled={savingName || !editGameName.trim()}
                    className="px-3.5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    {savingName ? '儲存中...' : '更新名稱'}
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3]">
                <button
                  onClick={() => setMyMarketTab('my_items')}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    myMarketTab === 'my_items'
                      ? 'bg-[#F59E0B] text-white'
                      : 'text-[#6E6254]'
                  }`}
                >
                  📦 我上架的貼文 ({myItems.length})
                </button>
                <button
                  onClick={() => setMyMarketTab('favorites')}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    myMarketTab === 'favorites'
                      ? 'bg-pink-500 text-white'
                      : 'text-[#6E6254]'
                  }`}
                >
                  ❤️ 我的愛心收藏 ({myFavoriteItems.length})
                </button>
              </div>

              {myMarketTab === 'my_items' ? (
                myItems.length === 0 ? (
                  <p className="text-xs text-[#A39585] text-center py-6 bg-[#FFFDF7] rounded-2xl border border-[#F3E8D2]">
                    你目前還沒有上架中的貼文喔！
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
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 ${
                                item.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status === 'completed'
                                ? item.post_type === 'wish'
                                  ? '已徵得'
                                  : '已換出'
                                : '進行中'}
                            </span>
                            <span className="font-bold text-sm truncate">{item.title}</span>
                          </div>
                          <p className="text-[11px] text-[#8C7B6B] truncate mt-0.5">
                            條件：{item.wanted_items}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleToggleItemStatus(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E6D8C3] hover:border-[#F59E0B] text-xs font-bold text-[#4A4238] whitespace-nowrap"
                          >
                            {item.status === 'completed'
                              ? '重新上架'
                              : item.post_type === 'wish'
                              ? '標記已徵得'
                              : '標記已換出'}
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
                )
              ) : myFavoriteItems.length === 0 ? (
                <p className="text-xs text-[#A39585] text-center py-6 bg-[#FFFDF7] rounded-2xl border border-[#F3E8D2]">
                  還沒有收藏任何道具，點擊卡片右上角的愛心就能追蹤囉！
                </p>
              ) : (
                <div className="space-y-2.5">
                  {myFavoriteItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowMyMarketModal(false);
                        openItemModal(item);
                      }}
                      className="cursor-pointer p-3 rounded-2xl bg-[#FFFDF7] hover:bg-[#FEF3C7]/40 border border-[#F3E8D2] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold whitespace-nowrap shrink-0">
                            {item.post_type === 'wish' ? '🙏 許願' : '🔄 交換'}
                          </span>
                          <span className="font-bold text-sm truncate">{item.title}</span>
                        </div>
                        <p className="text-[11px] text-[#8C7B6B] truncate mt-0.5">
                          發布者：{getDisplayName(item.user_id)}｜條件：{item.wanted_items}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleToggleFavorite(e, item.id)}
                        className="p-1.5 rounded-full bg-pink-500 text-white shrink-0"
                        title="取消收藏"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 管理者專屬：即時註冊島民名冊（支援一鍵開通 30 天 VIP & 停權封鎖 ID） */}
      {isAdmin && showUsersModal && (
        <div
          onClick={() => setShowUsersModal(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90dvh] flex flex-col border border-[#F3E8D2] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#F59E0B]" />
                <h2 className="font-bold text-base sm:text-lg">
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
              {usersList.map((u, index) => {
                const targetIsVip = isUserVip(u);
                return (
                  <div
                    key={u.id}
                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      u.is_banned
                        ? 'bg-red-50/70 border-red-200'
                        : targetIsVip
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-[#FFFDF7] border-[#F3E8D2]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-bold">
                          #{usersList.length - index}
                        </span>
                        <span className="font-bold text-sm text-[#4A4238]">
                          {u.game_name || u.nickname || '未設定名稱'}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-bold">
                          👍 {u.good_reviews || 0}
                        </span>
                        {targetIsVip && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                            👑 VIP（至 {new Date(u.vip_expires_at).toLocaleDateString('zh-TW')}）
                          </span>
                        )}
                        {u.is_admin && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-700 text-white text-[10px] font-bold">
                            管理者
                          </span>
                        )}
                        {u.is_banned && (
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                            已停權（ID黑名單）
                          </span>
                        )}
                      </div>
                      <div className="text-[#8C7B6B] mt-1">
                        遊戲 ID：
                        <span className="font-mono font-bold text-[#4A4238]">
                          {u.game_id || '尚未綁定'}
                        </span>
                        <span className="ml-2 text-[11px] text-[#A39585]">
                          註冊：
                          {u.created_at
                            ? new Date(u.created_at).toLocaleString('zh-TW', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                    </div>

                    {!u.is_admin && (
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <button
                          onClick={() => handleToggleVipUser(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                            targetIsVip
                              ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                        >
                          <Crown className="w-3 h-3" />
                          {targetIsVip ? '取消 VIP' : '開通30天VIP'}
                        </button>

                        <button
                          onClick={() => handleToggleBanUser(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                            u.is_banned
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-red-100 hover:bg-red-200 text-red-700'
                          }`}
                        >
                          <Ban className="w-3 h-3" />
                          {u.is_banned ? '解除停權' : '停權封鎖ID'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 點擊卡片彈出的詳情與留言板視窗 */}
      {activeItem && (
        <div
          onClick={() => setActiveItem(null)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto border border-[#F3E8D2] shadow-xl p-4 sm:p-6"
          >
            <div className="flex items-start justify-between gap-2.5 mb-4">
              <div className="min-w-0">
                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                  {activeItem.rarity && <RarityBadge rarity={activeItem.rarity as RarityType} />}
                  {isUserVip(usersMap[activeItem.user_id]) && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold whitespace-nowrap">
                      👑 VIP 島主
                    </span>
                  )}
                  <span className="text-xs font-bold text-[#4A4238] truncate">
                    {getDisplayName(activeItem.user_id)}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-0.5 whitespace-nowrap">
                    <ThumbsUp className="w-3 h-3" /> {usersMap[activeItem.user_id]?.good_reviews || 0}
                  </span>
                </div>

                {usersMap[activeItem.user_id]?.game_id && (
                  <div className="flex items-center gap-1.5 mt-1 mb-1 flex-wrap">
                    <span className="text-xs text-[#8C7B6B]">
                      遊戲 ID：
                      <strong className="font-mono text-[#4A4238]">
                        {usersMap[activeItem.user_id].game_id}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleCopyGameId(e, usersMap[activeItem.user_id].game_id)
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFFDF7] border border-[#E6D8C3] hover:border-[#F59E0B] text-[11px] font-bold text-[#6E6254] whitespace-nowrap transition"
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

                <h2 className="text-lg sm:text-xl font-bold mt-1 break-words">{activeItem.title}</h2>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                <button
                  onClick={(e) => handleToggleFavorite(e, activeItem.id)}
                  className={`p-2 rounded-full border transition ${
                    favoriteIds.includes(activeItem.id)
                      ? 'bg-pink-500 border-pink-500 text-white'
                      : 'bg-[#FFFDF7] border-[#E6D8C3] text-[#8C7B6B] hover:text-pink-500'
                  }`}
                  title={favoriteIds.includes(activeItem.id) ? '取消收藏' : '加入收藏'}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      favoriteIds.includes(activeItem.id) ? 'fill-current' : ''
                    }`}
                  />
                </button>

                {user && user.id === activeItem.user_id && (
                  <button
                    onClick={() => handleToggleItemStatus(activeItem)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                      activeItem.status === 'completed'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {activeItem.status === 'completed'
                      ? '重新上架'
                      : activeItem.post_type === 'wish'
                      ? '已徵得'
                      : '已換出'}
                  </button>
                )}

                {user && activeItem.user_id !== user.id && !isBanned && (
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] text-xs font-bold whitespace-nowrap transition"
                  >
                    <MessageSquareHeart className="w-3.5 h-3.5" /> 1v1 私訊
                  </button>
                )}

                {(isAdmin || (user && user.id === activeItem.user_id)) && (
                  <button
                    onClick={(e) => handleDeleteItem(e, activeItem.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold whitespace-nowrap transition"
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
                      className="relative group cursor-zoom-in w-36 h-36 sm:w-44 sm:h-44 rounded-2xl border border-[#F3E8D2] overflow-hidden shrink-0"
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
                <span className="font-bold text-[#D97706]">
                  {activeItem.post_type === 'wish' ? '可提供交換籌碼：' : '想交換物品：'}
                </span>
                <span className="break-words">{activeItem.wanted_items}</span>
              </div>
              {activeItem.description && (
                <div>
                  <span className="font-bold text-[#8C7B6B]">補充說明：</span>
                  <span className="break-words">{activeItem.description}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <span className="text-xs text-[#8C7B6B]">
                  ⏳ 距離自動下架還有約 {getRemainingHours(activeItem)} 小時
                </span>

                {user && user.id !== activeItem.user_id && (
                  <button
                    type="button"
                    onClick={() => setShowReportBox(!showReportBox)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#A39585] hover:text-red-500 transition"
                  >
                    <Flag className="w-3 h-3" /> 檢舉此貼文
                  </button>
                )}
              </div>

              {showReportBox && (
                <form
                  onSubmit={handleReportItem}
                  className="mt-2 pt-2.5 border-t border-[#F3E8D2] flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="請簡述異常原因（例如：現金買賣、疑似詐騙...）"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs focus:outline-none focus:border-red-400"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    送出
                  </button>
                </form>
              )}
            </div>

            {/* 公開留言詢問區塊 */}
            <div className="border-t border-[#F3E8D2] pt-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-[#F59E0B]" /> 公開留言詢問 ({comments.length})
              </h3>

              <div className="space-y-2.5 max-h-44 overflow-y-auto mb-4 pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-[#A39585] text-center py-4">
                    還沒有人留言，也可以直接點右上角「1v1 私訊」找對方洽談喔！
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
                      <p className="text-[#4A4238] break-words">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder={
                    isBanned
                      ? '您的帳號已被停權'
                      : user
                      ? '輸入想交換的道具或留言...'
                      : '請先登入後再留言詢問'
                  }
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user || isBanned || sendingComment}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-[#FFFDF7] border border-[#E6D8C3] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
                <button
                  type="submit"
                  disabled={!user || isBanned || sendingComment || !newComment.trim()}
                  className="px-4 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> 送出
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 1 對 1 聊天室視窗 */}
      {user && showChatModal && !isBanned && (
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
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomedImage}
            alt="放大檢視"
            className="max-w-full max-h-[88dvh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}