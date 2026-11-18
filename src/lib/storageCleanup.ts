import { SupabaseClient } from '@supabase/supabase-js';

export async function removeUnusedStorageImages(
  supabase: SupabaseClient,
  imageUrls: string[] | null | undefined,
  forceDelete = false
) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) return;

  const pathsToDelete: string[] = [];

  for (const url of imageUrls) {
    if (!url || !url.includes('/item-images/')) continue;

    // 若非強制刪除，先檢查這張圖是否已核准進入「共用圖鑑庫」
    if (!forceDelete) {
      const { data: inCatalog } = await supabase
        .from('item_catalog')
        .select('id')
        .eq('image_url', url)
        .eq('status', 'approved')
        .maybeSingle();

      // 若已核准在圖鑑庫中，保留檔案給其他玩家選用，不刪實體檔
      if (inCatalog) continue;
    }

    // 若不在圖鑑庫中（或未通過審核），同步清除圖鑑候選紀錄並取得 Storage 路徑
    await supabase.from('item_catalog').delete().eq('image_url', url);

    const parts = url.split('/item-images/');
    if (parts.length > 1 && parts[1]) {
      pathsToDelete.push(decodeURIComponent(parts[1]));
    }
  }

  if (pathsToDelete.length > 0) {
    await supabase.storage.from('item-images').remove(pathsToDelete);
  }
}