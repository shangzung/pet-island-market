'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Search, Send, MessageSquareHeart, UserCheck } from 'lucide-react';

interface DirectChatModalProps {
  currentUserId: string;
  initialTargetUserId?: string | null;
  onClose: () => void;
}

export function DirectChatModal({
  currentUserId,
  initialTargetUserId,
  onClose,
}: DirectChatModalProps) {
  const supabase = createClient();
  const [searchGameId, setSearchGameId] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 載入所有歷史聯絡人與預設開啟的對象
  useEffect(() => {
    const loadConversations = async () => {
      const { data: allMsgs } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      const partnerIds = new Set<string>();
      if (initialTargetUserId && initialTargetUserId !== currentUserId) {
        partnerIds.add(initialTargetUserId);
      }
      if (allMsgs) {
        allMsgs.forEach((m) => {
          const otherId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;
          partnerIds.add(otherId);
        });
      }

      if (partnerIds.size > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, game_id, game_name, nickname')
          .in('id', Array.from(partnerIds));

        if (usersData) {
          setContacts(usersData);
          if (initialTargetUserId) {
            const target = usersData.find((u) => u.id === initialTargetUserId);
            if (target) setSelectedPartner(target);
          } else if (usersData.length > 0 && !selectedPartner) {
            setSelectedPartner(usersData[0]);
          }
        }
      }
    };

    loadConversations();
  }, [currentUserId, initialTargetUserId]);

  // 載入與目前選定對象的對話紀錄 + 訂閱即時訊息
  useEffect(() => {
    if (!selectedPartner) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedPartner.id}),and(sender_id.eq.${selectedPartner.id},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
        // 將對方傳來的未讀訊息標記為已讀
        const unreadIds = data
          .filter((m) => m.receiver_id === currentUserId && !m.is_read)
          .map((m) => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('direct_messages')
            .update({ is_read: true })
            .in('id', unreadIds);
        }
      }
    };

    fetchMessages();

    // 訂閱 Supabase Realtime 即時接收新訊息
    const channel = supabase
      .channel(`dm-${currentUserId}-${selectedPartner.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const msg = payload.new as any;
          const isBetweenUs =
            (msg.sender_id === currentUserId && msg.receiver_id === selectedPartner.id) ||
            (msg.sender_id === selectedPartner.id && msg.receiver_id === currentUserId);

          if (isBetweenUs) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPartner, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 透過輸入「對方遊戲 ID」搜尋玩家並開啟 1v1 聊天
  const handleSearchByGameId = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = searchGameId.trim();
    if (!cleanId) return;

    setSearching(true);
    setSearchError('');

    const { data: foundUser } = await supabase
      .from('users')
      .select('id, game_id, game_name, nickname')
      .eq('game_id', cleanId)
      .maybeSingle();

    if (!foundUser) {
      setSearchError(`找不到遊戲 ID 為「${cleanId}」的玩家，請確認對方是否已註冊並綁定 ID。`);
      setSearching(false);
      return;
    }

    if (foundUser.id === currentUserId) {
      setSearchError('不能跟自己開啟 1v1 聊天喔！');
      setSearching(false);
      return;
    }

    setContacts((prev) => {
      if (prev.some((c) => c.id === foundUser.id)) return prev;
      return [foundUser, ...prev];
    });
    setSelectedPartner(foundUser);
    setSearchGameId('');
    setSearching(false);
  };

  // 發送 1v1 私訊
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !newMessage.trim()) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    const { data: inserted, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: currentUserId,
        receiver_id: selectedPartner.id,
        content,
      })
      .select()
      .single();

    if (!error && inserted) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === inserted.id)) return prev;
        return [...prev, inserted];
      });
    }
    setSending(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-3xl w-full h-[82vh] border border-[#F3E8D2] shadow-2xl flex flex-col overflow-hidden text-[#4A4238]"
      >
        {/* 頂部標題列 */}
        <div className="px-6 py-4 bg-[#FFFDF7] border-b border-[#F3E8D2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="font-bold text-lg">1 對 1 島民私訊聊天室</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white border border-[#E6D8C3] text-[#8C7B6B] hover:text-[#4A4238]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 主體左右分欄 */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* 左側：輸入遊戲 ID 搜尋 + 聯絡人列表 */}
          <div className="w-full sm:w-72 border-b sm:border-b-0 sm:border-r border-[#F3E8D2] bg-[#FFFDF7]/60 flex flex-col">
            <form onSubmit={handleSearchByGameId} className="p-3.5 border-b border-[#F3E8D2]">
              <label className="block text-xs font-bold text-[#8C7B6B] mb-1.5">
                輸入對方遊戲 ID 開啟聊天：
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="輸入對方遊戲 ID..."
                  value={searchGameId}
                  onChange={(e) => setSearchGameId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#E6D8C3] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
                <button
                  type="submit"
                  disabled={searching || !searchGameId.trim()}
                  className="px-3 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
              {searchError && (
                <p className="text-[11px] text-red-500 mt-1.5 leading-snug">{searchError}</p>
              )}
            </form>

            {/* 聊天對象清單 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-36 sm:max-h-none">
              {contacts.length === 0 ? (
                <p className="text-xs text-[#A39585] text-center py-6 px-3">
                  尚無聊天紀錄，請在上方輸入對方遊戲 ID 開始對話！
                </p>
              ) : (
                contacts.map((c) => {
                  const isSelected = selectedPartner?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedPartner(c)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-2xl transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#FEF3C7] border border-[#F59E0B]'
                          : 'hover:bg-white border border-transparent'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-[#4A4238]">
                          {c.game_name || c.nickname || '島民玩家'}
                        </div>
                        <div className="text-[11px] text-[#8C7B6B]">
                          ID: {c.game_id || '未設定'}
                        </div>
                      </div>
                      <UserCheck className="w-4 h-4 text-[#D97706] opacity-70" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 右側：1v1 對話泡泡區 */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedPartner ? (
              <>
                <div className="px-5 py-3 border-b border-[#F3E8D2] bg-[#FFFDF7]/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm">
                      {selectedPartner.game_name || selectedPartner.nickname}
                    </span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-medium">
                      遊戲 ID：{selectedPartner.game_id || '無'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FFFDF7]/30">
                  {messages.length === 0 ? (
                    <div className="text-center text-xs text-[#A39585] py-12">
                      已連線！傳送第一則訊息給「{selectedPartner.game_name || selectedPartner.nickname}」洽談交換吧 ✨
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === currentUserId;
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                              isMe
                                ? 'bg-[#F59E0B] text-white rounded-br-xs'
                                : 'bg-white border border-[#E6D8C3] text-[#4A4238] rounded-bl-xs'
                            }`}
                          >
                            {m.content}
                          </div>
                          <span className="text-[10px] text-[#A39585] mt-1 px-1">
                            {new Date(m.created_at).toLocaleTimeString('zh-TW', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={handleSend}
                  className="p-3.5 border-t border-[#F3E8D2] bg-white flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="輸入私訊內容..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                    className="flex-1 px-4 py-2.5 rounded-full bg-[#FFFDF7] border border-[#E6D8C3] text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-5 py-2.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> 傳送
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#A39585] p-6 text-center">
                <MessageSquareHeart className="w-12 h-12 text-[#F59E0B]/50 mb-2" />
                <p className="text-sm font-medium">請在左側輸入對方遊戲 ID</p>
                <p className="text-xs mt-1">即可與對方開啟專屬 1 對 1 聊天室</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}