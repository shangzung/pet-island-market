'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RarityBadge, RarityType } from '@/components/RarityBadge';
import {
  X,
  Droplets,
  ThumbsUp,
  Copy,
  Check,
  Share2,
  MessageSquareHeart,
  Repeat,
  HeartHandshake,
  Home,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

interface IslandHouseModalProps {
  owner: any;
  ownerItems: any[];
  currentUserId?: string | null;
  isBanned?: boolean;
  vipEnabled?: boolean;
  onClose: () => void;
  onSelectItem: (item: any) => void;
  onOpenChat: (targetUserId: string) => void;
  onWaterUpdated: (targetUserId: string, newCount: number) => void;
}

export function IslandHouseModal({
  owner,
  ownerItems,
  currentUserId,
  isBanned = false,
  vipEnabled = false,
  onClose,
  onSelectItem,
  onOpenChat,
  onWaterUpdated,
}: IslandHouseModalProps) {
  const supabase = createClient();
  const [waterCount, setWaterCount] = useState<number>(owner?.water_count || 0);
  const [hasWateredToday, setHasWateredToday] = useState(false);
  const [watering, setWatering] = useState(false);
  const [copiedType, setCopiedType] = useState<'id' | 'link' | null>(null);

  const isOwnerVip =
    vipEnabled &&
    owner?.vip_expires_at &&
    new Date(owner.vip_expires_at).getTime() > Date.now();

  const displayName = owner?.game_name || owner?.nickname || '島民玩家';
  const todayKey = `pet_island_watered_${new Date().toISOString().slice(0, 10)}`;

  useEffect(() => {
    setWaterCount(owner?.water_count || 0);
    if (typeof window !== 'undefined' && owner?.id) {
      try {
        const wateredList: string[] = JSON.parse(localStorage.getItem(todayKey) || '[]');
        setHasWateredToday(wateredList.includes(owner.id));
      } catch {
        setHasWateredToday(false);
      }
    }
  }, [owner, todayKey]);

  const handleWater = async () => {
    if (!owner?.id || hasWateredToday || watering) return;
    setWatering(true);

    const { data, error } = await supabase.rpc('increment_water_count', {
      target_user_id: owner.id,
    });

    if (!error) {
      const nextCount = typeof data === 'number' ? data : waterCount + 1;
      setWaterCount(nextCount);
      setHasWateredToday(true);
      onWaterUpdated(owner.id, nextCount);

      if (typeof window !== 'undefined') {
        try {
          const wateredList: string[] = JSON.parse(localStorage.getItem(todayKey) || '[]');
          if (!wateredList.includes(owner.id)) {
            wateredList.push(owner.id);
            localStorage.setItem(todayKey, JSON.stringify(wateredList));
          }
        } catch {}
      }
    }
    setWatering(false);
  };

  const handleCopyId = () => {
    if (!owner?.game_id) return;
    navigator.clipboard.writeText(owner.game_id);
    setCopiedType('id');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleShareHouse = () => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://pet-island-market.vercel.app';
    const houseUrl = owner?.game_id
      ? `${origin}/?island=${encodeURIComponent(owner.game_id)}`
      : origin;

    const shareText = `【寵物島市集｜🏠 ${displayName} 的個人小屋】\n🪪 遊戲 ID：${
      owner?.game_id || '未設定'
    }\n💬 ${owner?.bio || '歡迎來我的小屋逛逛、互澆水換道具！'}\n👉 點擊參觀小屋與全部換物清單：${houseUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: `${displayName} 的寵物島小屋`,
          text: shareText,
          url: houseUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedType('link');
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const offerItems = ownerItems.filter(
    (i) => i.post_type !== 'wish' && i.status !== 'completed'
  );
  const wishItems = ownerItems.filter(
    (i) => i.post_type === 'wish' && i.status !== 'completed'
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl max-w-2xl w-full max-h-[90dvh] flex flex-col border shadow-2xl overflow-hidden text-[#4A4238] ${
          isOwnerVip ? 'border-amber-400 ring-2 ring-amber-300/60' : 'border-[#F3E8D2]'
        }`}
      >
        {/* 頂部導覽列 */}
        <div className="px-5 py-3.5 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Home className="w-5 h-5 text-[#F59E0B] shrink-0" />
            <h2 className="font-bold text-base sm:text-lg truncate">
              {displayName} 的個人小屋
            </h2>
            {isOwnerVip && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shrink-0">
                👑 VIP 島主
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleShareHouse}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#E6D8C3] hover:border-[#F59E0B] text-xs font-bold text-[#6E6254] transition"
            >
              {copiedType === 'link' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> 已複製小屋連結
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-[#F59E0B]" /> 分享小屋
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* 小屋美照展示牆 */}
          <div className="relative h-44 sm:h-56 bg-gradient-to-br from-[#FEF3C7] via-[#FFFDF7] to-[#FDE68A]/50 border-b border-[#F3E8D2] flex items-center justify-center overflow-hidden">
            {owner?.cover_image ? (
              <img
                src={owner.cover_image}
                alt={`${displayName} 的小屋展示`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center px-4 text-[#A39585] space-y-1">
                <Sparkles className="w-8 h-8 text-[#F59E0B]/70 mx-auto" />
                <p className="text-xs font-bold text-[#8C7B6B]">
                  歡迎來到 {displayName} 的寵物島小屋 🐾
                </p>
                <p className="text-[11px]">（島主尚未上傳小屋展示照）</p>
              </div>
            )}

            {/* 右下角：澆水人氣互動按鈕 */}
            <button
              type="button"
              onClick={handleWater}
              disabled={hasWateredToday || watering}
              className={`absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold shadow-md transition ${
                hasWateredToday
                  ? 'bg-sky-600/95 text-white cursor-default'
                  : 'bg-white/95 hover:bg-sky-50 text-sky-700 border border-sky-200'
              }`}
            >
              <Droplets className={`w-4 h-4 ${hasWateredToday ? 'fill-current' : 'text-sky-500'}`} />
              <span>{hasWateredToday ? '今日已澆水' : '幫他澆水'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 text-[11px]">
                {waterCount}
              </span>
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* 島主名片與自我介紹區 */}
            <div className="bg-[#FFFDF7] border border-[#F3E8D2] rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-[#4A4238]">{displayName}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold inline-flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> 好評 {owner?.good_reviews || 0}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-bold inline-flex items-center gap-1">
                    <Droplets className="w-3 h-3" /> 人氣 {waterCount}
                  </span>
                </div>

                {currentUserId && owner?.id !== currentUserId && !isBanned && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChat(owner.id);
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold shadow-2xs transition"
                  >
                    <MessageSquareHeart className="w-3.5 h-3.5" /> 1v1 私訊島主
                  </button>
                )}
              </div>

              {owner?.game_id && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[#8C7B6B]">
                    遊戲 ID：<strong className="font-mono text-[#4A4238]">{owner.game_id}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white border border-[#E6D8C3] hover:border-[#F59E0B] text-[11px] font-bold text-[#6E6254] transition"
                  >
                    {copiedType === 'id' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> 已複製 ID
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> 複製 ID
                      </>
                    )}
                  </button>
                </div>
              )}

              <p className="text-xs sm:text-sm text-[#6E6254] bg-white p-3 rounded-xl border border-[#F3E8D2] leading-relaxed">
                {owner?.bio?.trim()
                  ? owner.bio
                  : '這位島主很低調，還沒有填寫小屋心情簽名喔～歡迎直接看下方攤位換物！'}
              </p>
            </div>

            {/* 他的交換攤位清單 */}
            <div>
              <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5 text-[#4A4238]">
                <Repeat className="w-4 h-4 text-[#F59E0B]" /> 正在交換的道具（{offerItems.length} 件）
              </h3>

              {offerItems.length === 0 ? (
                <p className="text-xs text-[#A39585] bg-[#FFFDF7] border border-[#F3E8D2] rounded-2xl py-4 text-center">
                  目前沒有上架中的交換道具
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {offerItems.map((item) => {
                    const thumb =
                      Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onClose();
                          onSelectItem(item);
                        }}
                        className="cursor-pointer p-2.5 rounded-2xl bg-[#FFFDF7] hover:bg-[#FEF3C7]/50 border border-[#F3E8D2] flex items-center gap-3 transition"
                      >
                        <div className="w-14 h-14 rounded-xl bg-[#FDF8EC] border border-[#F3E8D2] overflow-hidden shrink-0 flex items-center justify-center">
                          {thumb ? (
                            <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-[#C4B5A0]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            {item.rarity && <RarityBadge rarity={item.rarity as RarityType} />}
                            <span className="font-bold text-xs truncate">{item.title}</span>
                          </div>
                          <p className="text-[11px] text-[#8C7B6B] truncate">
                            想換：{item.wanted_items || '歡迎報價'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 他的許願清單 */}
            <div>
              <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5 text-[#4A4238]">
                <HeartHandshake className="w-4 h-4 text-pink-500" /> 他的許願徵求清單（{wishItems.length} 件）
              </h3>

              {wishItems.length === 0 ? (
                <p className="text-xs text-[#A39585] bg-[#FFFDF7] border border-[#F3E8D2] rounded-2xl py-4 text-center">
                  目前沒有發布許願徵求文
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {wishItems.map((item) => {
                    const thumb =
                      Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onClose();
                          onSelectItem(item);
                        }}
                        className="cursor-pointer p-2.5 rounded-2xl bg-pink-50/40 hover:bg-pink-50 border border-pink-200/70 flex items-center gap-3 transition"
                      >
                        <div className="w-14 h-14 rounded-xl bg-pink-50 border border-pink-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {thumb ? (
                            <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <HeartHandshake className="w-5 h-5 text-pink-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            {item.rarity && <RarityBadge rarity={item.rarity as RarityType} />}
                            <span className="font-bold text-xs truncate">{item.title}</span>
                          </div>
                          <p className="text-[11px] text-pink-700 truncate">
                            籌碼：{item.wanted_items || '歡迎私訊'}
                          </p>
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
    </div>
  );
}