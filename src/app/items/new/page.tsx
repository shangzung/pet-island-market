'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RarityBadge, RarityType } from '@/components/RarityBadge';
import { ArrowLeft, Upload, X, Sparkles, Image as ImageIcon } from 'lucide-react';
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
      setErrorMsg('免費會員最多可上傳 3 張圖片喔！');
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
      setErrorMsg('請填寫「道具名稱」與「想交換的物品」喔！');
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
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-[#F59E0B]" />
            <h1 className="text-2xl font-bold">發布交換道具</h1>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">
                道具名稱 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="例如：星夜夢境長裙 / 櫻花樹島嶼裝飾"
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
                想交換的物品（許願清單） <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="例如：同稀有度髮型、復刻池 SR 眼睛、或留言報價"
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
                placeholder="可備註遊戲內 ID、可交換時段或複數數量..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF7] border border-[#E6D8C3] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#F59E0B]" />
                道具截圖（最多 3 張，自動壓縮為 WebP）
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
              className="w-full py-3.5 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold shadow-sm transition disabled:opacity-50"
            >
              {submitting ? '正在上傳圖片並發布中...' : '✨ 確認發布到寵物島市集'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}