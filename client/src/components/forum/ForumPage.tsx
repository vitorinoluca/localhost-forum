import { Heart, HeartCrack, MessageCircle, Trash2 } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { apiUrl, type AuthUser } from '../../api';
import { getAdSlot, shouldShowAdPlacement } from '../../lib/ads-config';
import { siteDisplayName } from '../../lib/site-brand';
import type { ForumAttachment, ForumPost, Route } from '../../types';
import { AdSenseSlot } from '../ads/AdSenseSlot';
import { Alert, Field } from '../common/FormControls';
import { AvatarCircle } from '../profile/ProfileViews';

export function ForumPage({
  user,
  forumLoading,
  message,
  postLoading,
  posts,
  onImageOpen,
  postTitle,
  postBody,
  onPostTitleChange,
  onPostBodyChange,
  onPostImagesChange,
  postImages,
  onCreatePost,
  onReact,
  onDeletePost,
  onNavigate,
  showAds,
}: {
  user: AuthUser | null;
  forumLoading: boolean;
  message: string;
  postLoading: boolean;
  posts: ForumPost[];
  onImageOpen: (attachment: ForumAttachment) => void;
  postTitle: string;
  postBody: string;
  onPostTitleChange: (value: string) => void;
  onPostBodyChange: (value: string) => void;
  onPostImagesChange: (files: FileList | null) => void;
  postImages: FileList | null;
  onCreatePost: (event: FormEvent<HTMLFormElement>) => void;
  onReact: (postId: string, reaction: 'like' | 'dislike') => void;
  onDeletePost: (postId: string) => Promise<boolean>;
  onNavigate: (route: Route) => void;
  showAds: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const feedAdSlot = showAds ? getAdSlot('feed') : undefined;
  const showFeedAdRow = shouldShowAdPlacement(showAds, feedAdSlot);
  const wasLoadingRef = useRef(false);

  const previewUrls = useMemo(() => {
    if (!postImages?.length) return [];
    return Array.from(postImages).map((file) => URL.createObjectURL(file));
  }, [postImages]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    if (wasLoadingRef.current && !postLoading && postTitle === '') {
      setIsModalOpen(false);
    }
    wasLoadingRef.current = postLoading;
  }, [postLoading, postTitle]);

  return (
    <section className='mx-auto w-full max-w-7xl px-6 py-12'>
      <div className='space-y-12'>
        <section className='flex flex-col gap-6 border-b border-white/10 pb-10 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h1 className='font-mono text-3xl font-semibold tracking-tight text-white sm:text-4xl'>
              {siteDisplayName}
            </h1>
            <p className='mt-3 max-w-lg text-sm leading-relaxed text-neutral-400'>
              Ideas, proyectos y conversación entre desarrolladores.
            </p>
          </div>
          {user ? (
            <button
              className='flex items-center justify-center rounded-sm border border-white/10 bg-transparent px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:border-[#3b82f6] hover:bg-[#3b82f6] active:scale-[0.98] disabled:opacity-30'
              onClick={() => setIsModalOpen(true)}
              type='button'
            >
              Publicar
            </button>
          ) : null}
        </section>

        {message ? <Alert>{message}</Alert> : null}

        <div
          className={
            forumLoading || posts.length
              ? 'columns-1 gap-x-4 sm:columns-2 lg:columns-3 xl:columns-4'
              : 'py-20 text-center'
          }
        >
          {forumLoading ? (
            Array.from({ length: 10 }).map((_, index) => <PostSkeleton index={index} key={index} />)
          ) : posts.length ? (
            posts.flatMap((post, index) => {
              const nodes = [
                <PostCard
                  key={post.id}
                  currentUserId={user?.id ?? null}
                  onDeletePost={onDeletePost}
                  onImageOpen={onImageOpen}
                  onNavigate={onNavigate}
                  onReact={onReact}
                  post={post}
                />,
              ];
              if (showFeedAdRow && index === 3) {
                nodes.push(
                  <div
                    key={`ad-feed-${post.id}`}
                    className='break-inside-avoid mb-6 [column-span:all] flex min-h-[120px] justify-center border-y border-white/5 bg-neutral-950/60 py-8'
                  >
                    <AdSenseSlot slot={feedAdSlot} />
                  </div>,
                );
              }
              return nodes;
            })
          ) : (
            <p className='text-xs font-bold uppercase tracking-widest text-neutral-600'>
              Todavía no hay publicaciones
            </p>
          )}
        </div>
      </div>

      {isModalOpen ? (
        <div
          aria-labelledby='modal-new-post-title'
          aria-modal='true'
          className='fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-6'
          role='dialog'
        >
          <div
            className='absolute inset-0 bg-black/90 backdrop-blur-sm'
            onClick={() => setIsModalOpen(false)}
            role='presentation'
          />
          <div className='relative z-10 w-full max-w-lg rounded-sm border border-white/10 bg-[#0f0f12] p-8 shadow-2xl duration-300 animate-in fade-in zoom-in'>
            <div className='mb-8 flex items-center justify-between'>
              <h2
                className='font-["Outfit"] text-2xl font-bold uppercase tracking-tighter text-white'
                id='modal-new-post-title'
              >
                Nueva publicación
              </h2>
              <button
                aria-label='Cerrar ventana de publicación'
                className='p-2 text-neutral-500 transition hover:text-white'
                onClick={() => setIsModalOpen(false)}
                type='button'
              >
                <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    d='M6 18L18 6M6 6l12 12'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='1.5'
                  />
                </svg>
              </button>
            </div>

            <form className='space-y-6' onSubmit={onCreatePost}>
              <Field
                label='Título'
                maxLength={120}
                placeholder='Título de la publicación'
                value={postTitle}
                onChange={onPostTitleChange}
              />
              <div className='space-y-1.5'>
                <span className='text-[10px] font-bold uppercase tracking-widest text-neutral-500'>
                  Descripción
                </span>
                <textarea
                  className='min-h-24 w-full resize-none rounded-sm border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#3b82f6]'
                  maxLength={5000}
                  required
                  value={postBody}
                  placeholder='Contá qué muestras o qué querés compartir…'
                  onChange={(event) => onPostBodyChange(event.target.value)}
                />
              </div>
              <div className='space-y-3'>
                <span className='text-[10px] font-bold uppercase tracking-widest text-neutral-500'>
                  Imágenes (opcional)
                </span>

                {previewUrls.length > 0 ? (
                  <div className='mb-2 grid grid-cols-4 gap-2'>
                    {previewUrls.map((url) => (
                      <div key={url} className='relative aspect-square border border-white/5 bg-black'>
                        <img
                          alt=''
                          className='h-full w-full object-cover'
                          src={url}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                <label className='relative flex cursor-pointer items-center justify-center border border-dashed border-white/10 bg-black/40 py-8 transition hover:border-[#3b82f6]/40'>
                  <input
                    accept='image/jpeg,image/png,image/webp,image/gif'
                    className='absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0'
                    multiple
                    type='file'
                    onChange={(event) => onPostImagesChange(event.target.files)}
                  />
                  <p className='text-[10px] font-bold uppercase tracking-widest text-neutral-600'>
                    {postImages && postImages.length > 0
                      ? `${postImages.length} archivo(s) seleccionado(s)`
                      : 'Arrastrá imágenes o tocá para elegir'}
                  </p>
                </label>
              </div>
              <button
                className='flex w-full items-center justify-center rounded-sm border border-[#3b82f6] bg-[#3b82f6] px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#2563eb] active:scale-[0.98] disabled:opacity-30'
                disabled={postLoading}
                type='submit'
              >
                {postLoading ? 'Publicando…' : 'Publicar'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function masonryImageClass(postId: string): string {
  let n = 0;
  for (let i = 0; i < postId.length; i++) {
    n = (n + postId.charCodeAt(i) * (i + 1)) % 3;
  }
  const aspects = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-square'];
  return aspects[n] ?? 'aspect-[3/4]';
}

function PostCard({
  post,
  currentUserId,
  onImageOpen,
  onReact,
  onDeletePost,
  onNavigate,
}: {
  post: ForumPost;
  currentUserId: string | null;
  onImageOpen: (attachment: ForumAttachment) => void;
  onReact: (postId: string, reaction: 'like' | 'dislike') => void;
  onDeletePost: (postId: string) => Promise<boolean>;
  onNavigate: (route: Route) => void;
}) {
  const mainImage = post.attachments[0];
  const isAuthor = currentUserId !== null && post.author.id === currentUserId;
  const imageAspect = masonryImageClass(post.id);

  function confirmDelete(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (
      !window.confirm(
        '¿Eliminar esta publicación? Se borrarán las imágenes y los comentarios. Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }
    void onDeletePost(post.id);
  }

  const cardShell =
    'group break-inside-avoid mb-5 overflow-hidden rounded-xl border border-white/[0.07] bg-[#0c0c0f] shadow-[0_16px_48px_-20px_rgba(0,0,0,0.9)] transition-[border-color,box-shadow] duration-300 hover:border-white/[0.12] hover:shadow-[0_20px_56px_-18px_rgba(59,130,246,0.12)]';

  const footer = (
    <div className='flex items-center gap-5 border-t border-white/[0.06] px-4 py-3'>
      <button
        aria-label={`Me gusta (${post.likes})`}
        aria-pressed={post.myReaction === 'like'}
        className='flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-150 hover:scale-110 active:scale-95'
        style={{ color: post.myReaction === 'like' ? '#ef4444' : '#52525b' }}
        type='button'
        onClick={() => onReact(post.id, 'like')}
      >
        <Heart
          color={post.myReaction === 'like' ? '#ef4444' : '#52525b'}
          fill={post.myReaction === 'like' ? '#ef4444' : 'none'}
          size={14}
        />
        {post.likes}
      </button>
      <button
        aria-label={`No me gusta (${post.dislikes})`}
        aria-pressed={post.myReaction === 'dislike'}
        className='flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-150 hover:scale-110 active:scale-95'
        style={{ color: post.myReaction === 'dislike' ? '#94a3b8' : '#52525b' }}
        type='button'
        onClick={() => onReact(post.id, 'dislike')}
      >
        <HeartCrack
          color={post.myReaction === 'dislike' ? '#1e293b' : '#52525b'}
          fill={post.myReaction === 'dislike' ? '#1e293b' : 'none'}
          size={14}
          stroke={post.myReaction === 'dislike' ? '#94a3b8' : '#52525b'}
        />
        {post.dislikes}
      </button>
      <button
        aria-label={`Ver publicación y comentarios (${post.comments.length})`}
        className='ml-auto flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500 transition-all duration-150 hover:scale-110 hover:text-neutral-300 active:scale-95'
        type='button'
        onClick={() => onNavigate(`/posts/${post.id}`)}
      >
        <MessageCircle className='shrink-0' size={14} strokeWidth={2} />
        {post.comments.length}
      </button>
    </div>
  );

  const authorRow = (
    <div className='flex items-center justify-between gap-2 px-4 py-3'>
      <button
        className='flex min-w-0 flex-1 items-center gap-2.5 rounded-md text-left transition hover:opacity-90'
        type='button'
        onClick={(event) => {
          event.stopPropagation();
          onNavigate(`/users/${post.author.id}`);
        }}
      >
        <AvatarCircle
          avatarUrl={post.author.avatarUrl}
          className='h-7 w-7 shrink-0 text-[9px]'
          name={post.author.name}
        />
        <span className='truncate text-[10px] font-bold uppercase tracking-tight text-neutral-100'>
          {post.author.name}
        </span>
      </button>
      <div className='flex shrink-0 items-center gap-1.5'>
        <time
          className='text-[8px] font-bold uppercase tracking-widest text-neutral-600'
          dateTime={post.createdAt}
        >
          {formatPostDate(post.createdAt)}
        </time>
        {isAuthor ? (
          <button
            aria-label='Eliminar publicacion'
            className='rounded-md p-1.5 text-neutral-600 transition hover:bg-red-500/10 hover:text-red-400'
            type='button'
            onClick={confirmDelete}
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        ) : null}
      </div>
    </div>
  );

  if (!mainImage) {
    return (
      <article className={cardShell}>
        <button
          className='w-full text-left outline-none'
          type='button'
          onClick={() => onNavigate(`/posts/${post.id}`)}
        >
          <div className='bg-gradient-to-br from-white/[0.06] via-[#0e0e12] to-neutral-950 px-4 pb-1 pt-5'>
            <span className='text-[9px] font-bold uppercase tracking-[0.22em] text-neutral-500'>
              Texto
            </span>
            <h2 className='font-["Outfit"] mt-3 line-clamp-3 text-[1.05rem] font-bold uppercase leading-snug tracking-tight text-white transition group-hover:text-[#93c5fd]'>
              {post.title}
            </h2>
            <p className='mt-3 line-clamp-6 text-sm leading-relaxed text-neutral-400'>{post.body}</p>
          </div>
        </button>
        {authorRow}
        {footer}
      </article>
    );
  }

  return (
    <article className={cardShell}>
      <button
        className='relative block w-full overflow-hidden'
        type='button'
        onClick={() => onImageOpen(mainImage)}
      >
        <img
          alt={mainImage.originalName}
          className={`${imageAspect} w-full scale-[1.01] object-cover transition duration-700 ease-out group-hover:scale-105`}
          src={apiUrl(mainImage.url)}
        />
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80' />
      </button>
      {authorRow}
      <button
        className='w-full px-4 pb-2 pt-1 text-left outline-none'
        type='button'
        onClick={() => onNavigate(`/posts/${post.id}`)}
      >
        <h2 className='font-["Outfit"] line-clamp-2 text-base font-bold uppercase tracking-tight text-white transition hover:text-[#93c5fd]'>
          {post.title}
        </h2>
        <p className='mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-neutral-500'>
          {post.body}
        </p>
      </button>
      {footer}
    </article>
  );
}

export function PostDetailView({
  postId,
  posts,
  user,
  onReact,
  onComment,
  onDeletePost,
  onImageOpen,
  onNavigate,
  onBack,
  showAds,
}: {
  postId: string;
  posts: ForumPost[];
  user: AuthUser | null;
  onReact: (postId: string, reaction: 'like' | 'dislike') => void;
  onComment: (postId: string, body: string) => Promise<boolean>;
  onDeletePost: (postId: string) => Promise<boolean>;
  onImageOpen: (attachment: ForumAttachment) => void;
  onNavigate: (route: Route) => void;
  onBack: () => void;
  showAds: boolean;
}) {
  const [commentBody, setCommentBody] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const post = posts.find((p) => p.id === postId);
  const articleAdSlot = showAds ? getAdSlot('article') : undefined;
  const showArticleAd = shouldShowAdPlacement(showAds, articleAdSlot);
  const isAuthor = user !== null && post && post.author.id === user.id;

  function confirmDeletePost() {
    if (
      !window.confirm(
        '¿Eliminar esta publicación? Se borrarán las imágenes y los comentarios. Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }
    void onDeletePost(postId);
  }

  if (!post) {
    return (
      <div className='py-20 text-center' role='status'>
        <p className='text-xs font-bold uppercase tracking-widest text-neutral-600'>
          Publicación no encontrada
        </p>
        <button
          className='mt-4 text-xs font-bold uppercase tracking-widest text-[#3b82f6]'
          type='button'
          onClick={onBack}
        >
          Volver al foro
        </button>
      </div>
    );
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentBody.trim()) return;

    setCommentLoading(true);
    const ok = await onComment(postId, commentBody.trim());
    setCommentLoading(false);
    if (ok) setCommentBody('');
  }

  return (
    <article className='mx-auto w-full max-w-4xl px-6 py-12 duration-500 animate-in fade-in slide-in-from-bottom-4'>
      <header className='mb-12 flex flex-wrap items-center justify-between gap-4'>
        <button
          className='flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition hover:text-white'
          type='button'
          onClick={onBack}
        >
          <svg className='h-3 w-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path d='M15 19l-7-7 7-7' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' />
          </svg>
          Volver al foro
        </button>
        {isAuthor ? (
          <button
            className='flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/90 transition hover:text-red-300'
            type='button'
            onClick={confirmDeletePost}
          >
            <Trash2 className='shrink-0' size={14} strokeWidth={2} />
            Eliminar publicación
          </button>
        ) : null}
      </header>

      <div className='grid grid-cols-1 gap-16 lg:grid-cols-2'>
        <div className='space-y-6'>
          {post.attachments.length > 0
            ? post.attachments.map((img) => (
                <button
                  key={img.id}
                  className='block w-full overflow-hidden border border-white/5 bg-neutral-900 transition hover:border-[#3b82f6]/40'
                  type='button'
                  onClick={() => onImageOpen(img)}
                >
                  <img alt={img.originalName} className='w-full object-cover' src={apiUrl(img.url)} />
                </button>
              ))
            : null}
        </div>

        <div className='space-y-12'>
          <header className='space-y-6 border-b border-white/5 pb-12'>
            <button
              className='flex items-center gap-4 rounded-sm text-left transition hover:opacity-90'
              type='button'
              onClick={() => onNavigate(`/users/${post.author.id}`)}
            >
              <AvatarCircle avatarUrl={post.author.avatarUrl} className='h-10 w-10 text-xs' name={post.author.name} />
              <div className='flex flex-col'>
                <span className='text-xs font-bold uppercase tracking-tight text-white'>
                  {post.author.name}
                </span>
                <time className='text-[10px] font-bold uppercase tracking-widest text-neutral-700' dateTime={post.createdAt}>
                  {formatPostDate(post.createdAt)}
                </time>
              </div>
            </button>

            <h1 className='font-["Outfit"] text-4xl font-bold uppercase tracking-tighter text-white'>
              {post.title}
            </h1>

            <p className='whitespace-pre-wrap text-sm leading-relaxed text-neutral-400'>{post.body}</p>

            <div className='flex items-center gap-8 pt-4' role='group' aria-label='Reacciones a la publicación'>
              <button
                aria-label={`Me gusta (${post.likes})`}
                aria-pressed={post.myReaction === 'like'}
                className='flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-150 hover:scale-105 active:scale-95'
                style={{ color: post.myReaction === 'like' ? '#ef4444' : '#52525b' }}
                type='button'
                onClick={() => onReact(post.id, 'like')}
              >
                <Heart
                  color={post.myReaction === 'like' ? '#ef4444' : '#52525b'}
                  fill={post.myReaction === 'like' ? '#ef4444' : 'none'}
                  size={18}
                />
                Me gusta ({post.likes})
              </button>
              <button
                aria-label={`No me gusta (${post.dislikes})`}
                aria-pressed={post.myReaction === 'dislike'}
                className='flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-150 hover:scale-105 active:scale-95'
                style={{ color: post.myReaction === 'dislike' ? '#94a3b8' : '#52525b' }}
                type='button'
                onClick={() => onReact(post.id, 'dislike')}
              >
                <HeartCrack
                  color={post.myReaction === 'dislike' ? '#1e293b' : '#52525b'}
                  fill={post.myReaction === 'dislike' ? '#1e293b' : 'none'}
                  size={18}
                  stroke={post.myReaction === 'dislike' ? '#94a3b8' : '#52525b'}
                />
                No me gusta ({post.dislikes})
              </button>
            </div>
          </header>

          <section aria-labelledby='comments-heading' className='space-y-10'>
            <h2 className='flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500' id='comments-heading'>
              <MessageCircle aria-hidden={true} className='text-neutral-500' size={16} strokeWidth={2} />
              Comentarios ({post.comments.length})
            </h2>

            <ul className='scrollbar-thin scrollbar-thumb-white/10 max-h-[400px] list-none space-y-8 overflow-y-auto pr-4'>
              {post.comments.map((comment) => (
                <li key={comment.id}>
                  <article className='space-y-3 border-l border-white/10 pl-4'>
                  <p className='text-sm leading-relaxed text-neutral-300'>{comment.body}</p>
                  <button
                    className='flex items-center gap-2 rounded-sm transition hover:opacity-90'
                    type='button'
                    onClick={() => onNavigate(`/users/${comment.author.id}`)}
                  >
                    <AvatarCircle
                      avatarUrl={comment.author.avatarUrl}
                      className='h-6 w-6 text-[8px]'
                      name={comment.author.name}
                    />
                    <span className='text-[9px] font-bold uppercase tracking-widest text-neutral-700'>
                      {comment.author.name}
                    </span>
                    <time className='text-[8px] uppercase text-neutral-800' dateTime={comment.createdAt}>
                      {formatPostDate(comment.createdAt)}
                    </time>
                  </button>
                  </article>
                </li>
              ))}
              {!post.comments.length ? (
                <li className='text-[10px] uppercase tracking-widest text-neutral-700'>
                  Todavía no hay comentarios
                </li>
              ) : null}
            </ul>

            {user ? (
              <form
                aria-label='Enviar comentario'
                className='space-y-4 border-t border-white/5 pt-6'
                onSubmit={handleCommentSubmit}
              >
                <label className='sr-only' htmlFor='post-comment-body'>
                  Tu comentario
                </label>
                <textarea
                  className='min-h-20 w-full resize-none rounded-sm border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#3b82f6]'
                  disabled={commentLoading}
                  id='post-comment-body'
                  value={commentBody}
                  placeholder='Escribí un comentario…'
                  onChange={(e) => setCommentBody(e.target.value)}
                />
                <button
                  className='flex w-full items-center justify-center rounded-sm border border-[#3b82f6] bg-[#3b82f6] px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#2563eb] active:scale-[0.98] disabled:opacity-30'
                  disabled={commentLoading || !commentBody.trim()}
                  type='submit'
                >
                  {commentLoading ? 'Enviando…' : 'Publicar comentario'}
                </button>
              </form>
            ) : (
              <p className='border-t border-white/5 py-6 text-center text-[10px] uppercase tracking-widest text-neutral-700'>
                Iniciá sesión para comentar
              </p>
            )}
          </section>
        </div>
      </div>

      {showArticleAd ? (
        <aside className='mt-12 flex min-h-[120px] justify-center border-t border-white/5 pt-8' aria-label='Publicidad'>
          <AdSenseSlot slot={articleAdSlot} />
        </aside>
      ) : null}
    </article>
  );
}

function PostSkeleton({ index }: { index: number }) {
  const aspects = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/5]'];
  const aspect = aspects[index % 3];
  return (
    <div className='break-inside-avoid mb-5 animate-pulse overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0c0f]'>
      <div className={`${aspect} w-full bg-gradient-to-br from-neutral-800/90 to-neutral-900/80`} />
      <div className='space-y-3 px-4 py-3'>
        <div className='flex items-center gap-2'>
          <div className='h-7 w-7 shrink-0 rounded-full bg-neutral-800/90' />
          <div className='h-2.5 flex-1 rounded bg-neutral-800/80' />
        </div>
        <div className='h-2.5 w-4/5 rounded bg-neutral-800/70' />
        <div className='h-2 w-full rounded bg-neutral-800/50' />
      </div>
      <div className='flex gap-4 border-t border-white/[0.05] px-4 py-3'>
        <div className='h-2 w-8 rounded bg-neutral-800/50' />
        <div className='h-2 w-8 rounded bg-neutral-800/50' />
        <div className='ml-auto h-2 w-6 rounded bg-neutral-800/50' />
      </div>
    </div>
  );
}

function formatPostDate(value: string) {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
