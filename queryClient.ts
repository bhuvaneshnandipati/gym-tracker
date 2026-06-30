@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: light;
  }

  html.dark {
    color-scheme: dark;
  }

  html,
  body,
  #root {
    height: 100%;
  }

  body {
    @apply bg-iron-50 text-iron-900 antialiased;
    @apply dark:bg-iron-950 dark:text-iron-100;
    font-feature-settings: 'cv11', 'ss01';
    text-rendering: optimizeLegibility;
  }

  /* Respect users who prefer reduced motion. */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Consistent, visible keyboard focus across the app. */
  :focus-visible {
    @apply outline-none ring-2 ring-flame-500 ring-offset-2 ring-offset-iron-50 dark:ring-offset-iron-950;
  }
}

@layer components {
  /* Reusable skeleton shimmer used by loading states. */
  .skeleton {
    @apply relative overflow-hidden rounded-md bg-iron-200 dark:bg-iron-800;
  }

  .skeleton::after {
    @apply absolute inset-0 -translate-x-full animate-shimmer;
    content: '';
    background-image: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0,
      rgba(255, 255, 255, 0.15) 20%,
      rgba(255, 255, 255, 0.35) 60%,
      rgba(255, 255, 255, 0)
    );
  }
}
