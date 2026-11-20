'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Sparkles,
} from 'lucide-react';

// 巴哈姆特《寵物島》哈啦板專屬板號
const BAHAMUT_BSN = '71315';

interface ShareItemModalProps {
  item: {
    id: string;
    post_type?: string;
    title: string;
    rarity?: string;
    wanted_items?: string;
    description?: string;
  };
  sellerName: string;
  sellerGameId?: string;
  isJustPublished?: boolean;
  onClose: () => void;
}

export function ShareItemModal({
  item,
  sellerName,
  sellerGameId,
  isJustPublished = false,
  onClose,
}: ShareItemModalProps) {
  const [copiedType, setCopiedType] = useState<'text' | 'link' | null>(null);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://pet-island-market.vercel.app';
  const shareUrl = `${origin}/?item=${item.id}`;
  const isWish = item.post_type === 'wish';
  const boardLabel = isWish ? '🙏 島民許願徵求' : '🔄 道具交換';
  const rarityPrefix = item.rarity ? `[${item.rarity}] ` : '';

  const shareMessage = [
    `【寵物島市集｜${boardLabel}】`,
    `${isWish ? '🎯 徵求物品' : '✨ 提供道具'}：${rarityPrefix}${item.title}`,
    `${isWish ? '🎁 提供籌碼' : '🔍 想換物品'}：${item.wanted_items || '歡迎私訊洽談'}`,
    sellerGameId
      ? `🪪 遊戲 ID：${sellerGameId}（${sellerName}）`
      : `👤 島民：${sellerName}`,
    `👉 點擊看圖與 1v1 私訊：${shareUrl}`,
  ].join('\n');

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `寵物島市集｜${rarityPrefix}${item.title}`,
          text: shareMessage,
          url: shareUrl,
        });
      } catch {
        // 使用者取消分享不需報錯
      }
    } else {
      handleCopyText();
      alert('目前瀏覽器不支援系統原生分享面板，已自動為您複製完整招募文案！');
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopiedType('text');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedType('link');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(
    shareUrl
  )}&text=${encodeURIComponent(shareMessage)}`;

  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}&quote=${encodeURIComponent(shareMessage)}`;

  const threadsShareUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(
    shareMessage
  )}`;

  const handleBahamutShare = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopiedType('text');
    setTimeout(() => setCopiedType(null), 2500);
    window.open(
      `https://forum.gamer.com.tw/B.php?bsn=${BAHAMUT_BSN}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-md w-full border border-[#F3E8D2] shadow-2xl p-5 sm:p-6 text-[#4A4238] space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
              {isJustPublished ? <Sparkles className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {isJustPublished ? '🎉 發布成功！立即分享加速成交' : '📣 分享這筆貼文'}
              </h3>
              <p className="text-[11px] text-[#8C7B6B] mt-0.5">
                轉發到社群群組或動態牆，讓更多島民看到並私訊你！
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#FFFDF7] border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 手機系統原生一鍵分享（支援 LINE / IG / Threads / FB / 抖音 App） */}
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-amber-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Smartphone className="w-4 h-4" />
          手機一鍵分享（LINE / IG / Threads / FB / 抖音）
        </button>

        {/* 快捷社群平台按鈕列 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
          <a
            href={lineShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-2 rounded-xl bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#059640] border border-[#06C755]/30 flex items-center justify-center gap-1 transition"
          >
            <span>LINE</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={fbShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-2 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] border border-[#1877F2]/30 flex items-center justify-center gap-1 transition"
          >
            <span>Facebook</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={threadsShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-2 rounded-xl bg-neutral-900/5 hover:bg-neutral-900/10 text-neutral-800 border border-neutral-300 flex items-center justify-center gap-1 transition"
          >
            <span>Threads</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={handleBahamutShare}
            className="py-2.5 px-2 rounded-xl bg-[#11AAC1]/10 hover:bg-[#11AAC1]/20 text-[#0D8395] border border-[#11AAC1]/30 flex items-center justify-center gap-1 transition"
            title="自動複製招募文案並前往巴哈姆特寵物島哈啦區"
          >
            <span>巴哈姆特</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* 預覽招募文案與一鍵複製區（適用 IG / 抖音 / 巴哈 / 社群留言） */}
        <div className="bg-[#FFFDF7] border border-[#F3E8D2] rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#8C7B6B]">
            <span className="font-bold">📋 社群招募文案預覽（適用巴哈 / IG / 抖音）</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-[#D97706] hover:underline font-bold"
            >
              {copiedType === 'link' ? '✅ 已複製網址' : '僅複製直達網址'}
            </button>
          </div>

          <pre className="text-[11px] text-[#4A4238] whitespace-pre-wrap font-sans bg-white p-2.5 rounded-xl border border-[#F3E8D2] leading-relaxed select-all">
            {shareMessage}
          </pre>

          <button
            type="button"
            onClick={handleCopyText}
            className="w-full py-2.5 rounded-xl bg-[#2C2520] hover:bg-[#3F352E] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            {copiedType === 'text' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> 已複製完整文案與連結！可直接貼上
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> 一鍵複製招募文案＋專屬連結
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}