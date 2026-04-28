const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloaderBar');
const scrollMeter = document.getElementById('scrollMeter');
const topbar = document.getElementById('topbar');

const experienceTrack = document.getElementById('experienceTrack');
const mediaLepka = document.getElementById('mediaLepka');
const mediaPack = document.getElementById('mediaPack');
const photoLayer = document.getElementById('photoLayer');
const photoA = document.getElementById('photoA');
const photoB = document.getElementById('photoB');

const phaseTitle = document.getElementById('phaseTitle');
const phaseText = document.getElementById('phaseText');
const phaseProgress = document.getElementById('phaseProgress');
const phasePills = [...document.querySelectorAll('.phase-pill')];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const phaseData = [
  {
    start: 0,
    end: 0.45,
    title: 'Ручная лепка каждой партии',
    text: 'Мы формируем пельмени вручную, чтобы сохранить аккуратную форму и домашний вкус.',
  },
  {
    start: 0.45,
    end: 0.82,
    title: 'Точная фасовка в крафт-упаковку',
    text: 'На втором этапе пельмени проходят аккуратную фасовку: чисто, ровно и готово к хранению.',
  },
  {
    start: 0.82,
    end: 1,
    title: 'Финальная упаковка и готовность к доставке',
    text: 'Финальный контроль и упаковка. Заказ готов к отправке в тот же день.',
  },
];

const galleryPhotos = [
  './assets/client-drawn-v2/photo-1-drawn-v2.webp',
  './assets/client-drawn-v2/photo-2-drawn-v2.webp',
  './assets/client-drawn-v2/photo-3-drawn-v2.webp',
  './assets/client-drawn-v2/photo-4-drawn-v2.webp',
  './assets/client-drawn-v2/photo-5-drawn-v2.webp',
  './assets/client-drawn-v2/photo-6-drawn-v2.webp',
];

