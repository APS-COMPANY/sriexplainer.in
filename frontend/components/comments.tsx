"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MessageSquare, ThumbsUp, Send, User as UserIcon, Trash2, Pin, Edit3, Reply, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { showSuccess, showError } from "./notification-provider";

export type CommentUser = {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
};

export type CommentItem = {
  id: string;
  episodeId: string;
  userId: string;
  parentId?: string | null;
  content: string;
  likesCount: number;
  isPinned: boolean;
  userLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  replies?: CommentItem[];
};

export function EpisodeComments({ episodeId, commentsDisabled, commentsLocked }: { episodeId: string; commentsDisabled?: boolean; commentsLocked?: boolean }) {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<"newest" | "top" | "oldest">("newest");
  const [newComment, setNewComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("sri_token") : null;
    setIsLoggedIn(!!token);
  }, []);

  const { data: comments = [], isLoading } = useQuery<CommentItem[]>({
    queryKey: ["comments", episodeId, sort],
    queryFn: async () => (await api.get(`/episodes/${episodeId}/comments?sort=${sort}`)).data,
    enabled: !!episodeId
  });

  const postMutation = useMutation({
    mutationFn: async ({ content, parentId, gName }: { content: string; parentId?: string; gName?: string }) => {
      return (await api.post(`/episodes/${episodeId}/comments`, { content, parentId, guestName: gName || guestName })).data;
    },
    onMutate: async ({ content, parentId, gName }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", episodeId, sort] });
      const previousComments = queryClient.getQueryData<CommentItem[]>(["comments", episodeId, sort]) || [];

      const tempId = `temp_${Date.now()}`;
      const optimisticComment: CommentItem = {
        id: tempId,
        episodeId,
        userId: "temp",
        parentId: parentId || null,
        content,
        likesCount: 0,
        isPinned: false,
        userLiked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: "temp",
          name: gName || guestName || "You",
          avatar: "",
          role: "user"
        },
        replies: []
      };

      if (!parentId) {
        queryClient.setQueryData(["comments", episodeId, sort], [optimisticComment, ...previousComments]);
      } else {
        // Optimistically add nested reply
        const updateReplies = (list: CommentItem[]): CommentItem[] => {
          return list.map((item) => {
            if (item.id === parentId) {
              return {
                ...item,
                replies: [...(item.replies || []), optimisticComment]
              };
            }
            if (item.replies && item.replies.length > 0) {
              return { ...item, replies: updateReplies(item.replies) };
            }
            return item;
          });
        };
        queryClient.setQueryData(["comments", episodeId, sort], updateReplies(previousComments));
      }

      setNewComment("");
      setReplyToId(null);
      setReplyContent("");

      return { previousComments, tempId };
    },
    onSuccess: (savedComment: any, _vars, context) => {
      if (!savedComment) return;
      const currentList = queryClient.getQueryData<CommentItem[]>(["comments", episodeId, sort]) || [];
      
      const replaceTemp = (list: CommentItem[]): CommentItem[] => {
        return list.map((item) => {
          if (item.id === context?.tempId) {
            return { ...item, ...savedComment, id: savedComment._id || savedComment.id || item.id };
          }
          if (item.replies && item.replies.length > 0) {
            return { ...item, replies: replaceTemp(item.replies) };
          }
          return item;
        });
      };

      queryClient.setQueryData(["comments", episodeId, sort], replaceTemp(currentList));
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", episodeId, sort], context.previousComments);
      }
      const msg = err?.response?.data?.message || err?.message || "Could not post comment. Please try again.";
      showError(msg, "Comment Error");
    }
  });

  const likeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return (await api.post(`/comments/${commentId}/like`)).data;
    },
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: ["comments", episodeId, sort] });
      const previousComments = queryClient.getQueryData<CommentItem[]>(["comments", episodeId, sort]) || [];

      const toggleLike = (list: CommentItem[]): CommentItem[] => {
        return list.map((item) => {
          if (item.id === commentId) {
            const nextLiked = !item.userLiked;
            return {
              ...item,
              userLiked: nextLiked,
              likesCount: nextLiked ? item.likesCount + 1 : Math.max(0, item.likesCount - 1)
            };
          }
          if (item.replies && item.replies.length > 0) {
            return { ...item, replies: toggleLike(item.replies) };
          }
          return item;
        });
      };

      queryClient.setQueryData(["comments", episodeId, sort], toggleLike(previousComments));
      return { previousComments };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", episodeId, sort], context.previousComments);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return (await api.delete(`/comments/${commentId}`)).data;
    },
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: ["comments", episodeId, sort] });
      const previousComments = queryClient.getQueryData<CommentItem[]>(["comments", episodeId, sort]) || [];

      const removeComment = (list: CommentItem[]): CommentItem[] => {
        return list
          .filter((item) => item.id !== commentId)
          .map((item) => ({
            ...item,
            replies: item.replies ? removeComment(item.replies) : []
          }));
      };

      queryClient.setQueryData(["comments", episodeId, sort], removeComment(previousComments));
      return { previousComments };
    }
  });

  const pinMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return (await api.post(`/comments/${commentId}/pin`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", episodeId] });
    }
  });

  const editMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      return (await api.patch(`/comments/${commentId}`, { content })).data;
    },
    onSuccess: () => {
      setEditingId(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["comments", episodeId] });
    }
  });

  if (commentsDisabled) {
    return (
      <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/50 p-6 text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
        <Lock size={16} /> Comments have been disabled for this episode.
      </div>
    );
  }

  return (
    <section className="mt-12 space-y-6">
      {/* Header & Sort Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare size={22} className="text-rose-500" /> Episode Comments ({comments.length})
        </h3>

        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
          <span>Sort by:</span>
          {(["newest", "top", "oldest"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                sort === s ? "bg-rose-600 text-white font-bold" : "hover:text-white hover:bg-white/10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Comment Box */}
      {commentsLocked ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-semibold text-amber-400 flex items-center gap-2">
          <Lock size={14} /> Comments are locked for this episode. Existing comments can still be read.
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newComment.trim() && !postMutation.isPending) {
              postMutation.mutate({ content: newComment.trim() });
            }
          }}
          className="space-y-3"
        >
          {!isLoggedIn && (
            <div className="flex items-center gap-2">
              <UserIcon size={16} className="text-rose-400" />
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your Name (Optional Guest Name)"
                className="w-full max-w-xs rounded-xl bg-zinc-900/90 border border-white/10 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts about this episode..."
            className="w-full rounded-2xl bg-zinc-900/90 border border-white/10 p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors min-h-[100px]"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={postMutation.isPending || !newComment.trim()}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              <Send size={14} /> {postMutation.isPending ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      )}

      {/* Comment Threads List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 rounded-2xl bg-zinc-900/60 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onLike={() => likeMutation.mutate(comment.id)}
              onDelete={() => deleteMutation.mutate(comment.id)}
              onPin={() => pinMutation.mutate(comment.id)}
              replyToId={replyToId}
              setReplyToId={setReplyToId}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onReplySubmit={(parentId, text) => postMutation.mutate({ content: text, parentId })}
              editingId={editingId}
              setEditingId={setEditingId}
              editContent={editContent}
              setEditContent={setEditContent}
              onEditSubmit={(commentId, text) => editMutation.mutate({ commentId, content: text })}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-zinc-500 py-8">
          No comments yet. Be the first to share your thoughts!
        </p>
      )}
    </section>
  );
}

function CommentCard({
  comment,
  onLike,
  onDelete,
  onPin,
  replyToId,
  setReplyToId,
  replyContent,
  setReplyContent,
  onReplySubmit,
  editingId,
  setEditingId,
  editContent,
  setEditContent,
  onEditSubmit
}: {
  comment: CommentItem;
  onLike: () => void;
  onDelete: () => void;
  onPin: () => void;
  replyToId: string | null;
  setReplyToId: (id: string | null) => void;
  replyContent: string;
  setReplyContent: (s: string) => void;
  onReplySubmit: (parentId: string, text: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editContent: string;
  setEditContent: (s: string) => void;
  onEditSubmit: (id: string, text: string) => void;
}) {
  const isEditing = editingId === comment.id;
  const isReplying = replyToId === comment.id;
  const [showReplies, setShowReplies] = useState(true);

  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      comment.isPinned ? "bg-rose-950/20 border-rose-500/30" : "bg-zinc-900/60 border-white/5 hover:border-white/10"
    }`}>
      {/* Pinned Badge */}
      {comment.isPinned && (
        <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-black text-rose-400 uppercase tracking-wider">
          <Pin size={12} className="rotate-45" /> Pinned Comment
        </div>
      )}

      {/* Comment Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-rose-600 font-bold text-white text-xs uppercase shadow-md">
            {comment.user.avatar ? (
              <img src={comment.user.avatar} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              comment.user.name ? comment.user.name.charAt(0) : "G"
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{comment.user.name || "Guest Viewer"}</span>
              {comment.user.role === "admin" && (
                <span className="rounded bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 uppercase">
                  Admin
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-500">
              {new Date(comment.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 text-zinc-400">
          <button
            onClick={onPin}
            title="Pin Comment (Admin)"
            className="p-1 hover:text-white text-zinc-500 transition-colors"
          >
            <Pin size={14} />
          </button>
          <button
            onClick={() => {
              setEditingId(comment.id);
              setEditContent(comment.content);
            }}
            title="Edit Comment"
            className="p-1 hover:text-white text-zinc-500 transition-colors"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={onDelete}
            title="Delete Comment"
            className="p-1 hover:text-rose-400 text-zinc-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Body Content */}
      {isEditing ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded-xl bg-zinc-950 border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-rose-500"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditingId(null)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => onEditSubmit(comment.id, editContent)}
              className="px-4 py-1.5 rounded-lg bg-rose-600 text-xs font-bold text-white"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-200 leading-relaxed font-normal">{comment.content}</p>
      )}

      {/* Footer Likes & Reply Buttons */}
      <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-zinc-400">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 transition-colors active:scale-110 ${
            comment.userLiked ? "text-rose-500 font-bold" : "hover:text-white"
          }`}
        >
          <ThumbsUp size={14} fill={comment.userLiked ? "currentColor" : "none"} />
          <span>{comment.likesCount}</span>
        </button>

        <button
          onClick={() => {
            setReplyToId(replyToId === comment.id ? null : comment.id);
            setReplyContent("");
          }}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <Reply size={14} /> Reply
        </button>

        {comment.replies && comment.replies.length > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold ml-auto"
          >
            {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{showReplies ? "Hide Replies" : `View ${comment.replies.length} Replies`}</span>
          </button>
        )}
      </div>

      {/* Reply Form */}
      {isReplying && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (replyContent.trim()) {
              onReplySubmit(comment.id, replyContent.trim());
            }
          }}
          className="mt-3 space-y-2 border-t border-white/10 pt-3"
        >
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`Reply to ${comment.user.name}...`}
            className="w-full rounded-xl bg-zinc-950 border border-white/10 p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 min-h-[60px]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReplyToId(null)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!replyContent.trim()}
              className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 active:scale-95"
            >
              Post Reply
            </button>
          </div>
        </form>
      )}

      {/* Nested Replies List */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-white/10 pl-4">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              onLike={onLike}
              onDelete={onDelete}
              onPin={onPin}
              replyToId={replyToId}
              setReplyToId={setReplyToId}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onReplySubmit={onReplySubmit}
              editingId={editingId}
              setEditingId={setEditingId}
              editContent={editContent}
              setEditContent={setEditContent}
              onEditSubmit={onEditSubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
