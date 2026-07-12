<template>
  <div class="min-h-dvh bg-page">
    <header class="app-header relative overflow-hidden text-header-fg">
      <div class="app-header__wash" aria-hidden="true" />
      <div class="app-header__grain" aria-hidden="true" />
      <div class="app-header__glow" aria-hidden="true" />

      <div class="relative mx-auto max-w-6xl px-6 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
        <p
          class="header-rise mb-5 text-[11px] font-medium uppercase tracking-[0.28em] text-brass"
        >
          A social graph starter
        </p>
        <h1
          class="header-rise font-display text-[clamp(2.75rem,8vw,5.5rem)] font-medium leading-[0.95] tracking-tight"
          style="animation-delay: 60ms"
        >
          trellis social
        </h1>
        <p
          class="header-rise mt-6 max-w-xl text-base leading-relaxed text-header-fg/70 sm:text-lg"
          style="animation-delay: 120ms"
        >
          A starter template for building social apps on the Trellis graph.
          Posts, people, and tags — all linked, all queryable.
        </p>
      </div>

      <div class="app-header__fade" aria-hidden="true" />
    </header>

    <main class="relative mx-auto max-w-6xl px-6 pb-20 pt-10 sm:px-8 sm:pt-12">
      <SocialFeed />
    </main>
  </div>
</template>

<style scoped>
.app-header {
  background: #111;
}

.app-header__wash {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 15% 20%, rgb(196 165 116 / 0.14), transparent 55%),
    radial-gradient(ellipse 70% 50% at 90% 10%, rgb(90 70 50 / 0.35), transparent 50%),
    linear-gradient(165deg, #1a1714 0%, #111 45%, #0c0b0a 100%);
}

.app-header__grain {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

.app-header__glow {
  position: absolute;
  left: -10%;
  top: 40%;
  width: 55%;
  height: 70%;
  background: radial-gradient(ellipse at center, rgb(196 165 116 / 0.08), transparent 70%);
  pointer-events: none;
}

.app-header__fade {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 4rem;
  background: linear-gradient(to bottom, transparent, var(--page));
}

.header-rise {
  animation: header-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes header-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .header-rise {
    animation: none;
  }
}
</style>