let currentPhotoIndex = 0;
let nextPhotoIndex = 1;
let introDone = false;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ease(value) {
  if (value < 0.5) return 2 * value * value;
  return 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function getScrollProgress() {
  const doc = document.documentElement;
  const total = Math.max(1, doc.scrollHeight - doc.clientHeight);
  return clamp(window.scrollY / total, 0, 1);
}

function getExperienceProgress() {
  if (!experienceTrack) return 0;
  const rect = experienceTrack.getBoundingClientRect();
  const total = Math.max(1, experienceTrack.offsetHeight - window.innerHeight);
  return clamp(-rect.top / total, 0, 1);
}

function setVideoFrame(video, ratio) {
  if (!video || !video.duration || !Number.isFinite(video.duration)) return;
  const duration = Math.max(0, video.duration - 0.02);
  const targetTime = clamp(duration * ratio, 0, duration);
  if (Math.abs(video.currentTime - targetTime) > 0.025) {
    try {
      video.currentTime = targetTime;
    } catch (_) {
      // Ignore invalid seek while metadata is loading.
    }
  }
}

function updatePhaseLabels(progress) {
  let activeIndex = 0;
  if (progress >= phaseData[1].start && progress < phaseData[2].start) activeIndex = 1;
  if (progress >= phaseData[2].start) activeIndex = 2;

  const activePhase = phaseData[activeIndex];
  if (phaseTitle) phaseTitle.textContent = activePhase.title;
  if (phaseText) phaseText.textContent = activePhase.text;

  phasePills.forEach((pill, index) => {
    pill.classList.toggle('is-active', index === activeIndex);
  });
}

function updatePhotoLayer(progress) {
  if (!photoLayer || !photoA || !photoB) return;

  const photoZone = clamp((progress - 0.78) / 0.22, 0, 1);
  const shouldShow = photoZone > 0;
  photoLayer.style.opacity = shouldShow ? String(clamp((photoZone - 0.02) / 0.12, 0, 1)) : '0';

  if (!shouldShow) return;

  const scaled = photoZone * (galleryPhotos.length - 1);
  const baseIndex = Math.floor(scaled);
  const localBlend = scaled - baseIndex;
  const nextIndexCalc = Math.min(galleryPhotos.length - 1, baseIndex + 1);

  if (baseIndex !== currentPhotoIndex) {
    currentPhotoIndex = baseIndex;
    photoA.src = galleryPhotos[currentPhotoIndex];
  }

  if (nextIndexCalc !== nextPhotoIndex) {
    nextPhotoIndex = nextIndexCalc;
    photoB.src = galleryPhotos[nextPhotoIndex];
  }

  photoA.style.opacity = String(1 - localBlend);
  photoB.style.opacity = String(localBlend);
}

function updateExperienceMedia(progress) {
  if (!mediaLepka || !mediaPack) return;

  const lepkaRatio = ease(clamp(progress / 0.45, 0, 1));
  const packRatio = ease(clamp((progress - 0.38) / 0.44, 0, 1));

  setVideoFrame(mediaLepka, lepkaRatio);
  setVideoFrame(mediaPack, packRatio);

  const lepkaOpacity = progress < 0.45 ? 1 : clamp(1 - (progress - 0.45) / 0.07, 0, 1);
  const packFadeIn = clamp((progress - 0.36) / 0.09, 0, 1);
  const packFadeOut = progress > 0.84 ? clamp(1 - (progress - 0.84) / 0.1, 0, 1) : 1;
  const packOpacity = clamp(packFadeIn * packFadeOut, 0, 1);

  mediaLepka.style.opacity = String(lepkaOpacity);
  mediaPack.style.opacity = String(packOpacity);

  updatePhotoLayer(progress);
}

function updateExperience(progress) {
  updateExperienceMedia(progress);
  updatePhaseLabels(progress);

  if (phaseProgress) {
    phaseProgress.style.width = `${(progress * 100).toFixed(2)}%`;
  }
}

function updateGlobalUI() {
  const globalProgress = getScrollProgress();
  if (scrollMeter) {
    scrollMeter.style.transform = `scaleX(${globalProgress.toFixed(4)})`;
  }

  if (topbar) {
    topbar.classList.toggle('scrolled', window.scrollY > 18);
  }

  const expProgress = getExperienceProgress();
  updateExperience(expProgress);
}

function hidePreloader() {
  if (introDone) return;
  introDone = true;
  document.body.classList.remove('loading');
  if (!preloader) return;
  preloader.classList.add('is-hidden');
  window.setTimeout(() => {
    preloader.remove();
  }, 680);
}

function runPreloader() {
  if (reduceMotion || !preloaderBar) {
    hidePreloader();
    return;
  }

  let progress = 0;
  const timer = window.setInterval(() => {
    progress = Math.min(92, progress + Math.random() * 14 + 6);
    preloaderBar.style.width = `${progress.toFixed(1)}%`;
  }, 120);

  const finish = () => {
    window.clearInterval(timer);
    preloaderBar.style.width = '100%';
    window.setTimeout(hidePreloader, 420);
  };

  window.addEventListener('load', finish, { once: true });
  window.setTimeout(finish, 3200);
}

runPreloader();

phasePills.forEach((pill, index) => {
  pill.addEventListener('click', () => {
    if (!experienceTrack) return;

    const target = phaseData[index].start;
    const trackTop = window.scrollY + experienceTrack.getBoundingClientRect().top;
    const range = Math.max(1, experienceTrack.offsetHeight - window.innerHeight);
    const y = trackTop + range * target;

    window.scrollTo({
      top: y,
      behavior: 'smooth',
    });
  });
});

const revealNodes = [...document.querySelectorAll('.reveal')];
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  },
  {
    threshold: 0.18,
    rootMargin: '0px 0px -40px 0px',
  }
);
revealNodes.forEach((node) => revealObserver.observe(node));

const tiltCards = [...document.querySelectorAll('[data-tilt]')];
tiltCards.forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (window.innerWidth < 900) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 8;
    const rotateX = (0.5 - py) * 7;
    card.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
  });

  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
  });
});

const magneticButtons = [...document.querySelectorAll('.btn-magnetic')];
magneticButtons.forEach((button) => {
  button.addEventListener('mousemove', (event) => {
    if (window.innerWidth < 900) return;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    button.style.transform = `translate(${(x * 0.08).toFixed(2)}px, ${(y * 0.08).toFixed(2)}px)`;
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = '';
  });
});

window.addEventListener('scroll', updateGlobalUI, { passive: true });
window.addEventListener('resize', updateGlobalUI);
updateGlobalUI();
