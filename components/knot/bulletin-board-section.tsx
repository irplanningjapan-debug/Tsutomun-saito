'use client'

import { useEffect, useState } from 'react'
import { Megaphone, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { mapDbBulletinPostToBulletinPost, type BulletinPost } from '@/lib/knot/data'

export function BulletinBoardSection() {
  const [posts, setPosts] = useState<BulletinPost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    // sort_order drives the admin-defined display order. If the column is
    // ever unavailable (e.g. before a migration lands), fall back to the
    // newest-first post_date/created_at order instead of failing outright,
    // so the section never silently disappears.
    supabase
      .from('bulletin_posts')
      .select('id, title, body, post_date, is_important, created_at, sort_order')
      .order('sort_order', { ascending: true })
      .then(async ({ data, error }) => {
        if (!error && data) {
          setPosts(data.map(mapDbBulletinPostToBulletinPost))
          setIsLoading(false)
          return
        }
        const fallback = await supabase
          .from('bulletin_posts')
          .select('id, title, body, post_date, is_important, created_at')
          .order('post_date', { ascending: false })
          .order('created_at', { ascending: false })
        if (!fallback.error && fallback.data) {
          setPosts(fallback.data.map(mapDbBulletinPostToBulletinPost))
        }
        setIsLoading(false)
      })
  }, [])

  // Always render the section frame in its fixed position (right after the
  // hero, above UPCOMING EVENTS) so it never disappears while loading or when
  // there are temporarily no posts.
  return (
    <section id="bulletin" className="border-b border-sky-100 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Megaphone size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-primary">KNOT BOARD</p>
            <h2 className="text-xl font-black text-slate-900">KNOT掲示板 / 運営からのおしらせ</h2>
          </div>
        </div>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl border border-sky-100 bg-sky-50/50" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-8 text-center text-sm font-bold text-slate-400">
            現在、掲示板のお知らせはありません
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 6).map((post, index) => (
              <article
                key={post.id ?? `${post.title}-${index}`}
                className={`rounded-2xl border p-5 ${post.isImportant ? 'border-amber-300 bg-amber-50' : 'border-sky-100 bg-sky-50/50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <time className="text-xs font-bold text-slate-500">{post.postDate}</time>
                  {post.isImportant && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black text-slate-900">
                      <AlertCircle size={12} />重要
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-black leading-6 text-slate-900">{post.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-600">{post.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
