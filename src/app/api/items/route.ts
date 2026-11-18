import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { checkSensitiveContent } from '@/lib/contentFilter';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const headerList = await headers();

    const forwardedFor = headerList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '請先登入帳號' }, { status: 401 });
    }

    const body = await request.json();

    // 敏感關鍵字自動過濾（防現金買賣 / 代儲 / 外掛）
    const combinedText = `${body.title || ''} ${body.wanted_items || ''} ${body.description || ''}`;
    const filterResult = checkSensitiveContent(combinedText);
    if (!filterResult.isClean) {
      return NextResponse.json(
        {
          error: `⚠️ 安全系統攔截：內容包含禁止的敏感關鍵字「${filterResult.matchedWord}」。本市集嚴禁現金買賣、代儲或外掛相關交易！`,
        },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin, is_banned')
      .eq('id', user.id)
      .single();

    if (profile?.is_banned) {
      return NextResponse.json(
        { error: '您的帳號已被管理員停權，無法發布道具或許願徵求。' },
        { status: 403 }
      );
    }

    const isAdmin = profile?.is_admin === true;

    if (!isAdmin) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: recentItems } = await supabase
        .from('items')
        .select('id')
        .gte('created_at', twentyFourHoursAgo)
        .or(`user_id.eq.${user.id},ip_address.eq.${ip}`);

      if (recentItems && recentItems.length > 0) {
        return NextResponse.json(
          { error: '防多開限制：每個帳號與同一個網路 IP 每 24 小時只能發布 1 篇貼文喔！' },
          { status: 429 }
        );
      }
    }

    await supabase.rpc('cleanup_expired_items');

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('items').insert({
      user_id: user.id,
      post_type: body.post_type === 'wish' ? 'wish' : 'offer',
      title: body.title,
      category: body.category,
      rarity: body.rarity,
      wanted_items: body.wanted_items,
      description: body.description,
      images: body.images || [],
      status: 'active',
      ip_address: ip,
      expires_at: expiresAt,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 });
  }
}