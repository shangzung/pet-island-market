'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';
import { ArrowLeft, ImagePlus, Crown, Sparkles, X } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'clothing', label: '👗 服裝' },
  { value: 'furniture', label: '🛋️ 家具' },
  { value: 'background', label: '🏞️ 背景' },
  { value: 'island_decor', label: '🏝️ 島嶼裝飾' },
  { value: 'pet', label: '🐾 寵物' },
  { value: 'prop', label: '🪄 道具' },
  { value: 'other', label: '📦 其他' },
];

const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'] as const;

export default function NewItemPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('clothing');
  const [rarity, setRarity] = useState<(typeof RARITIES)[number]>('SR');
  const [description, setDescription] = useState('');
  const [isTradable, setIsTradable] = useState(true);
  const [wantedItem, setWantedItem] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const maxImages = isVip ? 10 : 3;

  useEffect(() => {
    async function loadUserStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 查詢 VIP 狀態
      const { data: profile } = await supabase
        .from('users')
        .select('is_vip, vip_expired_at')
        .eq('id', user.id)
        .single();

      const activeVip = Boolean(profile?.is_vip && profile?.vip_expired_at && new Date(profile.vip_expired_at) > new Date());
      setIsVip(activeVip);

      // 查詢目前已上架商品數量
      const { count } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active');

      setActiveCount(count || 0);
    }
    loadUserStatus();
  }, [supabase, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > maxImages) {
      setErrorMsg(`${isVip ? 'VIP會員' : '免費會員'}最多只能上傳 ${maxImages} 張圖片喔！`);
      return;
    }
    setErrorMsg('');
    const updatedFiles = [...files, ...selected];
    setFiles(updatedFiles);
    setPreviews(updatedFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isVip && activeCount >= 10) {
      setErrorMsg('免費會員最多同時上架 10 件商品，請先下架舊商品或升級 VIP！');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1. 建立商品主檔
      const { data: item, error: itemError } = await supabase
        .from('items')
        .insert({
          user_id: user.id,
          title,
          description,
          category,
          rarity,
          is_tradable: isTradable,
          wanted_item: wantedItem,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // 2. 壓縮圖片為 WebP 並上傳至 Supabase Storage
      for (let i = 0; i < files.length; i++) {
        const compressed = await imageCompression(files[i], {
          maxSizeMB: 0.4,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          fileType: 'image/webp',
        });

        const filePath = `${user.id}/${item.id}/${Date.now()}_${i}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, compressed, { contentType: 'image/webp' });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('item-images')
          .getPublicUrl(filePath);

        await supabase.from('item_images').insert({
          item_id: item.id,
          image_url: publicUrlData.publicUrl,
          sort_order: i,
        });
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || '發布失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] pb-12">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-amber-100 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-stone-600 hover:text-amber-600 font-medium text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> 取消
          </Link>
          <h1 className="font-bold text-stone-800">上架交換道具</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold">
            {isVip ? '👑 VIP 無限額度' : `額度 ${activeCount}/10`}
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 mt-2">
        {!isVip && activeCount >= 10 && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-900 text-sm flex items-center gap-1">
                <Crown className="w-4 h-4 text-amber-600" /> 已達免費會員 10 件上架上限
              </p>
              <p className="text-xs text-amber-800 mt-0.5">升級 VIP (NT$99/月) 立即解鎖無限上架與自動配對！</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-3xl shadow-sm border border-amber-100">
          {/* 圖片上傳區 */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              道具圖片 ({files.length}/{maxImages} 張)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200">
                  <img src={src} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {files.length < maxImages && (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50 flex flex-col items-center justify-center cursor-pointer text-amber-600 transition">
                  <ImagePlus className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">新增圖片</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* 商品名稱 */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">道具名稱 *</label>
            <input
              type="text"
              required
              placeholder="例如：SSR 夢幻月兔星空背景"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 text-stone-800 text-sm"
            />
          </div>

          {/* 稀有度選擇 */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">稀有度 *</label>
            <div className="flex gap-2">
              {RARITIES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRarity(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    rarity === r
                      ? 'bg-amber-400 text-stone-900 border-amber-500 shadow-sm'
                      : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 商品分類 */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">道具分類 *</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition ${
                    category === c.value
                      ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 想交換的物品 */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">🎯 想交換的物品 (Wanted Item)</label>
            <input
              type="text"
              placeholder="例如：SSR月光城堡 / 同池SR頭髮"
              value={wantedItem}
              onChange={(e) => setWantedItem(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-amber-50/50 border border-amber-200 focus:outline-none focus:border-amber-400 text-stone-800 text-sm"
            />
          </div>

          {/* 商品說明 */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">補充說明</label>
            <textarea
              rows={3}
              placeholder="可填寫複數數量、接受 N換1 或留言討論..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-amber-400 text-stone-800 text-sm"
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-500 font-semibold text-center">{errorMsg}</p>}

          <button
            type="submit"
            disabled={submitting || (!isVip && activeCount >= 10)}
            className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold shadow-md shadow-amber-200 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {submitting ? '圖片壓縮上傳中...' : '確認發布到寵物島市集'}
          </button>
        </form>
      </main>
    </div>
  );
}