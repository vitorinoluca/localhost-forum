import { useState } from 'react';
import { AdSenseSlot } from './components/ads/AdSenseSlot';
import { LoginView, RegisterView, VerifyEmailView } from './components/auth/AuthViews';
import { GlobalLoadingOverlay, ImageLightbox } from './components/common/Overlays';
import { Spinner } from './components/common/Spinner';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ForumPage, PostDetailView } from './components/forum/ForumPage';
import { NotificationsPage } from './components/inbox/NotificationsPage';
import { ContactPage, PrivacyPage, TermsPage } from './components/legal/LegalPages';
import { NavBar } from './components/layout/NavBar';
import { NotFoundPage } from './components/layout/NotFoundPage';
import { SkipToContent } from './components/layout/SkipToContent';
import { SiteFooter } from './components/layout/SiteFooter';
import { ProfileEditView, PublicProfileView } from './components/profile/ProfileViews';
import { useAppController } from './hooks/useAppController';
import { useNotificationCount } from './hooks/useNotificationCount';
import { getAdSlot, shouldShowAdsOnRoute, shouldShowAdPlacement } from './lib/ads-config';
import { SeoHead } from './components/seo/SeoHead';
import type { ForumAttachment } from './types';

export default function App() {
  const [activeImage, setActiveImage] = useState<ForumAttachment | null>(null);
  const app = useAppController();
  const notifications = useNotificationCount(Boolean(app.user));
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
  const adsAllowed = shouldShowAdsOnRoute(app.route);
  const topAdSlot = adsAllowed ? getAdSlot('top') : undefined;
  const showTopAdRow = shouldShowAdPlacement(adsAllowed, topAdSlot);

  return (
    <>
      <SkipToContent />
      <SeoHead
        detailPostId={app.detailPostId}
        isPostDetail={app.isPostDetail}
        posts={app.posts}
        profileUserId={app.profileUserId}
        publicProfile={app.publicProfile}
        route={app.route}
      />
      {app.checkingSession ? (
        <main
          className='grid min-h-screen place-items-center bg-neutral-950 px-6 text-neutral-100'
          id='main-content'
          tabIndex={-1}
        >
          <Spinner label='Iniciando sesión' size='lg' />
        </main>
      ) : (
        <main className='flex min-h-screen flex-col bg-neutral-950 text-neutral-100' id='main-content' tabIndex={-1}>
      <NavBar
        key={app.route}
        navigate={app.navigate}
        notificationsUnread={notifications.notificationsUnread}
        route={app.route}
        user={app.user}
        onLogout={app.handleLogout}
      />

      <div className='flex-1'>
        {showTopAdRow ? (
          <aside aria-label='Publicidad' className='border-b border-white/5 bg-neutral-950/90'>
            <div className='mx-auto max-w-7xl px-6 py-3'>
              <AdSenseSlot format='horizontal' slot={topAdSlot} />
            </div>
          </aside>
        ) : null}

        {app.route === '/terms' ? <TermsPage navigate={app.navigate} /> : null}

        {app.route === '/privacy' ? <PrivacyPage navigate={app.navigate} /> : null}

        {app.route === '/contact' ? <ContactPage navigate={app.navigate} /> : null}

        {app.route === '/404' ? <NotFoundPage navigate={app.navigate} /> : null}

        {app.route === '/admin' && app.user?.role === 'superadmin' ? (
        <AdminDashboard onNavigate={app.navigate} />
      ) : null}

      {app.route === '/notifications' && app.user ? (
        <NotificationsPage
          navigate={app.navigate}
          user={app.user}
          onRefreshNotifications={notifications.refreshNotifications}
        />
      ) : null}

      {app.route === '/' ? (
        <ForumPage
          forumLoading={app.forumLoading}
          message={app.message}
          postLoading={app.postLoading}
          posts={app.posts}
          showAds={adsAllowed}
          onImageOpen={setActiveImage}
          postTitle={app.postTitle}
          postBody={app.postBody}
          onPostTitleChange={app.setPostTitle}
          onPostBodyChange={app.setPostBody}
          onPostImagesChange={app.setPostImages}
          postImages={app.postImages}
          onCreatePost={app.handleCreatePost}
          onReact={app.handleReaction}
          onDeletePost={app.handleDeletePost}
          onNavigate={app.navigate}
          user={app.user}
        />
      ) : null}

      {app.isPostDetail && app.detailPostId ? (
        <PostDetailView
          postId={app.detailPostId}
          posts={app.posts}
          showAds={adsAllowed}
          user={app.user}
          onComment={app.handleComment}
          onImageOpen={setActiveImage}
          onNavigate={app.navigate}
          onReact={app.handleReaction}
          onDeletePost={app.handleDeletePost}
          onBack={() => app.navigate('/')}
        />
      ) : null}

      {app.profileUserId ? (
        <PublicProfileView
          errorMessage={app.profileError}
          loading={app.profileLoading}
          profile={app.publicProfile}
          showAds={adsAllowed}
          viewerId={app.user?.id ?? null}
          onEditOwnProfile={app.openProfileEdit}
          onNavigate={app.navigate}
        />
      ) : null}

      {app.route === '/profile/edit' && app.user ? (
        <ProfileEditView
          message={app.profileEditMessage}
          profileAvatarFile={app.profileAvatarFile}
          profileBio={app.profileBio}
          profileName={app.profileName}
          profileRemoveAvatar={app.profileRemoveAvatar}
          saving={app.profileSaving}
          user={app.user}
          onAvatarFileChange={app.setProfileAvatarFile}
          onBioChange={app.setProfileBio}
          onCancel={app.handleProfileEditCancel}
          onNameChange={app.setProfileName}
          onRemoveAvatarChange={app.setProfileRemoveAvatar}
          onSubmit={app.handleProfileSave}
        />
      ) : null}

      {app.route === '/login' && !app.user ? (
        <LoginView
          authLoading={app.authLoading}
          email={app.email}
          fieldError={app.loginFieldError}
          googleClientId={googleClientId}
          message={app.message}
          password={app.password}
          onEmailChange={app.setLoginEmail}
          onGoogleCredential={app.handleGoogleCredential}
          onPasswordChange={app.setLoginPassword}
          onSubmit={app.handleLogin}
        />
      ) : null}

      {app.route === '/register' && !app.user ? (
        <RegisterView
          authLoading={app.authLoading}
          email={app.email}
          fieldErrors={app.registerFieldErrors}
          googleClientId={googleClientId}
          message={app.message}
          name={app.name}
          password={app.password}
          onEmailChange={app.setRegisterEmail}
          onGoogleCredential={app.handleGoogleCredential}
          onNameChange={app.setRegisterName}
          onPasswordChange={app.setRegisterPassword}
          onSubmit={app.handleRegister}
        />
      ) : null}

      {app.route === '/verify-email' && !app.user ? (
        <VerifyEmailView
          authLoading={app.authLoading}
          code={app.code}
          codeFieldError={app.verifyCodeError}
          devCode={app.devCode}
          emailMasked={app.emailMasked}
          message={app.message}
          onCodeChange={app.setVerifyCodeField}
          onResend={app.handleResendCode}
          onVerify={app.handleVerify}
        />
      ) : null}

      {activeImage ? (
        <ImageLightbox attachment={activeImage} onClose={() => setActiveImage(null)} />
      ) : null}

        {app.pendingRequests > 0 ? <GlobalLoadingOverlay /> : null}
      </div>

      <SiteFooter navigate={app.navigate} route={app.route} />
        </main>
      )}
    </>
  );
}
