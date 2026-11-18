'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RarityBadge, RarityType } from '@/components/RarityBadge';
import { ArrowLeft, Upload, X, Sparkles, Image as ImageIcon, Repeat, HeartHandshake } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { id: 'fashion', label: '🧑 HOM' },
  { id: 'island', label: '🏝️ 島嶼裝飾' },
  { id: 'pet', label: '🐾 寵物' },
  { id: 'other', label: '📦 其他' },
];

const RARITIES: RarityType[] = ['SR', 'R', 'N'];

export default function NewItemPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [postType, setPostType] = useState<'offer' | 'wish'>('offer');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('fashion');
  const [rarity, setRarity] = useState<RarityType>('SR');
  const [wantedItems, setWantedItems] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUserId(user.id);
      }
    };
    checkUser();
  }, [router, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    if (files.length + selected.length > 3) {
      setErrorMsg('最多可上傳 3 張圖片喔！');
      return;
    }
    setErrorMsg('');
    const newFiles = [...files, ...selected];
    setFiles(newFiles);
    setPreviews(newFiles.map((file) => URL.createObjectURL(file)));
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setPreviews(updatedFiles.map((file) => URL.createObjectURL(file)));
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 1000;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/webp',
          0.8
        );
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!title.trim() || !wantedItems.trim()) {
      setErrorMsg(
        postType === 'offer'
          ? '請填寫「持有道具名稱」與「想交換的物品」喔！'
          : '請填寫「想徵求的道具名稱」與「願意提供的籌碼」喔！'
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const compressedBlob = await compressImage(file);
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, compressedBlob, { contentType: 'image/webp' });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('item-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_type: postType,
          title: title.trim(),
          category,
          rarity,
          wanted_items: wantedItems.trim(),
          description: description.trim(),
          images: uploadedUrls,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '發布失敗');
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
    <div className="min-h-screen bg-[#FFFDF7] text-[#4A4238] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#8C7B6B] hover:text-[#4A4238] mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> 返回寵物島市集
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-[#F3E8D2] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-6 h-6 text-[#F59E0B]" />
            <h1 className="text-2xl font-bold">發布寵物島貼文</h1>
          </div>

          {/* 切換貼文類型：交換市集 vs 島民許願池 */}
          <div className="grid grid-cols-2 gap-3 mb-6 p-1.5 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3]">
            <button
              type="button"
              onClick={() => setPostType('offer')}
              className={`py-2.5 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition ${
                postType === 'offer'
                  ? 'bg-[#F59E0B] text-white shadow-sm'
                  : 'text-[#6E6254] hover:text-[#4A4238]'
              }`}
            >
              <Repeat className="w-4 h-4" /> 🔄 交換市集（我有道具）
            </button>
            <button
              type="button"
              onClick={() => setPostType('wish')}
              className={`py-2.5 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition ${
                postType === 'wish'
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'text-[#6E6254] hover:text-[#4A4238]'
              }`}
            >
              <HeartHandshake className="w-4 h-4" /> 🙏 島民許願池（徵求）
            </button>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">
                {postType === 'offer' ? '持有道具名稱' : '想徵求的道具名稱'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder={
                  postType === 'offer'
                    ? '例如：星夜夢境長裙 / 櫻花樹島嶼裝飾'
                    : '例如：急徵！復刻池 SR 夢幻星空長髮'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3] focus:outline-none focus:border-[#F59E0B]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">道具分類</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3] focus:outline-none focus:border-[#F59E0B]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">稀有度</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {RARITIES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRarity(r)}
                      className={`px-3 py-1.5 rounded-xl border transition ${
                        rarity === r
                          ? 'ring-2 ring-[#F59E0B] bg-[#FEF3C7] border-[#F59E0B]'
                          : 'bg-white border-[#E6D8C3] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <RarityBadge rarity={r} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {postType === 'offer'
                  ? '想交換的物品（許願清單）'
                  : '我願意提供的交換籌碼'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder={
                  postType === 'offer'
                    ? '例如：同稀有度髮型、復刻池 SR 眼睛、或留言報價'
                    : '例如：可提供圖鑑內任意 2 件 SR 替換、或私訊看清單'
                }
                value={wantedItems}
                onChange={(e) => setWantedItems(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3] focus:outline-none focus:border-[#F59E0B]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">補充說明（選填）</label>
              <textarea
                rows={3}
                placeholder="可備註可交換時段、比例或補充細節..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#F59E0B]" />
                {postType === 'offer'
                  ? '道具截圖（最多 3 張，自動壓縮為 WebP）'
                  : '參考圖 / 籌碼截圖（選填，最多 3 張）'}
              </label>

              <div className="flex flex-wrap gap-3">
                {previews.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#E6D8C3]"
                  >
                    <img src={src} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {files.length < 3 && (
                  <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#D8C7AE] hover:border-[#F59E0B] bg-[#FFFDF7] flex flex-col items-center justify-center cursor-pointer text-[#8C7B6B] hover:text-[#F59E0B] transition">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-xs">新增圖片</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 rounded-2xl text-white font-bold shadow-sm transition disabled:opacity-50 ${
                postType === 'offer'
                  ? 'bg-[#F59E0B] hover:bg-[#D97706]'
                  : 'bg-pink-500 hover:bg-pink-600'
              }`}
            >
              {submitting
                ? '正在上傳並發布中...'
                : postType === 'offer'
                ? '✨ 確認發布交換道具'
                : '🙏 確認發布許願徵求'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}