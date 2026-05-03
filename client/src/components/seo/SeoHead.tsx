import { useEffect } from 'react';
import { apiUrl } from '../../api';
import {
  applyDocumentSeo,
  applyJsonLd,
  buildArticleJsonLd,
  buildPersonProfileJsonLd,
  buildWebSiteJsonLd,
  defaultDescription,
  normalizeDescription,
  siteName,
  type DocumentSeoInput,
} from '../../lib/seo-document';
import { normalizeForumPost } from '../../domain/forum-posts-state';
import type { ForumPost, PublicProfile, Route } from '../../types';

export type SeoHeadProps = {
  route: Route;
  isPostDetail: boolean;
  detailPostId: string | null;
  posts: ForumPost[];
  profileUserId: string | null;
  publicProfile: PublicProfile | null;
};

export function SeoHead({
  route,
  isPostDetail,
  detailPostId,
  posts,
  profileUserId,
  publicProfile,
}: SeoHeadProps) {
  useEffect(() => {
    const rawPost = detailPostId ? posts.find((p) => p.id === detailPostId) : undefined;
    const post = rawPost ? normalizeForumPost(rawPost) : undefined;
    const pathFull =
      typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/';
    const pathOnly = pathFull.split('?')[0] || '/';

    let title = siteName;
    let description = defaultDescription;
    let robots: DocumentSeoInput['robots'] = 'index,follow';
    let ogType: DocumentSeoInput['ogType'] = 'website';
    let articlePublishedTime: string | undefined;
    let articleModifiedTime: string | undefined;
    let ogImageUrl: string | undefined;
    let ogImageAlt: string | undefined;

    const noIndexPaths = ['/login', '/register', '/verify-email', '/profile/edit', '/notifications'];
    if (noIndexPaths.includes(pathOnly) || pathOnly.startsWith('/admin')) {
      robots = 'noindex,nofollow';
    }

    if (route === '/terms') {
      title = `Términos del servicio · ${siteName}`;
      description = `Condiciones de uso de ${siteName}.`;
    } else if (route === '/privacy') {
      title = `Privacidad · ${siteName}`;
      description = `Información sobre tratamiento de datos personales en ${siteName}.`;
    } else if (route === '/contact') {
      title = `Contacto · ${siteName}`;
      description = `Medios de contacto con ${siteName}.`;
    } else if (route === '/') {
      title = siteName;
      description = defaultDescription;
    } else if (isPostDetail && post) {
      title = `${post.title} · ${siteName}`;
      description = normalizeDescription(post.body);
      ogType = 'article';
      articlePublishedTime = new Date(post.createdAt).toISOString();
      articleModifiedTime = new Date(post.updatedAt).toISOString();
      const firstImg = post.attachments[0];
      if (firstImg) {
        ogImageUrl = apiUrl(firstImg.url);
        ogImageAlt = `${post.title} · ilustración`;
      }
    } else if (profileUserId && publicProfile) {
      title = `${publicProfile.name} · ${siteName}`;
      description = publicProfile.bio?.trim()
        ? normalizeDescription(publicProfile.bio)
        : `Perfil de ${publicProfile.name} en ${siteName}.`;
      if (publicProfile.avatarUrl) {
        ogImageUrl = apiUrl(publicProfile.avatarUrl);
        ogImageAlt = `Foto de perfil de ${publicProfile.name}`;
      }
    } else if (route === '/login') {
      title = `Iniciar sesión · ${siteName}`;
      description = `Acceso a tu cuenta en ${siteName}.`;
    } else if (route === '/register') {
      title = `Registro · ${siteName}`;
      description = `Crear una cuenta en ${siteName}.`;
    } else if (route === '/verify-email') {
      title = `Verificar correo · ${siteName}`;
      description = `Confirmación de dirección de correo en ${siteName}.`;
    } else if (route === '/profile/edit') {
      title = `Editar perfil · ${siteName}`;
      description = `Editar tu nombre, biografía y avatar en ${siteName}.`;
    } else if (route === '/notifications') {
      title = `Notificaciones · ${siteName}`;
      description = `Centro de notificaciones de ${siteName}.`;
    } else if (route === '/admin') {
      title = `Administración · ${siteName}`;
      description = `Panel de administración de ${siteName}.`;
    }

    applyDocumentSeo({
      title,
      description,
      path: pathOnly,
      robots,
      ogType,
      articlePublishedTime,
      articleModifiedTime,
      ogImageUrl,
      ogImageAlt,
    });

    if (robots !== 'index,follow') {
      applyJsonLd(null);
      return;
    }

    const canonicalUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${pathOnly === '/' ? '/' : pathOnly}`
        : '';

    const websiteLd = buildWebSiteJsonLd();
    const graph: Record<string, unknown>[] = [];

    if (websiteLd) {
      graph.push(websiteLd);
    }

    if (isPostDetail && post && canonicalUrl) {
      const imgUrls = post.attachments.map((a) => apiUrl(a.url));
      graph.push(
        buildArticleJsonLd({
          title: post.title,
          description: post.body,
          url: canonicalUrl,
          datePublished: new Date(post.createdAt).toISOString(),
          dateModified: new Date(post.updatedAt).toISOString(),
          authorName: post.author.name,
          imageUrls: imgUrls.length ? imgUrls : undefined,
        }),
      );
    } else if (profileUserId && publicProfile && canonicalUrl) {
      graph.push(
        buildPersonProfileJsonLd({
          name: publicProfile.name,
          description: publicProfile.bio ?? description,
          url: canonicalUrl,
          imageUrl: publicProfile.avatarUrl ? apiUrl(publicProfile.avatarUrl) : null,
        }),
      );
    }

    if (!graph.length) {
      applyJsonLd(null);
    } else if (graph.length === 1) {
      applyJsonLd(graph[0]!);
    } else {
      applyJsonLd(graph);
    }
  }, [route, isPostDetail, detailPostId, posts, profileUserId, publicProfile]);

  return null;
}
