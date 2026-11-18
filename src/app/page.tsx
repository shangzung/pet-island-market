'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RarityBadge, RarityType } from '@/components/RarityBadge';
import { Search, Plus, LogOut, User, Sparkles, Image as ImageIcon } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'fashion', label: '👗 服裝' },
  { id: 'furniture', label: '🪑 家具' },
  { id: 'background', label: '🏞️ 背景' },
  { id: 'island', label: '🏝️ 島嶼裝飾' },
  { id: 'pet', label: '🐾 寵物' },
  { id: 'item', label: '🧪 道具' },
  { id: 'other', label: '📦 其他' },
];

const RARITIES = ['全部', 'UR', 'SSR', 'SR', 'R', 'N'];

export default function HomePage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRarity, setSelectedRarity] = useState('全部');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // 1. 取得目前登入使用者
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // 2. 直接讀取 items 資料表（不使用複雜 JOIN 避免因外鍵名稱不同而查不到）
      const { data: itemsData, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && itemsData) {
        // 只保留未下架的道具
        const activeItems = itemsData.filter(
          (item) => !item.status || item.status === 'active'
        );
        setItems(activeItems);

        // 3. 讀取賣家暱稱對照表
        const { data: usersData } = await supabase
          .from('users')
          .select('id, nickname');
        if (usersData) {
          const map: Record<string, string> = {};
          usersData.forEach((u: any) => {
            map[u.id] = u.nickname || '島民玩家';
          });
          setUsersMap(map);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
  };

  // 前端即時篩選搜尋、分類與稀有度
  const filteredItems = items.filter((item) => {
    const matchCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchRarity =
      selectedRarity === '全部' || item.rarity === selectedRarity;
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
      {/* 頂部導覽列 */}
      <header className="sticky top-0 z-20 bg-[#FFFDF7]/90 backdrop-blur-md border-b border-[#F3E8D2]">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#F59E0B] flex items-center justify-center text-white text-xl shadow-sm">
              🐾
            </div>
            <span className="text-xl font-bold tracking-tight">寵物島市集</span>
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
          <div className="flex items-center gap-2.5">
            {user ? (
              <>
                <Link
                  href="/items/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> 發布
                </Link>
                <button
                  onClick={handleLogout}
                  title="登出"
                  className="p-2 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238] transition"
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
        {/* 稀有度篩選與統計 */}
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
            共 {filteredItems.length} 件交換中道具
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
                Array.isArray(item.images) && item.images.length > 0
                  ? item.images[0]
                  : null;
              const sellerName = usersMap[item.user_id] || '島民玩家';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-[#F3E8D2] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                >
                  {/* 商品圖片 */}
                  <div className="relative aspect-square bg-[#FDF8EC] flex items-center justify-center overflow-hidden">
                    {coverImg ? (
                      <img
                        src={coverImg}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
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
                  </div>

                  {/* 商品資訊 */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base mb-1.5 line-clamp-1">
                        {item.title}
                      </h3>
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
                      <span>@{sellerName}</span>
                      <span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('zh-TW')
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}