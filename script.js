(function () {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rail = document.querySelector(".left-rail");
  const railToggle = rail?.querySelector(".left-rail__toggle");
  const railLinks = Array.from(document.querySelectorAll('.left-rail .rail-item[href^="#"]'));
  const compactRailQuery = window.matchMedia("(max-width: 900px)");
  let railAlwaysExpanded = !compactRailQuery.matches;
  const leadModal = document.querySelector("[data-lead-modal]");
  let railCollapseTimer = null;
  const mailTarget = "serezha.nikulkin@mail.ru";
  const mailEndpoint = `https://formsubmit.co/ajax/${mailTarget}`;
  let toastRoot = null;

  const ensureToastRoot = () => {
    if (toastRoot) {
      return toastRoot;
    }

    toastRoot = document.createElement("div");
    toastRoot.className = "site-toast-stack";
    document.body.append(toastRoot);
    return toastRoot;
  };

  const showToast = (message, type = "info") => {
    if (!message) {
      return;
    }

    const root = ensureToastRoot();
    const toast = document.createElement("div");
    toast.className = `site-toast site-toast--${type}`;
    toast.textContent = message;
    root.append(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => {
        toast.remove();
      }, 260);
    }, 4600);
  };

  const getSubmitErrorMessage = (error) => {
    const text = String(error?.message || "").trim();

    if (!text) {
      return "Не удалось отправить заявку. Проверьте интернет и повторите.";
    }

    if (/needs activation/i.test(text) || /activate form/i.test(text)) {
      return "Почта еще не активирована. Откройте письмо от FormSubmit и нажмите «Activate Form».";
    }

    if (/open this page through a web server/i.test(text) || error?.code === "FILE_PROTOCOL") {
      return "Сайт открыт как файл. Запустите его через http://localhost, тогда отправка заработает.";
    }

    if (/Failed to fetch/i.test(text) || /NetworkError/i.test(text)) {
      return "Проблема с сетью. Проверьте интернет и повторите отправку.";
    }

    return "Не удалось отправить заявку. Попробуйте еще раз через минуту.";
  };

  const sendFormByEmail = async (form, options = {}) => {
    const {
      subject = "Новая заявка с сайта Getalo",
      formName = "Форма сайта",
      source = "",
      extraFields = {},
    } = options;

    if (window.location.protocol === "file:") {
      const protocolError = new Error(
        "Make sure you open this page through a web server, FormSubmit will not work in pages browsed as HTML files."
      );
      protocolError.code = "FILE_PROTOCOL";
      throw protocolError;
    }

    const formData = new FormData(form);
    formData.set("_subject", subject);
    formData.set("_captcha", "false");
    formData.set("_template", "table");
    formData.set("form_name", formName);
    formData.set("site_page", window.location.href);
    formData.set("site_time", new Date().toLocaleString("ru-RU"));

    if (!formData.get("request_source") && source) {
      formData.set("request_source", source);
    }

    if (!formData.get("request_type")) {
      formData.set("request_type", formName);
    }

    Object.entries(extraFields).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      const normalizedValue = String(value).trim();
      if (!normalizedValue.length) {
        return;
      }

      if (!formData.get(key)) {
        formData.set(key, normalizedValue);
      }
    });

    const response = await fetch(mailEndpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || (payload && payload.success === "false")) {
      throw new Error(payload?.message || "Не удалось отправить заявку");
    }

    return payload;
  };

  if (leadModal) {
    leadModal.hidden = true;
    leadModal.style.display = "none";

    const leadTitle = leadModal.querySelector('[data-lead-field="title"]');
    const leadDescription = leadModal.querySelector('[data-lead-field="description"]');
    const leadExtra = leadModal.querySelector('[data-lead-field="extra"]');
    const leadType = leadModal.querySelector('[data-lead-field="type"]');
    const leadSource = leadModal.querySelector('[data-lead-field="source"]');
    const leadForm = leadModal.querySelector(".lead-modal__form");
    const leadSubmit = leadModal.querySelector(".lead-modal__submit");

    const leadConfig = {
      call: {
        title: "Заказать звонок",
        description: "Уточним удобное время и перезвоним с консультацией по проекту.",
        extraFields:
          '<label class="lead-modal__field lead-modal__field--wide"><span>Удобное время звонка</span><input type="text" name="call_time" placeholder="Например, сегодня после 18:00" /></label>',
      },
      "calc-base": {
        title: "Получить расчет",
        description: "Сделаем предварительный расчет по вашим размерам и материалу.",
        extraFields:
          '<label class="lead-modal__field"><span>Материал</span><select name="material"><option>Искусственный камень</option><option>Кварцевый агломерат</option><option>Натуральный камень</option></select></label><label class="lead-modal__field"><span>Длина столешницы (м)</span><input type="number" name="length" min="1" max="12" step="0.1" placeholder="Например, 3.2" /></label>',
      },
      promo: {
        title: "Активировать акцию",
        description: "Зафиксируем акционную цену и подберем подходящий пакет подарков.",
        extraFields:
          '<label class="lead-modal__field lead-modal__field--wide"><span>Что хотите получить по акции</span><textarea name="promo_request" rows="3" placeholder="Например: мойка в подарок + скидка"></textarea></label>',
      },
      replace: {
        title: "Заявка на замену столешницы",
        description: "Подготовим план замены, согласуем материал и назначим удобную дату монтажа.",
        extraFields:
          '<label class="lead-modal__field"><span>Материал новой столешницы</span><select name="replace_material"><option>Искусственный камень</option><option>Кварцевый агломерат</option><option>Натуральный камень</option></select></label><label class="lead-modal__field"><span>Длина столешницы (мм)</span><input type="text" name="replace_length" placeholder="Например, 2700" /></label><label class="lead-modal__field lead-modal__field--wide"><span>Комментарий</span><textarea name="replace_comment" rows="3" placeholder="Опишите текущую столешницу и пожелания по замене"></textarea></label>',
      },
      "calc-precise": {
        title: "Получить точный расчет",
        description: "Подготовим детальный расчет с учетом кромки, вырезов и монтажа.",
        extraFields:
          '<label class="lead-modal__field"><span>Город</span><input type="text" name="city" placeholder="Москва / МО" /></label><label class="lead-modal__field"><span>Площадь/размер</span><input type="text" name="size" placeholder="Например, 3200x600 мм" /></label><label class="lead-modal__field lead-modal__field--wide"><span>Комментарий</span><textarea name="details" rows="3" placeholder="Опишите форму и пожелания"></textarea></label>',
      },
      "calc-finish": {
        title: "Получить расчет комплектации",
        description: "Рассчитаем комплект: мойка, кромка, плинтус и итоговую стоимость.",
        extraFields:
          '<label class="lead-modal__field"><span>Тип мойки</span><select name="sink_type"><option>Накладная</option><option>Подстольная</option><option>В уровень</option><option>Интегрированная</option></select></label><label class="lead-modal__field"><span>Тип кромки</span><select name="edge_type"><option>Кромка №1</option><option>Кромка №2</option><option>Кромка №3</option><option>Кромка №4</option><option>Кромка №5</option><option>Кромка №6</option><option>Кромка №7</option><option>Кромка №8</option><option>Кромка №9</option><option>Кромка №10</option><option>Кромка №11</option><option>Кромка №12</option><option>Кромка №13</option><option>Кромка №14</option></select></label>',
      },
      similar: {
        title: "Хочу похожий проект",
        description: "Подберем похожий вариант и адаптируем под ваши размеры и бюджет.",
        extraFields:
          '<label class="lead-modal__field lead-modal__field--wide"><span>Ссылка на пример или описание</span><textarea name="example" rows="3" placeholder="Ссылка, фото или краткое описание проекта"></textarea></label>',
      },
      "calc-honest": {
        title: "Получить честный расчет",
        description: "Сравним с рынком и покажем прозрачную структуру итоговой цены.",
        extraFields:
          '<label class="lead-modal__field lead-modal__field--wide"><span>Есть расчет от другой компании?</span><textarea name="competitor" rows="3" placeholder="Можно вставить сумму и что в нее входит"></textarea></label>',
      },
      default: {
        title: "Оставьте заявку",
        description: "Оставьте контакты, и менеджер свяжется с вами.",
        extraFields: "",
      },
    };

    const setLeadModalVisible = (visible) => {
      leadModal.hidden = !visible;
      leadModal.style.display = visible ? "grid" : "none";
      document.body.classList.toggle("has-lead-modal", visible);
    };

    const openLeadModal = (type, sourceLabel) => {
      const config = leadConfig[type] || leadConfig.default;
      if (leadTitle) {
        leadTitle.textContent = config.title;
      }
      if (leadDescription) {
        leadDescription.textContent = config.description;
      }
      if (leadExtra) {
        leadExtra.innerHTML = config.extraFields;
      }
      if (leadType) {
        leadType.value = type || "default";
      }
      if (leadSource) {
        leadSource.value = sourceLabel || "";
      }

      setLeadModalVisible(true);
      const firstInput = leadModal.querySelector("input:not([type=hidden]), textarea, select");
      if (firstInput instanceof HTMLElement) {
        firstInput.focus();
      }
    };

    const closeLeadModal = () => {
      setLeadModalVisible(false);
    };

    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const opener = event.target.closest("[data-lead-open]");
      if (opener) {
        const type = opener.getAttribute("data-lead-open") || "default";
        const sourceLabel = opener.textContent?.trim() || "Заявка";
        openLeadModal(type, sourceLabel);
        return;
      }

      const closer = event.target.closest("[data-lead-close]");
      if (closer) {
        closeLeadModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !leadModal.hidden) {
        closeLeadModal();
      }
    });

    if (leadForm) {
      leadForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!leadSubmit) {
          closeLeadModal();
          return;
        }

        const defaultLabel = leadSubmit.textContent || "Отправить заявку";
        leadSubmit.disabled = true;
        leadSubmit.textContent = "Отправляем...";

        try {
          await sendFormByEmail(leadForm, {
            subject: `Getalo: ${leadTitle?.textContent?.trim() || "Новая заявка"}`,
            formName: "Модальная форма заявки",
          });

          leadSubmit.textContent = "Заявка отправлена";
          showToast("Заявка отправлена. Мы свяжемся с вами в ближайшее время.", "success");
          window.setTimeout(() => {
            leadSubmit.disabled = false;
            leadSubmit.textContent = defaultLabel;
            leadForm.reset();
            closeLeadModal();
          }, 1200);
        } catch (error) {
          console.error("[lead-form]", error);
          leadSubmit.textContent = "Ошибка отправки";
          showToast(getSubmitErrorMessage(error), "error");

          window.setTimeout(() => {
            leadSubmit.disabled = false;
            leadSubmit.textContent = defaultLabel;
          }, 1800);
        }
      });
    }

    setLeadModalVisible(false);
    window.addEventListener("pageshow", () => {
      setLeadModalVisible(false);
    });
  }

  const clearRailCollapseTimer = () => {
    if (!railCollapseTimer) {
      return;
    }

    clearTimeout(railCollapseTimer);
    railCollapseTimer = null;
  };

  const setRailExpanded = (expanded) => {
    if (!rail || !railToggle) {
      return;
    }

    const nextExpanded = railAlwaysExpanded ? true : expanded;

    rail.classList.toggle("is-expanded", nextExpanded);
    railToggle.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
    railToggle.setAttribute("aria-label", railAlwaysExpanded ? "Меню разделов" : nextExpanded ? "Свернуть меню разделов" : "Открыть меню разделов");

    if (!nextExpanded) {
      clearRailCollapseTimer();
    }
  };

  const scheduleRailCollapse = () => {
    if (railAlwaysExpanded) {
      return;
    }

    if (!rail || !rail.classList.contains("is-expanded")) {
      return;
    }

    clearRailCollapseTimer();
    railCollapseTimer = setTimeout(() => {
      setRailExpanded(false);
    }, 3000);
  };

  const applyRailLayoutMode = () => {
    if (!rail || !railToggle) {
      return;
    }

    railAlwaysExpanded = !compactRailQuery.matches;

    if (railAlwaysExpanded) {
      railToggle.setAttribute("disabled", "true");
      setRailExpanded(true);
      return;
    }

    railToggle.removeAttribute("disabled");
    setRailExpanded(false);
  };

  if (railToggle) {
    applyRailLayoutMode();

    railToggle.addEventListener("click", () => {
      if (railAlwaysExpanded) {
        return;
      }

      const expanded = rail?.classList.contains("is-expanded");
      setRailExpanded(!expanded);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || railAlwaysExpanded) {
        return;
      }

      setRailExpanded(false);
    });

    document.addEventListener("click", (event) => {
      if (!rail || !(event.target instanceof Node) || railAlwaysExpanded) {
        return;
      }

      if (!rail.contains(event.target)) {
        setRailExpanded(false);
      }
    });

    if (typeof compactRailQuery.addEventListener === "function") {
      compactRailQuery.addEventListener("change", applyRailLayoutMode);
    } else if (typeof compactRailQuery.addListener === "function") {
      compactRailQuery.addListener(applyRailLayoutMode);
    }
  }

  if (railLinks.length) {
    const railPoints = railLinks
      .map((link) => {
        const href = link.getAttribute("href");
        if (!href || href.length < 2) {
          return null;
        }

        const id = href.slice(1);
        const node = document.getElementById(id);
        if (!node) {
          return null;
        }

        return { id, link, node };
      })
      .filter(Boolean);

    if (railPoints.length) {
      const orderedPoints = [...railPoints].sort((a, b) => a.node.offsetTop - b.node.offsetTop);

      const setRailActive = (activeId) => {
        railPoints.forEach((point) => {
          point.link.classList.toggle("is-active", point.id === activeId);
        });
      };

      const detectRailActive = () => {
        const offset = window.innerWidth <= 760 ? 120 : 150;
        const marker = window.scrollY + offset;
        let activeId = orderedPoints[0].id;

        orderedPoints.forEach((point) => {
          if (point.node.offsetTop <= marker) {
            activeId = point.id;
          }
        });

        setRailActive(activeId);
      };

      railPoints.forEach((point) => {
        point.link.addEventListener("click", () => {
          setRailActive(point.id);
          scheduleRailCollapse();
        });
      });

      detectRailActive();
      window.addEventListener("scroll", detectRailActive, { passive: true });
      window.addEventListener("resize", detectRailActive);
    }
  }

  const runSafe = (name, init) => {
    try {
      init();
    } catch (error) {
      console.error(`[init:${name}]`, error);
    }
  };

  runSafe("hero-slider", () => {
    const heroStage = document.querySelector(".hero-stage");
    const thumbRow = document.querySelector(".thumb-row");
    const thumbArrow = document.querySelector(".thumb-arrow");
    if (!heroStage || !thumbRow) {
      return;
    }

    const heroSlides = [
      {
        src: "https://images.pexels.com/photos/18033166/pexels-photo-18033166.jpeg?auto=compress&cs=tinysrgb&w=1800",
        position: "center 58%",
      },
      {
        src: "https://images.pexels.com/photos/35493893/pexels-photo-35493893.jpeg?auto=compress&cs=tinysrgb&w=1800",
        position: "20% 52%",
      },
      {
        src: "https://images.pexels.com/photos/4119847/pexels-photo-4119847.jpeg?auto=compress&cs=tinysrgb&w=1800",
        position: "34% 54%",
      },
      {
        src: "https://images.pexels.com/photos/8082197/pexels-photo-8082197.jpeg?auto=compress&cs=tinysrgb&w=1800",
        position: "48% 52%",
      },
      {
        src: "https://images.pexels.com/photos/18078647/pexels-photo-18078647.jpeg?auto=compress&cs=tinysrgb&w=1800",
        position: "62% 54%",
      },
      {
        src: "https://images.pexels.com/photos/36777837/pexels-photo-36777837.jpeg?auto=compress&cs=tinysrgb&w=1800",
        position: "76% 50%",
      },
      {
        src: "https://images.pexels.com/photos/8135490/pexels-photo-8135490.jpeg?auto=compress&cs=tinysrgb&w=1800",
        position: "84% 50%",
      },
      {
        src: "https://images.pexels.com/photos/11018252/pexels-photo-11018252.jpeg?auto=compress&cs=tinysrgb&w=1800",
        position: "24% 62%",
      },
      {
        src: "https://images.pexels.com/photos/10117754/pexels-photo-10117754.jpeg?auto=compress&cs=tinysrgb&w=1800",
        position: "70% 46%",
      },
    ];

    if (!heroSlides.length) {
      return;
    }

    let currentSlideIndex = 0;
    let heroSliderTimer = null;
    let thumbButtons = [];

    const cssUrl = (value) => `url("${String(value).replace(/"/g, '\\"')}")`;

    const renderThumbState = () => {
      thumbButtons.forEach((button, index) => {
        button.classList.toggle("thumb--active", index === currentSlideIndex);
      });
    };

    const renderHeroSlide = (index) => {
      currentSlideIndex = (index + heroSlides.length) % heroSlides.length;
      const slide = heroSlides[currentSlideIndex];
      heroStage.style.setProperty("--hero-image", cssUrl(slide.src));
      heroStage.style.setProperty("--hero-pos", slide.position || "center 58%");
      renderThumbState();
    };

    const restartHeroAuto = () => {
      if (heroSliderTimer) {
        clearInterval(heroSliderTimer);
        heroSliderTimer = null;
      }

      if (reducedMotion || heroSlides.length < 2) {
        return;
      }

      heroSliderTimer = setInterval(() => {
        renderHeroSlide(currentSlideIndex + 1);
      }, 5000);
    };

    thumbRow.innerHTML = "";
    thumbButtons = heroSlides.map((slide, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "thumb";
      button.setAttribute("aria-label", `Фото ${index + 1}`);
      button.style.backgroundImage = cssUrl(slide.src);
      button.style.backgroundPosition = slide.position || "center";
      button.addEventListener("click", () => {
        renderHeroSlide(index);
        restartHeroAuto();
      });
      thumbRow.append(button);
      return button;
    });

    if (thumbArrow) {
      thumbArrow.addEventListener("click", () => {
        renderHeroSlide(currentSlideIndex + 1);
        restartHeroAuto();
      });
    }

    renderHeroSlide(0);
    restartHeroAuto();
  });

  runSafe("hero-form", () => {
    const heroForm = document.querySelector(".right-form");
    const heroSubmit = heroForm?.querySelector('button[type="submit"]');
    if (!heroForm || !heroSubmit) {
      return;
    }

    const defaultLabel = heroSubmit.textContent || "Отправить";

    heroForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      heroSubmit.disabled = true;
      heroSubmit.textContent = "Отправляем...";

      try {
        await sendFormByEmail(heroForm, {
          subject: "Getalo: заявка из верхнего баннера",
          formName: "Верхняя форма (баннер)",
          source: "Верхний баннер",
          extraFields: {
            request_type: "hero-discount",
          },
        });

        heroSubmit.textContent = "Заявка отправлена";
        heroForm.reset();
        showToast("Готово. Ваша заявка отправлена.", "success");
      } catch (error) {
        console.error("[hero-form]", error);
        heroSubmit.textContent = "Ошибка отправки";
        showToast(getSubmitErrorMessage(error), "error");
      }

      setTimeout(() => {
        heroSubmit.disabled = false;
        heroSubmit.textContent = defaultLabel;
      }, 1800);
    });
  });

  runSafe("trust-countertop", () => {
  const trustBlock = document.querySelector(".trust-block");

  if (!trustBlock) {
    return;
  }

  const cards = Array.from(trustBlock.querySelectorAll(".trust-card"));
  const counters = Array.from(trustBlock.querySelectorAll(".trust-card__number[data-target]"));

  function animateCount(node) {
    const target = Number(node.dataset.target || 0);
    if (Number.isNaN(target)) {
      return;
    }

    if (reducedMotion) {
      node.textContent = String(target);
      return;
    }

    const duration = 1200;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(target * eased));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const opened = card.classList.contains("is-open");

      cards.forEach((item) => {
        item.classList.remove("is-open");
      });

      if (!opened) {
        card.classList.add("is-open");
      }
    });

    if (!reducedMotion) {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        card.style.setProperty("--mx", `${x}px`);
        card.style.setProperty("--my", `${y}px`);
      });
    }
  });

  const observer = new IntersectionObserver(
    (entries, watch) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        counters.forEach((counter) => animateCount(counter));

        cards.forEach((card, index) => {
          if (reducedMotion) {
            card.classList.add("is-visible");
            return;
          }

          setTimeout(() => {
            card.classList.add("is-visible");
          }, index * 90);
        });

        watch.disconnect();
      });
    },
    {
      threshold: 0.2,
    }
  );

  observer.observe(trustBlock);

  const typeCards = Array.from(trustBlock.querySelectorAll(".countertop-card[data-type]"));
  const modeButtons = Array.from(trustBlock.querySelectorAll(".process-switch__btn[data-mode]"));
  const navButtons = Array.from(trustBlock.querySelectorAll(".countertop-nav__btn[data-nav]"));
  const processList = trustBlock.querySelector(".process-list");
  const preview = trustBlock.querySelector(".countertop-viewer__image");

  const fieldMap = {
    title: trustBlock.querySelector('[data-field="title"]'),
    description: trustBlock.querySelector('[data-field="description"]'),
    material: trustBlock.querySelector('[data-field="material"]'),
    thickness: trustBlock.querySelector('[data-field="thickness"]'),
    edge: trustBlock.querySelector('[data-field="edge"]'),
    price: trustBlock.querySelector('[data-field="price"]'),
  };

  const countertopData = {
    straight: {
      title: "Прямая столешница",
      description: "Универсальный формат для линейной кухни с оптимальной ценой и быстрым циклом работ.",
      material: "Акрил Staron",
      thickness: "38 мм",
      edge: "№1",
      price: "от 38 900 ₽",
      previewPosition: "18% 55%",
      steps: {
        manufacture: [
          "Подтверждаем размеры и формируем чертеж по вашему проекту.",
          "Режем лист камня и делаем вырезы под варочную панель.",
          "Склеиваем детали и делаем подклейку для усиления из влагостойкой фанеры.",
          "Проводим контроль геометрии и упаковываем перед доставкой.",
        ],
        install: [
          "Защищаем кухонные фасады и проверяем опорную плоскость.",
          "Выставляем столешницу в уровень и фиксируем без зазоров.",
          "Монтируем мойку/варочную панель и герметизируем стыки.",
          "Делаем финишную полировку и сдаем объект с рекомендациями.",
        ],
      },
    },
    corner: {
      title: "Угловая столешница",
      description: "Для Г-образных кухонь с точной стыковкой угла и повышенной рабочей площадью.",
      material: "Кварц Avant",
      thickness: "38 мм",
      edge: "№6",
      price: "от 52 400 ₽",
      previewPosition: "34% 56%",
      steps: {
        manufacture: [
          "Строим шаблон угла, чтобы попасть в геометрию стен без щелей.",
          "Изготавливаем 2 секции и усиливаем стык внутренней вставкой.",
          "Полируем линию соединения до цельного визуального эффекта.",
          "Проверяем диагонали и готовим комплект для монтажа.",
        ],
        install: [
          "Позиционируем обе части и совмещаем рисунок материала.",
          "Стыкуем угол на специальный клей с точной фиксацией.",
          "Ставим пристенный борт и проходим санитарным герметиком.",
          "Тестируем нагрузку в угловой зоне и завершаем установку.",
        ],
      },
    },
    island: {
      title: "Столешница с островом",
      description: "Премиальный сценарий с монолитным видом для кухни-гостиной и большой зоной готовки.",
      material: "Кварц Caesarstone",
      thickness: "38 мм",
      edge: "№12",
      price: "от 84 700 ₽",
      previewPosition: "62% 52%",
      steps: {
        manufacture: [
          "Проектируем остров с учетом свесов и посадочных мест.",
          "Формируем массивный торец и детали водопада из одной партии.",
          "Соединяем элементы по направлению текстуры камня.",
          "Делаем контрольную сборку на производстве перед выездом.",
        ],
        install: [
          "Усиливаем основание острова под вес каменной плиты.",
          "Монтируем центральную плиту и вертикальные панели.",
          "Скрываем монтажные узлы и выполняем ювелирную подгонку.",
          "Наносим защитный состав и проверяем примыкания по кругу.",
        ],
      },
    },
    "u-shaped": {
      title: "П-образная столешница",
      description: "Максимально функциональный формат с тремя рабочими сторонами и цельной геометрией.",
      material: "Кварц Avant",
      thickness: "38 мм",
      edge: "№4",
      price: "от 73 600 ₽",
      previewPosition: "79% 50%",
      steps: {
        manufacture: [
          "Формируем детальный шаблон с учетом всех трех сторон и угловых примыканий.",
          "Изготавливаем секции на ЧПУ и проверяем совмещение линий рисунка.",
          "Усиливаем зоны стыков и прорабатываем вырезы под технику и мойку.",
          "Проводим контрольную сборку в цехе перед доставкой.",
        ],
        install: [
          "Выставляем столешницу по уровню по всему периметру кухонного гарнитура.",
          "Стыкуем секции с ювелирной подгонкой швов и аккуратной герметизацией.",
          "Проверяем плотность примыканий у стен и корректность монтажных зазоров.",
          "Выполняем финишную очистку и передаем рекомендации по уходу.",
        ],
      },
    },
  };

  const hasAllFields = Object.values(fieldMap).every(Boolean);

  if (!typeCards.length || !modeButtons.length || !processList || !preview || !hasAllFields) {
    return;
  }

  let currentType = typeCards.find((card) => card.classList.contains("is-active"))?.dataset.type || "straight";
  let currentMode = modeButtons.find((button) => button.classList.contains("is-active"))?.dataset.mode || "manufacture";

  function renderProcessItems(steps) {
    processList.innerHTML = "";

    steps.forEach((step, index) => {
      const item = document.createElement("li");
      item.className = "process-item";
      item.innerHTML =
        `<span class="process-item__index">${String(index + 1).padStart(2, "0")}</span>` +
        `<p class="process-item__text">${step}</p>`;
      processList.append(item);
    });

    const items = Array.from(processList.querySelectorAll(".process-item"));
    items.forEach((item, index) => {
      if (reducedMotion) {
        item.classList.add("is-visible");
        return;
      }

      setTimeout(() => {
        item.classList.add("is-visible");
      }, index * 85);
    });
  }

  function renderCountertop() {
    const model = countertopData[currentType];
    if (!model) {
      return;
    }

    fieldMap.title.textContent = model.title;
    fieldMap.description.textContent = model.description;
    fieldMap.material.textContent = model.material;
    fieldMap.thickness.textContent = model.thickness;
    fieldMap.edge.textContent = model.edge;
    fieldMap.price.textContent = model.price;
    preview.style.setProperty("--preview-pos", model.previewPosition);

    typeCards.forEach((card) => {
      card.classList.toggle("is-active", card.dataset.type === currentType);
    });

    modeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.mode === currentMode);
    });

    const steps = model.steps[currentMode] || [];
    renderProcessItems(steps);
  }

  typeCards.forEach((card) => {
    card.addEventListener("click", () => {
      const type = card.dataset.type;
      if (!type || type === currentType) {
        return;
      }

      currentType = type;
      renderCountertop();
    });
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      if (!mode || mode === currentMode) {
        return;
      }

      currentMode = mode;
      renderCountertop();
    });
  });

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.nav || 0);
      if (!step) {
        return;
      }

      const index = typeCards.findIndex((card) => card.dataset.type === currentType);
      const nextIndex = (index + step + typeCards.length) % typeCards.length;
      currentType = typeCards[nextIndex].dataset.type || currentType;
      renderCountertop();
    });
  });

  renderCountertop();
  });

  runSafe("offers", () => {
  const offersBlock = document.querySelector(".offers-block");
  if (!offersBlock) {
    return;
  }

  const offersList = offersBlock.querySelector(".offers-list");
  const modeSwitchButtons = Array.from(offersBlock.querySelectorAll(".offers-switch__btn[data-offer-mode]"));
  const offerNavButtons = Array.from(offersBlock.querySelectorAll(".offer-nav[data-offer-nav]"));
  const offerFeaturesList = offersBlock.querySelector(".offer-features");
  const offerPreview = offersBlock.querySelector(".offer-showcase__image");

  const offerFieldMap = {
    badge: offersBlock.querySelector('[data-offer-field="badge"]'),
    title: offersBlock.querySelector('[data-offer-field="title"]'),
    description: offersBlock.querySelector('[data-offer-field="description"]'),
    timeline: offersBlock.querySelector('[data-offer-field="timeline"]'),
    price: offersBlock.querySelector('[data-offer-field="price"]'),
  };

  const hasOfferFields = Object.values(offerFieldMap).every(Boolean);
  if (!offersList || !offerFeaturesList || !offerPreview || !modeSwitchButtons.length || !hasOfferFields) {
    return;
  }

  const offersData = {
    products: [
      {
        id: "kitchen-top",
        cardTitle: "Кухонные столешницы",
        cardMeta: "Акрил и кварц под ваш размер",
        tag: "Хит",
        badge: "ТОП ПРОДАЖ",
        title: "Столешницы для кухни",
        description: "Производим цельные и составные столешницы с подгонкой под технику и мойку.",
        timeline: "от 5 дней",
        price: "от 38 900 ₽",
        previewPosition: "16% 54%",
        features: [
          "Более 60 декоров камня в наличии на складе.",
          "Верхний, подстольный и интегрированные варианты установки мойки.",
          "Бесшовная склейка и полировка мест стыковки.",
        ],
      },
      {
        id: "bath-top",
        cardTitle: "Столешницы в ванную",
        cardMeta: "Влагостойкие решения под раковину",
        tag: "Надежно",
        badge: "ВЛАГОСТОЙКО",
        title: "Столешницы в ванную",
        description: "Компактные и удобные модели с вырезом под чашу и защитой от постоянной влаги.",
        timeline: "от 4 дней",
        price: "от 24 500 ₽",
        previewPosition: "30% 58%",
        features: [
          "Материалы, устойчивые к бытовой химии и пару.",
          "Интеграция накладных и врезных раковин.",
          "Точный монтаж в нишах и узких помещениях.",
        ],
      },
      {
        id: "window-sill",
        cardTitle: "Подоконники из камня",
        cardMeta: "Прочные, теплые и практичные",
        tag: "Практично",
        badge: "ДЛЯ ОКОН",
        title: "Подоконники из камня",
        description: "Изготавливаем подоконники с аккуратным примыканием и запасом прочности на годы.",
        timeline: "от 3 дней",
        price: "от 12 800 ₽",
        previewPosition: "46% 46%",
        features: [
          "Не боятся солнца и перепадов температуры.",
          "Доступны прямые, радиусные и угловые формы.",
          "Скрытые стыки и чистая герметизация швов.",
        ],
      },
      {
        id: "bar-counter",
        cardTitle: "Барные стойки",
        cardMeta: "Для кухни-гостиной и студий",
        tag: "Премиум",
        badge: "СТУДИИ",
        title: "Барные стойки",
        description: "Создаем стильные стойки с продуманной высотой и долговечной поверхностью.",
        timeline: "от 6 дней",
        price: "от 46 300 ₽",
        previewPosition: "76% 50%",
        features: [
          "Надежные опоры и скрытые узлы крепления.",
          "Кромки с безопасным профилем для ежедневного использования.",
          "Подсветка и декоративные элементы по запросу.",
        ],
      },
    ],
    services: [
      {
        id: "measurement",
        cardTitle: "Профессиональный замер",
        cardMeta: "Выезд мастера по СПБ и области",
        tag: "0 ₽",
        badge: "ВЫЕЗД",
        title: "Точный замер объекта",
        description: "Фиксируем геометрию помещения, перепады и точки коммуникаций перед запуском заказа.",
        timeline: "1 день",
        price: "бесплатно*",
        previewPosition: "24% 44%",
        features: [
          "Лазерный замер с точностью до миллиметра.",
          "Рекомендации по подготовке мебели и стен.",
          "Смета и варианты материалов в день выезда.",
        ],
      },
      {
        id: "delivery",
        cardTitle: "Доставка и подъем",
        cardMeta: "Аккуратно и без сколов",
        tag: "Сервис",
        badge: "ЛОГИСТИКА",
        title: "Доставка и подъем",
        description: "Организуем бережную перевозку и подъем камня с защитой на каждом этапе.",
        timeline: "по графику",
        price: "от 3 500 ₽",
        previewPosition: "42% 58%",
        features: [
          "Упаковка с жесткой фиксацией кромок.",
          "Согласование удобного временного окна доставки.",
          "Разгрузка и занос без повреждения отделки.",
        ],
      },
      {
        id: "installation",
        cardTitle: "Монтаж под ключ",
        cardMeta: "Чистая установка за 1 день",
        tag: "Быстро",
        badge: "МОНТАЖ",
        title: "Установка под ключ",
        description: "Собираем, выставляем и герметизируем изделие, проверяя каждый узел перед сдачей.",
        timeline: "от 4 часов",
        price: "от 7 500 ₽",
        previewPosition: "62% 56%",
        features: [
          "Выставление в уровень и контрольная проверка геометрии.",
          "Подключение мойки и варочной панели по проекту.",
          "Финальная полировка и уборка рабочего места.",
        ],
      },
      {
        id: "restoration",
        cardTitle: "Реставрация и полировка",
        cardMeta: "Обновим поверхность без замены",
        tag: "Уход",
        badge: "СЕРВИС",
        title: "Реставрация поверхности",
        description: "Убираем царапины, матовость и мелкие сколы, возвращая изделию свежий вид.",
        timeline: "1 день",
        price: "от 5 900 ₽",
        previewPosition: "83% 46%",
        features: [
          "Подбор подходящей абразивности под тип камня.",
          "Локальный ремонт зоны повреждения без демонтажа.",
          "Финишная защита поверхности от повторного износа.",
        ],
      },
    ],
  };

  let currentOfferMode =
    modeSwitchButtons.find((button) => button.classList.contains("is-active"))?.dataset.offerMode || "products";
  let currentOfferId = offersData[currentOfferMode][0].id;

  function renderOfferFeatures(features) {
    offerFeaturesList.innerHTML = "";

    features.forEach((feature, index) => {
      const item = document.createElement("li");
      item.className = "offer-feature";
      item.innerHTML = `<span>${feature}</span>`;
      offerFeaturesList.append(item);

      if (reducedMotion) {
        item.classList.add("is-visible");
        return;
      }

      setTimeout(() => {
        item.classList.add("is-visible");
      }, index * 90);
    });
  }

  function renderOfferCards() {
    const items = offersData[currentOfferMode];
    offersList.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "offer-card";
      if (item.id === currentOfferId) {
        card.classList.add("is-active");
      }
      card.dataset.offerId = item.id;
      card.innerHTML =
        `<span class="offer-card__title">${item.cardTitle}</span>` +
        `<span class="offer-card__meta">${item.cardMeta}</span>` +
        `<span class="offer-card__tag">${item.tag}</span>`;
      offersList.append(card);
    });
  }

  function renderOfferShowcase() {
    const current = offersData[currentOfferMode].find((item) => item.id === currentOfferId);
    if (!current) {
      return;
    }

    offerFieldMap.badge.textContent = current.badge;
    offerFieldMap.title.textContent = current.title;
    offerFieldMap.description.textContent = current.description;
    offerFieldMap.timeline.textContent = current.timeline;
    offerFieldMap.price.textContent = current.price;
    offerPreview.style.setProperty("--offer-pos", current.previewPosition);

    modeSwitchButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.offerMode === currentOfferMode);
    });

    renderOfferFeatures(current.features);
  }

  function setOfferMode(mode) {
    const list = offersData[mode];
    if (!list || !list.length) {
      return;
    }

    currentOfferMode = mode;
    currentOfferId = list[0].id;
    renderOfferCards();
    renderOfferShowcase();
  }

  function setOfferId(id) {
    if (!id) {
      return;
    }

    const exists = offersData[currentOfferMode].some((item) => item.id === id);
    if (!exists) {
      return;
    }

    currentOfferId = id;
    renderOfferCards();
    renderOfferShowcase();
  }

  modeSwitchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.offerMode;
      if (!mode || mode === currentOfferMode) {
        return;
      }

      setOfferMode(mode);
    });
  });

  offersList.addEventListener("click", (event) => {
    const target = event.target.closest(".offer-card[data-offer-id]");
    if (!target) {
      return;
    }

    const id = target.dataset.offerId;
    if (!id || id === currentOfferId) {
      return;
    }

    setOfferId(id);
  });

  offerNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.offerNav || 0);
      if (!step) {
        return;
      }

      const list = offersData[currentOfferMode];
      const currentIndex = list.findIndex((item) => item.id === currentOfferId);
      const nextIndex = (currentIndex + step + list.length) % list.length;
      currentOfferId = list[nextIndex].id;
      renderOfferCards();
      renderOfferShowcase();
    });
  });

  renderOfferCards();
  renderOfferShowcase();
  });

  runSafe("promo", () => {
  const promoBlock = document.querySelector(".promo-block");
  if (!promoBlock) {
    return;
  }

  if (reducedMotion) {
    promoBlock.classList.add("is-dawn");
  } else {
    const dawnObserver = new IntersectionObserver(
      (entries, watch) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          promoBlock.classList.add("is-dawn");
          watch.disconnect();
        });
      },
      { threshold: 0.34 }
    );

    dawnObserver.observe(promoBlock);
  }

  const promoList = promoBlock.querySelector(".promo-list");
  const promoFilters = Array.from(promoBlock.querySelectorAll(".promo-filter[data-promo-filter]"));
  const promoNavButtons = Array.from(promoBlock.querySelectorAll(".promo-nav[data-promo-nav]"));
  const promoBenefits = promoBlock.querySelector(".promo-benefits");
  const promoPreview = promoBlock.querySelector(".promo-viewer__image");
  const promoCountdown = promoBlock.querySelector(".promo-countdown");
  const promoProgress = promoBlock.querySelector(".promo-progress__bar");

  const promoFieldMap = {
    discount: promoBlock.querySelector('[data-promo-field="discount"]'),
    title: promoBlock.querySelector('[data-promo-field="title"]'),
    description: promoBlock.querySelector('[data-promo-field="description"]'),
    period: promoBlock.querySelector('[data-promo-field="period"]'),
    save: promoBlock.querySelector('[data-promo-field="save"]'),
  };

  const hasPromoFields = Object.values(promoFieldMap).every(Boolean);
  if (
    !promoList ||
    !promoBenefits ||
    !promoPreview ||
    !promoCountdown ||
    !promoProgress ||
    !promoFilters.length ||
    !hasPromoFields
  ) {
    return;
  }

  const promoData = [
    {
      id: "promo-kitchen-15",
      group: "discount",
      title: "Скидка 15% на кухонные столешницы",
      cardMeta: "Для новых заказов в этом месяце",
      tag: "Скидка",
      discount: "-15%",
      description: "Оформите заказ в период акции и зафиксируйте дополнительную скидку на весь комплект.",
      period: "до 30 апреля",
      save: "до 18 000 ₽",
      start: "2026-04-01T00:00:00+03:00",
      end: "2026-04-30T23:59:59+03:00",
      previewPosition: "18% 54%",
      benefits: [
        "Скидка применяется к столешнице и всем фигурным торцам.",
        "Можно объединить с бесплатным выездом замерщика.",
        "Цена фиксируется в договоре до монтажа.",
      ],
    },
    {
      id: "promo-gift-sink",
      group: "gift",
      title: "Мойка в подарок при заказе от 90 000 ₽",
      cardMeta: "Подарок по акции в комплекте",
      tag: "Подарок",
      discount: "+МОЙКА",
      description: "При заказе комплекта для кухни дарим каменную мойку и комплект крепежа без доплат.",
      period: "до 10 мая",
      save: "до 12 500 ₽",
      start: "2026-04-05T00:00:00+03:00",
      end: "2026-05-10T23:59:59+03:00",
      previewPosition: "36% 56%",
      benefits: [
        "Подбор формы мойки под ваш проект кухни.",
        "Включена врезка и первичная герметизация.",
        "Доступны несколько оттенков в тон столешнице.",
      ],
    },
    {
      id: "promo-package-install",
      group: "package",
      title: "Пакет «Доставка + Монтаж» со скидкой",
      cardMeta: "Комплексная услуга одним платежом",
      tag: "Пакет",
      discount: "-35%",
      description: "Заказывайте логистику и установку одним пакетом и экономьте на сервисной части проекта.",
      period: "до 20 мая",
      save: "до 9 800 ₽",
      start: "2026-04-10T00:00:00+03:00",
      end: "2026-05-20T23:59:59+03:00",
      previewPosition: "64% 55%",
      benefits: [
        "Один подрядчик на все этапы от цеха до монтажа.",
        "Согласованный график без простоев ремонта.",
        "Расширенная гарантия на монтажные узлы.",
      ],
    },
    {
      id: "promo-weekend-edge",
      group: "discount",
      title: "Премиальный профиль кромки бесплатно",
      cardMeta: "Только для заказов в выходные",
      tag: "Бонус",
      discount: "0 ₽",
      description: "При оформлении в субботу и воскресенье делаем премиальный профиль кромки без доплаты.",
      period: "до 31 мая",
      save: "до 7 000 ₽",
      start: "2026-04-12T00:00:00+03:00",
      end: "2026-05-31T23:59:59+03:00",
      previewPosition: "82% 50%",
      benefits: [
        "Доступны популярные профили кромки №1, №6 и №10.",
        "Сохраняется стандартный срок изготовления.",
        "Подходит для кухонных и барных столешниц.",
      ],
    },
  ];

  let promoFilter = promoFilters.find((button) => button.classList.contains("is-active"))?.dataset.promoFilter || "all";
  let filteredPromos = promoData.filter((item) => promoFilter === "all" || item.group === promoFilter);
  let currentPromoId = filteredPromos[0]?.id || promoData[0].id;
  let promoCountdownTimer = null;
  let promoRotateTimer = null;

  function getCurrentPromo() {
    return filteredPromos.find((item) => item.id === currentPromoId) || filteredPromos[0] || promoData[0];
  }

  function formatCountdown(targetMs) {
    const rest = targetMs - Date.now();
    if (rest <= 0) {
      return "АКЦИЯ ЗАВЕРШЕНА";
    }

    const totalSeconds = Math.floor(rest / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}д ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function getPromoProgress(item) {
    const startMs = new Date(item.start).getTime();
    const endMs = new Date(item.end).getTime();
    const now = Date.now();

    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      return 0;
    }

    if (now <= startMs) {
      return 0;
    }

    if (now >= endMs) {
      return 100;
    }

    return ((now - startMs) / (endMs - startMs)) * 100;
  }

  function renderPromoBenefits(items) {
    promoBenefits.innerHTML = "";

    items.forEach((text, index) => {
      const row = document.createElement("li");
      row.className = "promo-benefit";
      row.innerHTML = `<span>${text}</span>`;
      promoBenefits.append(row);

      if (reducedMotion) {
        row.classList.add("is-visible");
        return;
      }

      setTimeout(() => {
        row.classList.add("is-visible");
      }, index * 90);
    });
  }

  function renderPromoCards() {
    promoList.innerHTML = "";

    filteredPromos.forEach((item) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "promo-card";
      if (item.id === currentPromoId) {
        card.classList.add("is-active");
      }
      card.dataset.promoId = item.id;
      card.innerHTML =
        `<span class="promo-card__title">${item.title}</span>` +
        `<span class="promo-card__meta">${item.cardMeta}</span>` +
        `<span class="promo-card__tag">${item.tag}</span>`;
      promoList.append(card);
    });
  }

  function restartCountdown(item) {
    if (promoCountdownTimer) {
      clearInterval(promoCountdownTimer);
    }

    const endMs = new Date(item.end).getTime();
    const sync = () => {
      promoCountdown.textContent = formatCountdown(endMs);
      promoProgress.style.width = `${getPromoProgress(item).toFixed(1)}%`;
    };

    sync();
    promoCountdownTimer = setInterval(sync, 1000);
  }

  function renderPromoShowcase() {
    const item = getCurrentPromo();
    if (!item) {
      return;
    }

    promoFieldMap.discount.textContent = item.discount;
    promoFieldMap.title.textContent = item.title;
    promoFieldMap.description.textContent = item.description;
    promoFieldMap.period.textContent = item.period;
    promoFieldMap.save.textContent = item.save;
    promoPreview.style.setProperty("--promo-pos", item.previewPosition);
    renderPromoBenefits(item.benefits);
    restartCountdown(item);
  }

  function restartPromoRotation() {
    if (promoRotateTimer) {
      clearInterval(promoRotateTimer);
    }

    if (reducedMotion || filteredPromos.length < 2) {
      return;
    }

    promoRotateTimer = setInterval(() => {
      const currentIndex = filteredPromos.findIndex((item) => item.id === currentPromoId);
      const nextIndex = (currentIndex + 1) % filteredPromos.length;
      currentPromoId = filteredPromos[nextIndex].id;
      renderPromoCards();
      renderPromoShowcase();
    }, 7000);
  }

  function applyPromoFilter(nextFilter) {
    promoFilter = nextFilter;
    filteredPromos = promoData.filter((item) => promoFilter === "all" || item.group === promoFilter);
    if (!filteredPromos.length) {
      filteredPromos = [...promoData];
      promoFilter = "all";
    }

    if (!filteredPromos.some((item) => item.id === currentPromoId)) {
      currentPromoId = filteredPromos[0].id;
    }

    promoFilters.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.promoFilter === promoFilter);
    });

    renderPromoCards();
    renderPromoShowcase();
    restartPromoRotation();
  }

  promoFilters.forEach((button) => {
    button.addEventListener("click", () => {
      const nextFilter = button.dataset.promoFilter;
      if (!nextFilter || nextFilter === promoFilter) {
        return;
      }

      applyPromoFilter(nextFilter);
    });
  });

  promoList.addEventListener("click", (event) => {
    const target = event.target.closest(".promo-card[data-promo-id]");
    if (!target) {
      return;
    }

    const id = target.dataset.promoId;
    if (!id || id === currentPromoId) {
      return;
    }

    currentPromoId = id;
    renderPromoCards();
    renderPromoShowcase();
    restartPromoRotation();
  });

  promoNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.promoNav || 0);
      if (!step || !filteredPromos.length) {
        return;
      }

      const currentIndex = filteredPromos.findIndex((item) => item.id === currentPromoId);
      const nextIndex = (currentIndex + step + filteredPromos.length) % filteredPromos.length;
      currentPromoId = filteredPromos[nextIndex].id;
      renderPromoCards();
      renderPromoShowcase();
      restartPromoRotation();
    });
  });

  applyPromoFilter(promoFilter);
  });

  runSafe("replacement-block", () => {
    const replacementBlock = document.querySelector(".replacement-block");
    if (!replacementBlock) {
      return;
    }

    const stepButtons = Array.from(
      replacementBlock.querySelectorAll(".replacement-step[data-replace-step]")
    );
    const visual = replacementBlock.querySelector("[data-replace-visual]");
    const description = replacementBlock.querySelector("[data-replace-description]");
    const resultTitle = replacementBlock.querySelector("[data-replace-title]");
    const workTitle = replacementBlock.querySelector("[data-replace-work-title]");
    const beforeImage = replacementBlock.querySelector("[data-replace-before]");
    const afterImage = replacementBlock.querySelector("[data-replace-after]");
    const afterWrap = replacementBlock.querySelector("[data-replace-after-wrap]");
    const compare = replacementBlock.querySelector("[data-replace-compare]");
    const compareRange = replacementBlock.querySelector("[data-replace-range]");
    const workSwitch = replacementBlock.querySelector("[data-replace-work-switch]");
    const openGalleryButton = replacementBlock.querySelector("[data-replace-open-gallery]");
    const galleryCount = replacementBlock.querySelector("[data-replace-gallery-count]");
    const modal = replacementBlock.querySelector("[data-replace-modal]");
    const modalTitle = replacementBlock.querySelector("[data-replace-modal-title]");
    const modalImage = replacementBlock.querySelector("[data-replace-modal-image]");
    const modalCaption = replacementBlock.querySelector("[data-replace-modal-caption]");
    const modalThumbs = replacementBlock.querySelector("[data-replace-modal-thumbs]");
    const modalNavButtons = Array.from(
      replacementBlock.querySelectorAll(".replacement-gallery-modal__nav[data-replace-modal-nav]")
    );
    const modalCloseButtons = Array.from(
      replacementBlock.querySelectorAll("[data-replace-modal-close]")
    );

    if (
      !stepButtons.length ||
      !visual ||
      !description ||
      !resultTitle ||
      !workTitle ||
      !beforeImage ||
      !afterImage ||
      !afterWrap ||
      !compare ||
      !compareRange ||
      !workSwitch ||
      !openGalleryButton ||
      !galleryCount ||
      !modal ||
      !modalTitle ||
      !modalImage ||
      !modalCaption ||
      !modalThumbs
    ) {
      return;
    }

    const replacementWorks = [
      {
        id: "replace-job-1",
        title: "Замена №1",
        subtitle: "Угловая кухня",
        before: "./assets/replacement-jobs/job-1-before.jpeg",
        after: "./assets/replacement-jobs/job-1-after.jpeg",
        gallery: [
          {
            src: "./assets/replacement-jobs/job-1-after.jpeg",
            label: "Готовый результат после монтажа",
            kind: "result",
          },
          {
            src: "./assets/replacement-jobs/job-1-before.jpeg",
            label: "До замены",
          },
          {
            src: "./assets/replacement-jobs/job-1-after-alt.jpeg",
            label: "Финишный ракурс",
          },
        ],
      },
      {
        id: "replace-job-2",
        title: "Замена №2",
        subtitle: "Г-образная кухня",
        before: "./assets/replacement-jobs/job-2-photo-01.jpeg",
        after: "./assets/replacement-jobs/job-2-photo-12.jpeg",
        gallery: [
          {
            src: "./assets/replacement-jobs/job-2-photo-12.jpeg",
            label: "Готовый результат после монтажа",
            kind: "result",
          },
          {
            src: "./assets/replacement-jobs/job-2-photo-01.jpeg",
            label: "До замены",
          },
          {
            src: "./assets/replacement-jobs/job-2-photo-02.jpeg",
            label: "Этап: общий шаблон",
          },
          {
            src: "./assets/replacement-jobs/job-2-photo-03.jpeg",
            label: "Этап: подгонка в углу",
          },
          {
            src: "./assets/replacement-jobs/job-2-photo-04.jpeg",
            label: "Этап: примерка у мойки",
          },
          {
            src: "./assets/replacement-jobs/job-2-photo-09.jpeg",
            label: "Финиш: фактура и стык",
          },
        ],
      },
      {
        id: "replace-job-3",
        title: "Замена №3",
        subtitle: "П-образная кухня",
        before: "./assets/replacement-jobs/job-3-before.jpeg",
        after: "./assets/replacement-jobs/job-3-after.jpeg",
        gallery: [
          {
            src: "./assets/replacement-jobs/job-3-after.jpeg",
            label: "Готовый результат после монтажа",
            kind: "result",
          },
          {
            src: "./assets/replacement-jobs/job-3-before.jpeg",
            label: "До замены",
          },
          {
            src: "./assets/replacement-jobs/job-3-process-01.jpeg",
            label: "Этап: общий шаблон",
          },
          {
            src: "./assets/replacement-jobs/job-3-process-02.jpeg",
            label: "Этап: примерка детали",
          },
          {
            src: "./assets/replacement-jobs/job-3-process-03.jpeg",
            label: "Этап: шаблон у мойки",
          },
          {
            src: "./assets/replacement-jobs/job-3-process-04.jpeg",
            label: "Этап: разметка под варочную панель",
          },
          {
            src: "./assets/replacement-jobs/job-3-process-05.jpeg",
            label: "Этап: контроль угла и кромки",
          },
          {
            src: "./assets/replacement-jobs/job-3-process-06.jpeg",
            label: "Этап: проверка зоны у окна",
          },
        ],
      },
    ];

    let currentWorkId = replacementWorks[0]?.id || "";
    let currentGalleryIndex = 0;
    let isModalOpen = false;

    const stepContent = {
      measure: {
        description: "Точно снимаем размеры и формируем шаблон под вашу кухню.",
        title: "Точный замер и план замены",
      },
      build: {
        description: "Изготавливаем новую столешницу и заранее готовим все вырезы под технику и мойку.",
        title: "Изготовление по согласованному проекту",
      },
      install: {
        description: "В день монтажа демонтируем старую, ставим новую и сразу выполняем герметизацию.",
        title: "Доставка → демонтаж → монтаж за 1 день",
      },
    };

    const setCompareSplit = (value) => {
      const next = Math.max(0, Math.min(100, Number(value)));
      compare.style.setProperty("--split", `${next}%`);
      afterWrap.style.width = `${next}%`;
      compareRange.value = String(next);
    };

    const getCurrentWork = () =>
      replacementWorks.find((item) => item.id === currentWorkId) || replacementWorks[0];

    const getGalleryItems = (work) =>
      Array.isArray(work.gallery) && work.gallery.length ? work.gallery : [
        {
          src: work.after,
          label: "Готовый результат после монтажа",
          kind: "result",
        },
        {
          src: work.before,
          label: "До замены",
        },
      ];

    const renderWorkSwitch = () => {
      workSwitch.innerHTML = "";

      replacementWorks.forEach((work, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "replacement-work-switch__btn";
        button.textContent = String(index + 1);
        button.title = `${work.title}: ${work.subtitle}`;
        button.setAttribute("aria-label", `${work.title}: ${work.subtitle}`);
        button.setAttribute("aria-pressed", work.id === currentWorkId ? "true" : "false");
        if (work.id === currentWorkId) {
          button.classList.add("is-active");
        }

        button.addEventListener("click", () => {
          if (work.id === currentWorkId) {
            return;
          }
          currentWorkId = work.id;
          renderWork();
        });

        workSwitch.append(button);
      });
    };

    const renderModalGallery = () => {
      const work = getCurrentWork();
      const items = getGalleryItems(work);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, Number(currentGalleryIndex) || 0));
      currentGalleryIndex = clampedIndex;
      const activeItem = items[clampedIndex];

      modalTitle.textContent = `${work.title} · ${work.subtitle}`;
      modalImage.src = activeItem.src;
      modalImage.alt = `${work.title}: ${activeItem.label}`;
      modalCaption.textContent = `${clampedIndex + 1} / ${items.length} · ${activeItem.label}`;
      modalNavButtons.forEach((button) => {
        button.disabled = items.length < 2;
      });

      modalThumbs.innerHTML = "";
      items.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "replacement-gallery-modal__thumb";
        button.setAttribute("aria-label", item.label);
        if (index === currentGalleryIndex) {
          button.classList.add("is-active");
        }
        button.innerHTML = `<img src="${item.src}" alt="${item.label}" loading="lazy" /><span>${item.label}</span>`;
        button.addEventListener("click", () => {
          currentGalleryIndex = index;
          renderModalGallery();
        });
        modalThumbs.append(button);
      });
    };

    const closeModal = () => {
      if (!isModalOpen) {
        return;
      }
      isModalOpen = false;
      modal.hidden = true;
      document.body.classList.remove("replacement-modal-open");
    };

    const openModal = () => {
      isModalOpen = true;
      modal.hidden = false;
      document.body.classList.add("replacement-modal-open");
      renderModalGallery();
    };

    const shiftModalPhoto = (direction) => {
      const work = getCurrentWork();
      const items = getGalleryItems(work);
      if (!items.length) {
        return;
      }
      const nextIndex = (currentGalleryIndex + direction + items.length) % items.length;
      currentGalleryIndex = nextIndex;
      renderModalGallery();
    };

    const renderWork = () => {
      const work = getCurrentWork();
      if (!work) {
        return;
      }

      workTitle.textContent = `${work.title} · ${work.subtitle}`;
      beforeImage.src = work.before;
      beforeImage.alt = `${work.subtitle}: до замены`;
      afterImage.src = work.after;
      afterImage.alt = `${work.subtitle}: после замены`;
      renderWorkSwitch();
      const items = getGalleryItems(work);
      galleryCount.textContent = `${items.length} фото`;
      openGalleryButton.setAttribute("aria-label", `Показать все фото для ${work.title}`);
      if (isModalOpen) {
        const resultIndex = items.findIndex((item) => item.kind === "result");
        currentGalleryIndex = resultIndex >= 0 ? resultIndex : 0;
        renderModalGallery();
      }
    };

    const setActiveStep = (stepKey) => {
      const data = stepContent[stepKey];
      if (!data) {
        return;
      }

      stepButtons.forEach((button) => {
        const isActive = button.dataset.replaceStep === stepKey;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      visual.dataset.state = stepKey;
      description.textContent = data.description;
      resultTitle.textContent = data.title;
    };

    compareRange.addEventListener("input", () => {
      setCompareSplit(compareRange.value);
    });

    openGalleryButton.addEventListener("click", () => {
      const work = getCurrentWork();
      const items = getGalleryItems(work);
      const resultIndex = items.findIndex((item) => item.kind === "result");
      currentGalleryIndex = resultIndex >= 0 ? resultIndex : 0;
      openModal();
    });

    modalCloseButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeModal();
      });
    });

    modalNavButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const direction = Number(button.dataset.replaceModalNav || 0);
        if (!direction) {
          return;
        }
        shiftModalPhoto(direction);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (!isModalOpen) {
        return;
      }
      if (event.key === "Escape") {
        closeModal();
        return;
      }
      if (event.key === "ArrowLeft") {
        shiftModalPhoto(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        shiftModalPhoto(1);
      }
    });

    stepButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const stepKey = button.dataset.replaceStep;
        if (!stepKey) {
          return;
        }
        setActiveStep(stepKey);
      });
    });

    const defaultStep =
      stepButtons.find((button) => button.classList.contains("is-active"))?.dataset.replaceStep ||
      stepButtons[0].dataset.replaceStep;

    setCompareSplit(compareRange.value || 50);
    renderWork();

    if (defaultStep) {
      setActiveStep(defaultStep);
    }
  });

  const formatPrice = (value) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;
  let paramsEstimateRange = {
    from: 38900,
    to: 42100,
  };

  runSafe("params", () => {
    const paramsBlock = document.querySelector(".params-block");
    if (!paramsBlock) {
      return;
    }

    const paramsOptionButtons = Array.from(
      paramsBlock.querySelectorAll(".params-option[data-step][data-value]")
    );
    const paramsSummary = paramsBlock.querySelector(".params-summary");
    const paramsPrice = paramsBlock.querySelector(".params-price");
    const paramsTime = paramsBlock.querySelector(".params-time");
    const paramsProgress = paramsBlock.querySelector(".params-progress__bar");
    const stepCards = Array.from(paramsBlock.querySelectorAll(".params-step[data-step]"));

    if (
      !paramsOptionButtons.length ||
      !paramsSummary ||
      !paramsPrice ||
      !paramsTime ||
      !paramsProgress ||
      !stepCards.length
    ) {
      return;
    }

    const stepsOrder = [];
    const stepTitles = {};
    const stepOptions = {};

    stepCards.forEach((card, index) => {
      const step = card.dataset.step;
      if (!step) {
        return;
      }

      if (!stepsOrder.includes(step)) {
        stepsOrder.push(step);
      }

      const titleRaw = card.querySelector("h3")?.textContent?.trim() || `Шаг ${index + 1}`;
      stepTitles[step] = titleRaw.replace(/^\d+\.\s*/, "");
      stepOptions[step] = paramsOptionButtons.filter((button) => button.dataset.step === step);
    });

    if (!stepsOrder.length) {
      return;
    }

    const fallbackStepLabels = {
      shape: "Форма",
      material: "Материал",
      thickness: "Толщина",
      edge: "Кромка",
      length: "Длина",
    };

    const shapeBasePrice = {
      straight: 38900,
      corner: 52400,
      "u-shaped": 73600,
      island: 84700,
    };

    const materialFactors = {
      acrylic: 1,
      quartz: 1.27,
      ceramic: 1.42,
      solid: 1,
      chips: 1.18,
      marble: 1.31,
      "marble-look": 1.31,
    };

    const thicknessAdds = {
      20: -2200,
      38: 0,
      40: 1200,
      60: 6400,
      "60+": 9200,
    };

    const edgeAdds = {
      edge1: 0,
      edge2: 600,
      edge3: 1000,
      edge4: 1400,
      edge5: 1700,
      edge6: 2100,
      edge7: 2500,
      edge8: 3000,
      edge9: 3600,
      edge10: 4300,
      edge11: 4900,
      edge12: 6200,
      edge13: 7000,
      edge14: 5400,
    };

    const lengthAdds = {
      900: 0,
      1800: 6200,
      2700: 12400,
      3600: 18800,
    };

    const shapeDays = {
      straight: 5,
      corner: 6,
      "u-shaped": 7,
      island: 8,
    };

    const materialDays = {
      acrylic: 0,
      quartz: 1,
      ceramic: 2,
      solid: 0,
      chips: 0,
      marble: 1,
      "marble-look": 1,
    };

    const paramsSelection = {};

    stepsOrder.forEach((step) => {
      const defaultValue = stepOptions[step]?.[0]?.dataset.value;
      if (defaultValue) {
        paramsSelection[step] = defaultValue;
      }
    });

    const getOptionIndex = (step, value) => {
      const options = stepOptions[step] || [];
      const index = options.findIndex((button) => button.dataset.value === value);
      return index < 0 ? 0 : index;
    };

    const getSelectedOption = (step) => {
      const options = stepOptions[step] || [];
      return (
        options.find((button) => button.dataset.value === paramsSelection[step]) ||
        options[0] ||
        null
      );
    };

    const getSelectedLabel = (step) => getSelectedOption(step)?.textContent?.trim() || "—";

    const parseNumber = (value) => {
      const normalized = String(value || "").replace(",", ".");
      const match = normalized.match(/(\d+(?:\.\d+)?)/);
      return match ? Number(match[1]) : NaN;
    };

    function initSelectionFromMarkup() {
      stepsOrder.forEach((step) => {
        const active = paramsBlock.querySelector(`.params-option[data-step="${step}"].is-active`);
        const fallback = active || stepOptions[step]?.[0];
        if (fallback?.dataset.value) {
          paramsSelection[step] = fallback.dataset.value;
        }
      });
    }

    function renderSelection() {
      paramsOptionButtons.forEach((button) => {
        const step = button.dataset.step;
        const value = button.dataset.value;
        button.classList.toggle("is-active", Boolean(step && value && paramsSelection[step] === value));
      });
    }

    function renderSummary() {
      paramsSummary.innerHTML = "";

      stepsOrder.forEach((step) => {
        const li = document.createElement("li");
        const label = fallbackStepLabels[step] || stepTitles[step] || step;
        const strong = document.createElement("strong");

        strong.textContent = getSelectedLabel(step);
        li.append(`${label}: `, strong);
        paramsSummary.append(li);
      });
    }

    function renderMetrics() {
      const shapeValue = paramsSelection.shape;
      const materialValue = paramsSelection.material;
      const thicknessValue = paramsSelection.thickness;
      const edgeValue = paramsSelection.edge;
      const lengthValue = paramsSelection.length;

      const shapeIndex = getOptionIndex("shape", shapeValue);
      const materialIndex = getOptionIndex("material", materialValue);
      const thicknessIndex = getOptionIndex("thickness", thicknessValue);
      const edgeIndex = getOptionIndex("edge", edgeValue);
      const lengthIndex = getOptionIndex("length", lengthValue);

      const basePrice = shapeBasePrice[shapeValue] ?? 38900 + shapeIndex * 12800;
      const materialFactor = materialFactors[materialValue] ?? 1 + materialIndex * 0.13;

      let thicknessAdd = thicknessAdds[thicknessValue];
      if (typeof thicknessAdd !== "number") {
        const thicknessNumber =
          parseNumber(thicknessValue) || parseNumber(getSelectedLabel("thickness"));
        if (!Number.isNaN(thicknessNumber)) {
          thicknessAdd = Math.round((thicknessNumber - 38) * 120);
        } else {
          thicknessAdd = thicknessIndex * 1800;
        }
      }

      const edgeAdd = edgeAdds[edgeValue] ?? edgeIndex * 1200;

      let lengthAdd = 0;
      if ("length" in paramsSelection) {
        lengthAdd = lengthAdds[lengthValue];
        if (typeof lengthAdd !== "number") {
          const lengthNumber = parseNumber(lengthValue) || parseNumber(getSelectedLabel("length"));
          if (!Number.isNaN(lengthNumber)) {
            lengthAdd = Math.max(0, Math.round(((lengthNumber - 900) / 900) * 6200));
          } else {
            lengthAdd = lengthIndex * 6200;
          }
        }
      }

      const estimate = basePrice * materialFactor + thicknessAdd + edgeAdd + lengthAdd;
      const fromPrice = Math.round((estimate * 0.94) / 100) * 100;
      const toPrice = Math.round((estimate * 1.06) / 100) * 100;

      paramsPrice.textContent = `${formatPrice(fromPrice)} - ${formatPrice(toPrice)}`;
      paramsEstimateRange = { from: fromPrice, to: toPrice };
      paramsBlock.dataset.estimateFrom = String(fromPrice);
      paramsBlock.dataset.estimateTo = String(toPrice);

      document.dispatchEvent(
        new CustomEvent("params:updated", {
          detail: { from: fromPrice, to: toPrice },
        })
      );

      let days = shapeDays[shapeValue] ?? 5 + shapeIndex;
      days += materialDays[materialValue] ?? (materialIndex > 1 ? 1 : 0);

      const thicknessNumber = parseNumber(thicknessValue) || parseNumber(getSelectedLabel("thickness"));
      if (!Number.isNaN(thicknessNumber) && thicknessNumber > 40) {
        days += 1;
      }

      if ("length" in paramsSelection && lengthIndex > 1) {
        days += 1;
      }

      paramsTime.textContent = `от ${days} до ${days + 2} дней`;
    }

    function renderProgress() {
      const ready = stepsOrder.filter((step) => Boolean(paramsSelection[step])).length;
      const percent = (ready / stepsOrder.length) * 100;
      paramsProgress.style.width = `${percent}%`;
    }

    function renderParams() {
      renderSelection();
      renderSummary();
      renderMetrics();
      renderProgress();
    }

    paramsOptionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const step = button.dataset.step;
        const value = button.dataset.value;
        if (!step || !value || paramsSelection[step] === value) {
          return;
        }

        paramsSelection[step] = value;
        renderParams();
      });
    });

    initSelectionFromMarkup();
    renderParams();
  });

  runSafe("finish-calc", () => {
  const finishCalc = document.querySelector(".finish-calc");
  if (!finishCalc) {
    return;
  }

  const finishOptionButtons = Array.from(finishCalc.querySelectorAll(".finish-option[data-finish-step][data-value]"));
  const finishVisual = finishCalc.querySelector(".finish-calc__visual");
  const finishDiffs = finishCalc.querySelector(".finish-diffs");
  const paramsBlockNode = document.querySelector(".params-block");

  const finishFieldMap = {
    title: finishCalc.querySelector('[data-finish-field="title"]'),
    description: finishCalc.querySelector('[data-finish-field="description"]'),
    care: finishCalc.querySelector('[data-finish-field="care"]'),
    complexity: finishCalc.querySelector('[data-finish-field="complexity"]'),
    visual: finishCalc.querySelector('[data-finish-field="visual"]'),
    extra: finishCalc.querySelector('[data-finish-field="extra"]'),
    total: finishCalc.querySelector('[data-finish-field="total"]'),
  };

  const finishTagMap = {
    sink: finishCalc.querySelector('[data-finish-tag="sink"]'),
    edge: finishCalc.querySelector('[data-finish-tag="edge"]'),
    plinth: finishCalc.querySelector('[data-finish-tag="plinth"]'),
  };

  const hasFinishFields = Object.values(finishFieldMap).every(Boolean) && Object.values(finishTagMap).every(Boolean);
  if (!finishOptionButtons.length || !finishVisual || !finishDiffs || !hasFinishFields) {
    return;
  }

  const finishOrder = ["sink", "edge", "plinth"];
  const finishCatalog = {
    sink: {
      overmount: {
        label: "Накладная мойка",
        short: "Накладная",
        add: 0,
        care: 1,
        complexity: 0,
        visual: 1,
        note: "Самый быстрый и бюджетный монтаж.",
      },
      undermount: {
        label: "Подстольная мойка",
        short: "Подстольная",
        add: 4500,
        care: 2,
        complexity: 1,
        visual: 2,
        note: "Чистый вырез и удобный уход за поверхностью.",
      },
      flush: {
        label: "Мойка в уровень",
        short: "В уровень",
        add: 7000,
        care: 2,
        complexity: 2,
        visual: 3,
        note: "Плоскость мойки и камня совпадает без выступов.",
      },
      integrated: {
        label: "Интегрированная чаша",
        short: "Интегрированная",
        add: 12000,
        care: 3,
        complexity: 3,
        visual: 3,
        note: "Монолитный премиальный вид без выраженных стыков.",
      },
    },
    edge: {
      edge1: {
        label: "Кромка №1",
        short: "№1",
        add: 0,
        care: 2,
        complexity: 0,
        visual: 1,
        note: "Базовое мягкое скругление для повседневной кухни.",
      },
      edge2: {
        label: "Кромка №2",
        short: "№2",
        add: 600,
        care: 2,
        complexity: 1,
        visual: 1,
        note: "Компактный округлый профиль с аккуратной кромкой.",
      },
      edge3: {
        label: "Кромка №3",
        short: "№3",
        add: 1000,
        care: 2,
        complexity: 1,
        visual: 2,
        note: "Сбалансированный профиль для рабочих зон кухни.",
      },
      edge4: {
        label: "Кромка №4",
        short: "№4",
        add: 1400,
        care: 2,
        complexity: 1,
        visual: 2,
        note: "Более строгая геометрия для современного интерьера.",
      },
      edge5: {
        label: "Кромка №5",
        short: "№5",
        add: 1700,
        care: 2,
        complexity: 1,
        visual: 2,
        note: "Мягкий премиальный торец с улучшенной эргономикой.",
      },
      edge6: {
        label: "Кромка №6",
        short: "№6",
        add: 2100,
        care: 2,
        complexity: 1,
        visual: 2,
        note: "Четкий профиль для графичных и лофт-проектов.",
      },
      edge7: {
        label: "Кромка №7",
        short: "№7",
        add: 2500,
        care: 2,
        complexity: 2,
        visual: 2,
        note: "Двухконтурный торец с выразительным переходом.",
      },
      edge8: {
        label: "Кромка №8",
        short: "№8",
        add: 3000,
        care: 2,
        complexity: 2,
        visual: 2,
        note: "Профиль с дополнительной ступенью для акцентного вида.",
      },
      edge9: {
        label: "Кромка №9",
        short: "№9",
        add: 3600,
        care: 2,
        complexity: 2,
        visual: 3,
        note: "Сложная геометрия торца для премиальных решений.",
      },
      edge10: {
        label: "Кромка №10",
        short: "№10",
        add: 4300,
        care: 2,
        complexity: 2,
        visual: 3,
        note: "Выразительный профиль со скошенным акцентом.",
      },
      edge11: {
        label: "Кромка №11",
        short: "№11",
        add: 4900,
        care: 2,
        complexity: 2,
        visual: 3,
        note: "Усиленная декоративная кромка для фасадных торцов.",
      },
      edge12: {
        label: "Кромка №12",
        short: "№12",
        add: 6200,
        care: 2,
        complexity: 3,
        visual: 3,
        note: "Профиль с мощным объемом для островов и барных зон.",
      },
      edge13: {
        label: "Кромка №13",
        short: "№13",
        add: 7000,
        care: 2,
        complexity: 3,
        visual: 3,
        note: "Радиусный профиль высокой сложности для акцентных проектов.",
      },
      edge14: {
        label: "Кромка №14",
        short: "№14",
        add: 5400,
        care: 2,
        complexity: 2,
        visual: 3,
        note: "Статусная кромка с усиленным торцом под разные толщины.",
      },
    },
    plinth: {
      none: {
        label: "Без пристеночного бортика",
        short: "Без бортика",
        add: 0,
        care: 0,
        complexity: 0,
        visual: 0,
        note: "Открытое примыкание для минималистичного вида.",
      },
      mini: {
        label: "Мини-бортик 12 мм",
        short: "Мини 12 мм",
        add: 1800,
        care: 1,
        complexity: 1,
        visual: 1,
        note: "Тонкая защита от брызг почти без визуального объема.",
      },
      classic: {
        label: "Классический бортик 40 мм",
        short: "Классик 40 мм",
        add: 2900,
        care: 2,
        complexity: 1,
        visual: 2,
        note: "Баланс защиты стены и привычного кухонного профиля.",
      },
      shadow: {
        label: "Теневой бортик 60 мм",
        short: "Теневой 60 мм",
        add: 4500,
        care: 2,
        complexity: 2,
        visual: 3,
        note: "Архитектурный акцент с глубиной и мягким свечением.",
      },
    },
  };

  const finishSelection = {
    sink: "overmount",
    edge: "edge1",
    plinth: "none",
  };

  const levelLabels = {
    care: ["Базовый", "Стандартный", "Высокий", "Максимальный"],
    complexity: ["Низкая", "Средняя", "Высокая", "Премиум"],
    visual: ["Практичный", "Современный", "Премиум", "Архитектурный"],
  };

  const cycleDelays = {
    sink: 6200,
    edge: 6900,
    plinth: 7600,
  };

  const activeTimers = [];
  let autoStopped = false;

  function initFinishSelectionFromMarkup() {
    finishOrder.forEach((step) => {
      const active = finishCalc.querySelector(`.finish-option[data-finish-step="${step}"].is-active`);
      if (active?.dataset.value) {
        finishSelection[step] = active.dataset.value;
      }
    });
  }

  function syncParamsEstimateFromDataset() {
    const from = Number(paramsBlockNode?.dataset.estimateFrom || "");
    const to = Number(paramsBlockNode?.dataset.estimateTo || "");
    if (from > 0 && to > 0) {
      paramsEstimateRange = { from, to };
    }
  }

  function renderFinishDiffs(items) {
    finishDiffs.innerHTML = "";

    items.forEach((text, index) => {
      const li = document.createElement("li");
      li.className = "finish-diff";
      li.textContent = text;
      finishDiffs.append(li);

      if (reducedMotion) {
        li.classList.add("is-visible");
        return;
      }

      setTimeout(() => {
        li.classList.add("is-visible");
      }, index * 85);
    });
  }

  function getLevelText(scale, score) {
    const index = Math.max(0, Math.min(scale.length - 1, score));
    return scale[index];
  }

  function renderFinish() {
    const sink = finishCatalog.sink[finishSelection.sink];
    const edge = finishCatalog.edge[finishSelection.edge];
    const plinth = finishCatalog.plinth[finishSelection.plinth];

    if (!sink || !edge || !plinth) {
      return;
    }

    finishVisual.dataset.finishSink = finishSelection.sink;
    finishVisual.dataset.finishEdge = finishSelection.edge;
    finishVisual.dataset.finishPlinth = finishSelection.plinth;

    finishTagMap.sink.textContent = sink.label;
    finishTagMap.edge.textContent = edge.label;
    finishTagMap.plinth.textContent = plinth.label;

    finishOptionButtons.forEach((button) => {
      const step = button.dataset.finishStep;
      const value = button.dataset.value;
      button.classList.toggle("is-active", Boolean(step && value && finishSelection[step] === value));
    });

    const careScore = Math.round((sink.care + edge.care + plinth.care) / 3);
    const complexityScore = Math.max(sink.complexity, edge.complexity, plinth.complexity);
    const visualScore = Math.round((sink.visual + edge.visual + plinth.visual) / 3);
    const extra = sink.add + edge.add + plinth.add;
    const totalFrom = Math.round((paramsEstimateRange.from + extra) / 100) * 100;
    const totalTo = Math.round((paramsEstimateRange.to + extra) / 100) * 100;

    finishFieldMap.title.textContent = `${sink.short} + ${edge.short} + ${plinth.short}`;
    finishFieldMap.description.textContent =
      "Сценарий учитывает вид монтажа, профиль торца и защиту примыкания к стене в едином комплекте.";
    finishFieldMap.care.textContent = getLevelText(levelLabels.care, careScore);
    finishFieldMap.complexity.textContent = getLevelText(levelLabels.complexity, complexityScore);
    finishFieldMap.visual.textContent = getLevelText(levelLabels.visual, visualScore);
    finishFieldMap.extra.textContent = formatPrice(extra);
    finishFieldMap.total.textContent = `${formatPrice(totalFrom)} - ${formatPrice(totalTo)}`;

    renderFinishDiffs([
      `Мойка: ${sink.note}`,
      `Кромка: ${edge.note}`,
      `Бортик: ${plinth.note}`,
      `Итого: доплата ${formatPrice(extra)} к базовой стоимости столешницы.`,
    ]);
  }

  function cycleStep(step) {
    const list = Object.keys(finishCatalog[step] || {});
    if (!list.length) {
      return;
    }

    const index = list.indexOf(finishSelection[step]);
    const nextIndex = (index + 1) % list.length;
    finishSelection[step] = list[nextIndex];
    renderFinish();
  }

  function stopAuto() {
    autoStopped = true;
    activeTimers.forEach((timer) => clearInterval(timer));
    activeTimers.length = 0;
  }

  function startAuto() {
    if (reducedMotion) {
      return;
    }

    finishOrder.forEach((step) => {
      const timer = setInterval(() => {
        if (autoStopped) {
          return;
        }
        cycleStep(step);
      }, cycleDelays[step] || 7000);
      activeTimers.push(timer);
    });
  }

  finishOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const step = button.dataset.finishStep;
      const value = button.dataset.value;
      if (!step || !value || finishSelection[step] === value) {
        return;
      }

      stopAuto();
      finishSelection[step] = value;
      renderFinish();
    });
  });

  document.addEventListener("params:updated", (event) => {
    const from = Number(event.detail?.from || "");
    const to = Number(event.detail?.to || "");
    if (from > 0 && to > 0) {
      paramsEstimateRange = { from, to };
      renderFinish();
    }
  });

  initFinishSelectionFromMarkup();
  syncParamsEstimateFromDataset();
  renderFinish();

  if (!reducedMotion) {
    finishCalc.addEventListener("pointerdown", stopAuto, { once: true });
    startAuto();
  }
  });

  runSafe("edge-profiles", () => {
  const edgeBlock = document.querySelector("#edge-profiles");
  if (!edgeBlock) {
    return;
  }

  const tabsWrap = edgeBlock.querySelector("[data-edge-tabs]");
  const edgeVisual = edgeBlock.querySelector(".edge-visual");
  const edgeDiffs = edgeBlock.querySelector(".edge-diffs");
  const edgeFieldMap = {
    badge: edgeBlock.querySelector('[data-edge-field="badge"]'),
    title: edgeBlock.querySelector('[data-edge-field="title"]'),
    description: edgeBlock.querySelector('[data-edge-field="description"]'),
    height: edgeBlock.querySelector('[data-edge-field="height"]'),
    profile: edgeBlock.querySelector('[data-edge-field="profile"]'),
    use: edgeBlock.querySelector('[data-edge-field="use"]'),
    image: edgeBlock.querySelector('[data-edge-field="image"]'),
  };

  const hasEdgeFields = Object.values(edgeFieldMap).every(Boolean);
  if (!tabsWrap || !edgeVisual || !edgeDiffs || !hasEdgeFields) {
    return;
  }

  const edgeCatalog = [
    {
      id: "edge1",
      label: "Кромка №1",
      image: "./assets/edge-profiles/kromka-1.webp",
      height: "20 / 40 / 60 мм",
      type: "r3",
      profile: "Мягкое скругление",
      use: "Кухни и ванные",
      description: "Универсальный мягкий профиль для комфортного касания по торцу.",
      points: ["Подходит для ежедневной кухни.", "Смотрится аккуратно на прямых и угловых проектах.", "Хорошо сочетается с накладной и подстольной мойкой."],
    },
    {
      id: "edge2",
      label: "Кромка №2",
      image: "./assets/edge-profiles/kromka-2.webp",
      height: "20 / 40 / 60 мм",
      type: "r3",
      profile: "Мягкая классика",
      use: "Кухни и студии",
      description: "Классический округлый торец с более собранной геометрией.",
      points: ["Комфортна в зоне постоянного контакта.", "Оптимальна для спокойных однотонных декоров.", "Хороший баланс цены и внешнего вида."],
    },
    {
      id: "edge3",
      label: "Кромка №3",
      image: "./assets/edge-profiles/kromka-3.webp",
      height: "20 / 40 / 60 мм",
      type: "r3",
      profile: "Сглаженный профиль",
      use: "Семейные кухни",
      description: "Плавный торец с акцентом на безопасную и приятную геометрию.",
      points: ["Подходит для длинных рабочих линий.", "Визуально смягчает строгие фасады.", "Удобна для кухонь с детьми."],
    },
    {
      id: "edge4",
      label: "Кромка №4",
      image: "./assets/edge-profiles/kromka-4.webp",
      height: "20 / 40 / 60 мм",
      type: "e2",
      profile: "Строгая геометрия",
      use: "Современный интерьер",
      description: "Более прямой и четкий профиль для графичных проектов.",
      points: ["Подчеркивает прямые линии мебели.", "Сочетается с минималистичными фасадами.", "Часто выбирают для лофт-проектов."],
    },
    {
      id: "edge5",
      label: "Кромка №5",
      image: "./assets/edge-profiles/kromka-5.webp",
      height: "20 / 40 / 60 мм",
      type: "r3",
      profile: "Плавный премиум",
      use: "Кухни премиум",
      description: "Мягкий торец с более выразительной глубиной профиля.",
      points: ["Смотрится объемнее на толщине 40/60 мм.", "Комфортный в повседневном использовании.", "Хорошо раскрывается на светлых декорах."],
    },
    {
      id: "edge6",
      label: "Кромка №6",
      image: "./assets/edge-profiles/kromka-6.webp",
      height: "40 / 60 мм",
      type: "e2",
      profile: "Графичный профиль",
      use: "Лофт и модерн",
      description: "Четкий профиль для проектов с выраженной геометрией.",
      points: ["Эффектно смотрится на темных камнях.", "Подходит для барных стоек и островов.", "Выдерживает активную рабочую нагрузку."],
    },
    {
      id: "edge7",
      label: "Кромка №7",
      image: "./assets/edge-profiles/kromka-7.webp",
      height: "20 / 40 / 60 мм",
      type: "r3",
      profile: "Двухконтурная",
      use: "Кухни с декором",
      description: "Декоративный мягкий профиль с заметным переходом по торцу.",
      points: ["Добавляет объема даже спокойной столешнице.", "Сохраняет удобство ухода.", "Подходит для классических кухонь."],
    },
    {
      id: "edge8",
      label: "Кромка №8",
      image: "./assets/edge-profiles/kromka-8.webp",
      height: "40 / 60 мм",
      type: "e2",
      profile: "Ступенчатая",
      use: "Остров и бар",
      description: "Ступенчатый профиль с акцентом на фактуру и толщину.",
      points: ["Лучше раскрывается на 40 и 60 мм.", "Делает торец более статусным.", "Подходит для открытых кухонь-гостиных."],
    },
    {
      id: "edge9",
      label: "Кромка №9",
      image: "./assets/edge-profiles/kromka-9.webp",
      height: "20 / 40 / 60 мм",
      type: "e2",
      profile: "Сложная геометрия",
      use: "Акцентные проекты",
      description: "Выразительная форма торца для интерьерных акцентов.",
      points: ["Подчеркивает дизайнерскую подачу кухни.", "Подходит для длинных видимых торцов.", "Хорошо сочетается с интегрированной мойкой."],
    },
    {
      id: "edge10",
      label: "Кромка №10",
      image: "./assets/edge-profiles/kromka-10.webp",
      height: "40 / 60 мм",
      type: "bevel",
      profile: "Скошенный профиль",
      use: "Современная классика",
      description: "Скошенный торец с динамичной линией и аккуратным контуром.",
      points: ["Визуально облегчает массивную столешницу.", "Частый выбор для кварца и натурального камня.", "Хорошо смотрится в открытых кухнях."],
    },
    {
      id: "edge11",
      label: "Кромка №11",
      image: "./assets/edge-profiles/kromka-11.webp",
      height: "40 мм",
      type: "bevel",
      profile: "Акцентный скос",
      use: "Премиум-кухни",
      description: "Декоративный профиль с выраженным скосом для статусных проектов.",
      points: ["Идеален для толщины 40 мм.", "Добавляет глубину кромке вблизи.", "Часто используют в кухнях с островом."],
    },
    {
      id: "edge12",
      label: "Кромка №12",
      image: "./assets/edge-profiles/kromka-12.webp",
      height: "40 мм",
      type: "waterfall",
      profile: "Объемный торец",
      use: "Острова и стойки",
      description: "Объемный торец с монолитным эффектом в зоне обзора.",
      points: ["Подходит для островных композиций.", "Дает эффект цельной массивной плиты.", "Хорош для проектов с подсветкой."],
    },
    {
      id: "edge13",
      label: "Кромка №13",
      image: "./assets/edge-profiles/kromka-13.webp",
      height: "40 / 50 мм",
      type: "waterfall",
      profile: "Радиусный премиум",
      use: "Дизайнерские проекты",
      description: "Радиусный сложный профиль для акцентных столешниц.",
      points: ["Лучше всего смотрится на премиальных декорах.", "Усиляет «монолитный» характер изделия.", "Часто выбирают под индивидуальный дизайн."],
    },
    {
      id: "edge14",
      label: "Кромка №14",
      image: "./assets/edge-profiles/kromka-14.webp",
      height: "20 / 40 / 60 мм",
      type: "r3",
      profile: "Усиленный торец",
      use: "Кухни с нагрузкой",
      description: "Универсальный усиленный профиль под разные толщины.",
      points: ["Подходит под любой формат кухни.", "Устойчив к ежедневной рабочей нагрузке.", "Хорошо сочетается с любыми вариантами мойки."],
    },
  ];

  let currentEdgeId = edgeCatalog[0].id;
  let autoTimer = null;
  let autoStopped = false;
  let tabButtons = [];

  function renderEdgeDiffs(items) {
    edgeDiffs.innerHTML = "";
    items.forEach((text, index) => {
      const li = document.createElement("li");
      li.className = "edge-diff";
      li.textContent = text;
      edgeDiffs.append(li);

      if (reducedMotion) {
        li.classList.add("is-visible");
        return;
      }

      setTimeout(() => {
        li.classList.add("is-visible");
      }, index * 80);
    });
  }

  function renderEdge() {
    const edge = edgeCatalog.find((item) => item.id === currentEdgeId) || edgeCatalog[0];
    if (!edge) {
      return;
    }

    edgeVisual.dataset.edgeType = edge.type;
    edgeFieldMap.badge.textContent = edge.label;
    edgeFieldMap.title.textContent = edge.label;
    edgeFieldMap.description.textContent = edge.description;
    edgeFieldMap.height.textContent = edge.height;
    edgeFieldMap.profile.textContent = edge.profile;
    edgeFieldMap.use.textContent = edge.use;
    edgeFieldMap.image.src = edge.image;
    edgeFieldMap.image.alt = `${edge.label}, высота ${edge.height}`;

    tabButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.edgeId === edge.id);
      button.setAttribute("aria-selected", button.dataset.edgeId === edge.id ? "true" : "false");
    });

    renderEdgeDiffs(edge.points);
  }

  function stopAuto() {
    autoStopped = true;
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function startAuto() {
    if (reducedMotion) {
      return;
    }
    autoTimer = setInterval(() => {
      if (autoStopped) {
        return;
      }
      const index = edgeCatalog.findIndex((item) => item.id === currentEdgeId);
      const nextIndex = (index + 1) % edgeCatalog.length;
      currentEdgeId = edgeCatalog[nextIndex].id;
      renderEdge();
    }, 5200);
  }

  tabsWrap.innerHTML = "";
  edgeCatalog.forEach((edge, index) => {
    const button = document.createElement("button");
    button.className = `edge-tab${index === 0 ? " is-active" : ""}`;
    button.type = "button";
    button.dataset.edgeId = edge.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", index === 0 ? "true" : "false");
    button.innerHTML =
      `<span class="edge-tab__name">${edge.label}</span>` +
      `<span class="edge-tab__meta">Высота: ${edge.height}</span>`;

    button.addEventListener("click", () => {
      if (currentEdgeId === edge.id) {
        return;
      }
      stopAuto();
      currentEdgeId = edge.id;
      renderEdge();
    });

    tabsWrap.append(button);
  });
  tabButtons = Array.from(tabsWrap.querySelectorAll(".edge-tab[data-edge-id]"));

  renderEdge();
  startAuto();

  if (!reducedMotion) {
    edgeBlock.addEventListener("pointerdown", stopAuto, { once: true });
  }
  });

  runSafe("sinks-showcase", () => {
  const section = document.querySelector(".sinks-showcase");
  if (!section) {
    return;
  }

  const tabs = Array.from(section.querySelectorAll(".sinks-showcase__tab[data-sink-catalog-id]"));
  const image = section.querySelector("[data-sink-catalog-image]");
  const page = section.querySelector("[data-sink-catalog-page]");
  const useField = section.querySelector("[data-sink-catalog-use]");
  const sizeField = section.querySelector("[data-sink-catalog-size]");
  const depthField = section.querySelector("[data-sink-catalog-depth]");
  const badgeField = section.querySelector("[data-sink-catalog-badge]");
  const titleField = section.querySelector("[data-sink-catalog-title]");
  const descriptionField = section.querySelector("[data-sink-catalog-description]");
  const pointsWrap = section.querySelector("[data-sink-catalog-points]");
  const modelsWrap = section.querySelector("[data-sink-catalog-models]");
  const openButton = section.querySelector("[data-sink-catalog-open]");

  if (
    !tabs.length ||
    !image ||
    !page ||
    !useField ||
    !sizeField ||
    !depthField ||
    !badgeField ||
    !titleField ||
    !descriptionField ||
    !pointsWrap ||
    !modelsWrap
  ) {
    return;
  }

  const catalog = [
    {
      id: "round",
      badge: "Мойки для кухни",
      title: "Круглые и эллипс модели",
      description: "Форма без острых углов, удобна в ежедневном уходе и хорошо подходит для компактных кухонь.",
      use: "Кухни с мягкими линиями",
      size: "Ø380-500 мм",
      depth: "до 200 мм",
      pageLabel: "стр. 1 / 7",
      image: "./assets/sinks-catalog/sink-page-01.png",
      alt: "Каталог моек и раковин из камня, страница 1 с круглыми и эллипс моделями",
      points: [
        "Лаконичный вид в минималистичных и современных проектах.",
        "Удобны при установке в прямые и компактные столешницы.",
        "Модели с чертежами и посадочными размерами на одном листе.",
      ],
      models: [
        "Circle 380 C",
        "Circle 400 C",
        "Circle 450 C",
        "Ellipse 500 C",
        "Classic 400 C",
        "GL 400 C",
        "Classic 400 R",
        "GL 400 R",
      ],
    },
    {
      id: "classic",
      badge: "Серии Classic / GL",
      title: "Квадратные и прямоугольные серии",
      description: "Основная линейка универсальных чаш для кухни: удобный рабочий объем и практичная геометрия.",
      use: "Классические кухни",
      size: "400-450 мм",
      depth: "до 200 мм",
      pageLabel: "стр. 2 / 7",
      image: "./assets/sinks-catalog/sink-page-02.png",
      alt: "Каталог моек из камня, страница 2 с сериями Classic и GL",
      points: [
        "Закрывает большинство типовых размеров кухонных модулей.",
        "Удобно выбирать модель по чертежу до запуска производства.",
        "Есть варианты с разной геометрией углов и формой дна.",
      ],
      models: [
        "Classic 400 S",
        "GL 400 S",
        "Classic 415 S",
        "GL 420 S",
        "Classic 420 S",
        "Classic 450 C",
        "Classic 450 S",
        "GL 450 C",
        "GL 450 S"
      ],
    },
    {
      id: "classic-plus",
      badge: "Крупные чаши",
      title: "Classic / GL для увеличенного объема",
      description: "Модели увеличенного формата для проектов с высокой нагрузкой и большим объемом чаши.",
      use: "Кухни с активной эксплуатацией",
      size: "450-800 мм",
      depth: "до 200 мм",
      pageLabel: "стр. 3 / 7",
      image: "./assets/sinks-catalog/sink-page-03.png",
      alt: "Каталог моек из камня, страница 3 с крупными моделями Classic и GL",
      points: [
        "Подходят для семейных кухонь и зон интенсивного использования.",
        "Больше полезного объема без потери аккуратного внешнего вида.",
        "Удобный выбор между квадратной и скругленной геометрией.",
      ],
      models: [
        "Classic 450 S",
        "GL 500 C",
        "Classic 500 C",
        "Classic 500 S",
        "GL 500 S",
        "Classic 800 C",
      ],
    },
    {
      id: "compact",
      badge: "Компактные решения",
      title: "Мойки меньших размеров C-V",
      description: "Серия для узких зон, постирочных и небольших кухонь, где важен каждый сантиметр столешницы.",
      use: "Небольшие помещения",
      size: "160-420 мм",
      depth: "150-160 мм",
      pageLabel: "стр. 4 / 7",
      image: "./assets/sinks-catalog/sink-page-04.png",
      alt: "Каталог моек из камня, страница 4 с компактными моделями C-V",
      points: [
        "Удобны для вторых моек, гостевых кухонь и барных зон.",
        "Продолговатая форма помогает экономить рабочую поверхность.",
        "Можно использовать как функциональную дополнительную чашу.",
      ],
      models: [
        "Classic 300 C-V",
        "GL 300 C-V",
        "Classic 400 C-V",
        "GL 400 C-V",
        "Classic 420 C-V",
        "GL 420 C-V",
        "Classic 300-170 C-V",
        "Classic 350-170 C-V",
        "Classic 400-170 C-V",
      ],
    },
    {
      id: "bowl",
      badge: "Раковины Bowl",
      title: "Овальные чаши для ванных комнат",
      description: "Накладные раковины с плавной геометрией: акцент на дизайн и комфорт повседневного использования.",
      use: "Санузлы и ванные",
      size: "248-810 мм",
      depth: "по модели",
      pageLabel: "стр. 5 / 7",
      image: "./assets/sinks-catalog/sink-page-05.png",
      alt: "Каталог раковин из камня, страница 5 с моделями Bowl",
      points: [
        "Легко сочетать с тумбами и столешницами из того же камня.",
        "Подходят как для компактных, так и для просторных ванных.",
        "Модели отличаются по длине, высоте и форме борта.",
      ],
      models: ["Bowl 248", "Bowl 370", "Bowl 420", "Bowl 478", "Bowl 528", "Bowl 508", "Bowl 810", "Bowl 700"],
    },
    {
      id: "boat",
      badge: "Раковины-лодочки",
      title: "Серия Boat для выразительных интерьеров",
      description: "Характерная вытянутая форма «лодочка» делает раковину визуальным центром ванной комнаты.",
      use: "Дизайн-акцент",
      size: "500-1050 мм",
      depth: "110-150 мм",
      pageLabel: "стр. 6 / 7",
      image: "./assets/sinks-catalog/sink-page-06.png",
      alt: "Каталог раковин из камня, страница 6 с серией Boat",
      points: [
        "Подходит для премиальных проектов с открытой столешницей.",
        "Широкий диапазон длины для одиночной и двойной зоны.",
        "Сочетается с камнем под матовый и шелковистый финиш.",
      ],
      models: ["Boat 500", "Boat 600", "Boat 635", "Boat 700", "Boat 800", "Boat 830", "Boat 1050"],
    },
    {
      id: "design",
      badge: "Индивидуальные формы",
      title: "Дизайнерские модели и персонализация",
      description: "Категория с акцентом на уникальную форму: подходим для интерьеров, где важен характер изделия.",
      use: "Индивидуальные проекты",
      size: "около 690 мм",
      depth: "190-200 мм",
      pageLabel: "стр. 7 / 7",
      image: "./assets/sinks-catalog/sink-page-07.png",
      alt: "Каталог дизайнерских раковин из камня, страница 7",
      points: [
        "Возможна адаптация формы и параметров под ваш проект.",
        "Решение для шоу-румов, салонов и авторских ванных.",
        "Поддерживаем единый стиль со столешницей и стеновыми панелями.",
      ],
      models: ["MUSE", "OASE"],
    },
  ];

  const byId = (id) => catalog.find((item) => item.id === id) || catalog[0];
  let currentId = tabs.find((tab) => tab.classList.contains("is-active"))?.dataset.sinkCatalogId || catalog[0].id;

  const modal = document.querySelector("[data-sink-catalog-modal]");
  const modalImage = modal?.querySelector(".sinks-catalog-modal__image");
  const modalTitle = modal?.querySelector("[data-sink-catalog-modal-title]");
  const modalPage = modal?.querySelector("[data-sink-catalog-modal-page]");
  const modalClose = Array.from(modal?.querySelectorAll("[data-sink-catalog-close]") || []);
  const modalNavButtons = Array.from(modal?.querySelectorAll("[data-sink-catalog-nav]") || []);

  function renderPoints(points) {
    pointsWrap.innerHTML = "";
    points.forEach((text) => {
      const row = document.createElement("li");
      row.textContent = text;
      pointsWrap.append(row);
    });
  }

  function renderModels(models) {
    modelsWrap.innerHTML = "";
    models.forEach((text) => {
      const model = document.createElement("span");
      model.className = "sinks-showcase__model";
      model.textContent = text;
      modelsWrap.append(model);
    });
  }

  function renderModal() {
    if (!modal || modal.hidden || !modalImage || !modalTitle || !modalPage) {
      return;
    }
    const item = byId(currentId);
    modalImage.src = item.image;
    modalImage.alt = item.alt;
    modalTitle.textContent = item.title;
    modalPage.textContent = item.pageLabel;
  }

  function renderCategory(nextId) {
    const item = byId(nextId);
    currentId = item.id;

    tabs.forEach((tab) => {
      const isActive = tab.dataset.sinkCatalogId === item.id;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    image.src = item.image;
    image.alt = item.alt;
    page.textContent = item.pageLabel;
    useField.textContent = item.use;
    sizeField.textContent = item.size;
    depthField.textContent = item.depth;
    badgeField.textContent = item.badge;
    titleField.textContent = item.title;
    descriptionField.textContent = item.description;
    renderPoints(item.points);
    renderModels(item.models);
    renderModal();
  }

  function shiftCategory(step) {
    const index = catalog.findIndex((item) => item.id === currentId);
    const safeIndex = index < 0 ? 0 : index;
    const nextIndex = (safeIndex + step + catalog.length) % catalog.length;
    renderCategory(catalog[nextIndex].id);
  }

  function setModalVisible(visible) {
    if (!modal) {
      return;
    }
    modal.hidden = !visible;
    document.body.classList.toggle("has-sink-catalog-modal", visible);
    if (visible) {
      renderModal();
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const nextId = tab.dataset.sinkCatalogId;
      if (!nextId || nextId === currentId) {
        return;
      }
      renderCategory(nextId);
    });
  });

  if (openButton) {
    openButton.addEventListener("click", () => {
      if (!modal) {
        window.open(byId(currentId).image, "_blank", "noopener");
        return;
      }
      setModalVisible(true);
    });
  }

  modalClose.forEach((button) => {
    button.addEventListener("click", () => {
      setModalVisible(false);
    });
  });

  modalNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.sinkCatalogNav || 0);
      if (!step) {
        return;
      }
      shiftCategory(step);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!modal || modal.hidden) {
      return;
    }

    if (event.key === "Escape") {
      setModalVisible(false);
      return;
    }

    if (event.key === "ArrowLeft") {
      shiftCategory(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      shiftCategory(1);
    }
  });

  renderCategory(currentId);
  });

  runSafe("works-gallery", () => {
  const worksGallery = document.querySelector(".works-gallery");
  if (!worksGallery) {
    return;
  }

  const worksFilters = Array.from(worksGallery.querySelectorAll(".works-filter[data-work-filter]"));
  const worksGrid = worksGallery.querySelector(".works-grid");
  const worksNavButtons = Array.from(worksGallery.querySelectorAll(".works-nav[data-work-nav]"));
  const worksPoints = worksGallery.querySelector(".works-points");
  const worksViewer = worksGallery.querySelector(".works-viewer");
  const worksViewerVisual = worksGallery.querySelector(".works-viewer__visual");
  const worksViewerImage = worksGallery.querySelector(".works-viewer__image");
  const worksPhotoNavButtons = Array.from(worksGallery.querySelectorAll(".works-photo-nav[data-work-photo-nav]"));
  const worksPhotoOpenButton = worksGallery.querySelector("[data-work-photo-open]");
  const worksPhotoCounterInline = worksGallery.querySelector("[data-work-photo-counter-inline]");
  const worksPhotoModal = document.querySelector("[data-work-photo-modal]");
  const worksPhotoModalImage = worksPhotoModal?.querySelector(".work-photo-modal__image");
  const worksPhotoModalClose = Array.from(worksPhotoModal?.querySelectorAll("[data-work-photo-close]") || []);
  const worksPhotoModalNavButtons = Array.from(
    worksPhotoModal?.querySelectorAll("[data-work-photo-modal-nav]") || []
  );
  const worksPhotoModalCounter = worksPhotoModal?.querySelector("[data-work-photo-counter-modal]");

  const worksFieldMap = {
    badge: worksGallery.querySelector('[data-work-field="badge"]'),
    title: worksGallery.querySelector('[data-work-field="title"]'),
    description: worksGallery.querySelector('[data-work-field="description"]'),
    layout: worksGallery.querySelector('[data-work-field="layout"]'),
    timeline: worksGallery.querySelector('[data-work-field="timeline"]'),
    budget: worksGallery.querySelector('[data-work-field="budget"]'),
  };

  const hasWorksFields = Object.values(worksFieldMap).every(Boolean);
  if (
    !worksFilters.length ||
    !worksGrid ||
    !worksPoints ||
    !worksViewer ||
    !worksViewerVisual ||
    !worksViewerImage ||
    !hasWorksFields
  ) {
    return;
  }

  const worksData = {
    acrylic: [
      {
        id: "acrylic-wave",
        cardTitle: "Wave Line",
        cardMeta: "Сатиновый акрил + интегрированная мойка",
        tag: "Acrylic",
        badge: "Acrylic / Soft Matte",
        title: "Кухня Wave Line",
        description: "Плавные радиусы, бесшовная стыковка и теплый тактильный финиш акрилового камня.",
        layout: "Угловая + остров",
        timeline: "7 дней",
        budget: "от 128 000 ₽",
        thumbPos: "20% 50%",
        viewerPos: "16% 52%",
        tint: "rgba(255, 211, 106, 0.36)",
        points: [
          "Интегрированная чаша в цвет столешницы.",
          "Скрытый пристеночный бортик 12 мм.",
          "Финишное антибликовое покрытие для ежедневной кухни.",
        ],
      },
      {
        id: "acrylic-loft",
        cardTitle: "Loft Mono",
        cardMeta: "Глубокий графит с четкой геометрией",
        tag: "Acrylic",
        badge: "Acrylic / Graphite",
        title: "Проект Loft Mono",
        description: "Контрастная акриловая столешница для минималистичной кухни-гостиной.",
        layout: "Прямая + барная стойка",
        timeline: "6 дней",
        budget: "от 109 000 ₽",
        thumbPos: "36% 58%",
        viewerPos: "34% 56%",
        tint: "rgba(187, 210, 255, 0.28)",
        points: [
          "Кромка №6 для графичного профиля.",
          "Подстольная мойка с чистым вырезом.",
          "Усиленная зона барного свеса.",
        ],
      },
      {
        id: "acrylic-nordic",
        cardTitle: "Nordic Sand",
        cardMeta: "Светлый акрил под сканди стиль",
        tag: "Acrylic",
        badge: "Acrylic / Nordic",
        title: "Кухня Nordic Sand",
        description: "Светлая монолитная поверхность, которая визуально расширяет пространство.",
        layout: "П-образная кухня",
        timeline: "8 дней",
        budget: "от 142 000 ₽",
        thumbPos: "54% 48%",
        viewerPos: "52% 50%",
        tint: "rgba(255, 239, 178, 0.32)",
        points: [
          "Фигурный пристеночный бортик 40 мм.",
          "Радиусные окончания по бокам.",
          "Теплый матовый финиш без бликов.",
        ],
      },
      {
        id: "acrylic-urban",
        cardTitle: "Urban White",
        cardMeta: "Чистый белый акрил для студии",
        tag: "Acrylic",
        badge: "Acrylic / Pure White",
        title: "Проект Urban White",
        description: "Лаконичная белая столешница с цельной линией и аккуратной геометрией.",
        layout: "Линейная кухня",
        timeline: "5 дней",
        budget: "от 86 000 ₽",
        thumbPos: "70% 54%",
        viewerPos: "74% 52%",
        tint: "rgba(255, 255, 255, 0.24)",
        points: [
          "Мини-бортик 12 мм в цвет плиты.",
          "Накладная мойка с усиленной герметизацией.",
          "Быстрый монтаж за один выезд.",
        ],
      },
    ],
    quartz: [
      {
        id: "quartz-river",
        cardTitle: "River Quartz",
        cardMeta: "Кварцевый агломерат с живыми прожилками",
        tag: "Quartz",
        badge: "Quartz / Vein",
        title: "Кухня River Quartz",
        description: "Эффект мраморной текстуры при повышенной стойкости к износу и пятнам.",
        layout: "Угловая + полуостров",
        timeline: "9 дней",
        budget: "от 168 000 ₽",
        thumbPos: "18% 46%",
        viewerPos: "20% 48%",
        tint: "rgba(158, 201, 255, 0.32)",
        points: [
          "Подстольная мойка с обработкой выреза.",
          "Кромка №10 для визуальной легкости.",
          "Теневой бортик 60 мм как акцент.",
        ],
      },
      {
        id: "quartz-graph",
        cardTitle: "Graphite Core",
        cardMeta: "Темный кварц для премиум интерьера",
        tag: "Quartz",
        badge: "Quartz / Dark",
        title: "Проект Graphite Core",
        description: "Глубокий кварцевый оттенок с контрастной подсветкой рабочей зоны.",
        layout: "Остров 2.4 м",
        timeline: "10 дней",
        budget: "от 194 000 ₽",
        thumbPos: "34% 58%",
        viewerPos: "36% 56%",
        tint: "rgba(169, 184, 255, 0.28)",
        points: [
          "Кромка №12 по торцам острова.",
          "Мойка в уровень со столешницей.",
          "Усиление под встраиваемую технику.",
        ],
      },
      {
        id: "quartz-cloud",
        cardTitle: "Cloud Pearl",
        cardMeta: "Светлый кварц с мягкой фактурой",
        tag: "Quartz",
        badge: "Quartz / Pearl",
        title: "Кухня Cloud Pearl",
        description: "Нежная текстура кварцевого агломерата для светлых современных интерьеров.",
        layout: "Прямая + высокий фартук",
        timeline: "8 дней",
        budget: "от 151 000 ₽",
        thumbPos: "56% 52%",
        viewerPos: "58% 50%",
        tint: "rgba(255, 235, 180, 0.32)",
        points: [
          "Кромка №1 для безопасного касания.",
          "Классический бортик 40 мм в тон камня.",
          "Готовый комплект с вырезами под технику.",
        ],
      },
      {
        id: "quartz-line",
        cardTitle: "Line Marble",
        cardMeta: "Контрастные прожилки по всей длине",
        tag: "Quartz",
        badge: "Quartz / Marble",
        title: "Проект Line Marble",
        description: "Сложная подгонка рисунка на длинной рабочей линии и островной части.",
        layout: "П-форма + остров",
        timeline: "11 дней",
        budget: "от 214 000 ₽",
        thumbPos: "76% 48%",
        viewerPos: "78% 50%",
        tint: "rgba(255, 211, 106, 0.3)",
        points: [
          "Стыковка прожилок по шаблону проекта.",
          "Интеграция варочной панели заподлицо.",
          "Премиальная полировка торцов.",
        ],
      },
    ],
    natural: [
      {
        id: "natural-granite",
        cardTitle: "Granite Prime",
        cardMeta: "Натуральный гранит для высокой нагрузки",
        tag: "Natural",
        badge: "Natural / Granite",
        title: "Кухня Granite Prime",
        description: "Природный гранит с яркой зернистой структурой и максимально высокой прочностью.",
        layout: "Угловая кухня",
        timeline: "12 дней",
        budget: "от 226 000 ₽",
        thumbPos: "20% 58%",
        viewerPos: "22% 56%",
        tint: "rgba(180, 198, 255, 0.24)",
        points: [
          "Антискользящая обработка у мойки.",
          "Усиленная кромка №6 на рабочих торцах.",
          "Глубокая пропитка поверхности.",
        ],
      },
      {
        id: "natural-marble",
        cardTitle: "Marble Class",
        cardMeta: "Натуральный мрамор с выразительным рисунком",
        tag: "Natural",
        badge: "Natural / Marble",
        title: "Проект Marble Class",
        description: "Акцентная мраморная столешница, где рисунок камня становится главным элементом интерьера.",
        layout: "Остров + стеновая панель",
        timeline: "14 дней",
        budget: "от 279 000 ₽",
        thumbPos: "38% 44%",
        viewerPos: "40% 46%",
        tint: "rgba(255, 227, 149, 0.33)",
        points: [
          "Подбор слэба по направлению прожилок.",
          "Теневой бортик с мягкой подсветкой.",
          "Ручная доводка кромки под проект.",
        ],
      },
      {
        id: "natural-travertine",
        cardTitle: "Travertine Soft",
        cardMeta: "Теплый природный оттенок",
        tag: "Natural",
        badge: "Natural / Travertine",
        title: "Кухня Travertine Soft",
        description: "Теплый каменный тон для уютной кухни с живой натуральной фактурой.",
        layout: "Прямая + островная консоль",
        timeline: "13 дней",
        budget: "от 244 000 ₽",
        thumbPos: "56% 54%",
        viewerPos: "58% 54%",
        tint: "rgba(255, 205, 120, 0.3)",
        points: [
          "Классический бортик 40 мм из того же слэба.",
          "Монтаж с минимальными швами.",
          "Финишная гидрофобная защита поверхности.",
        ],
      },
      {
        id: "natural-slate",
        cardTitle: "Slate Bold",
        cardMeta: "Натуральный сланец для контрастных кухонь",
        tag: "Natural",
        badge: "Natural / Slate",
        title: "Проект Slate Bold",
        description: "Темный натуральный камень с выразительной фактурой для интерьеров в стиле high-end loft.",
        layout: "Г-форма + барный модуль",
        timeline: "12 дней",
        budget: "от 238 000 ₽",
        thumbPos: "78% 52%",
        viewerPos: "80% 52%",
        tint: "rgba(154, 173, 255, 0.25)",
        points: [
          "Кромка №10 для выразительного торца.",
          "Подстольная мойка с усиленным креплением.",
          "Сервисный набор по уходу за натуральным камнем.",
        ],
      },
    ],
  };

  const photoPool = [
    {
      src: "https://images.pexels.com/photos/18033166/pexels-photo-18033166.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "22% 54%",
      viewerPos: "18% 52%",
    },
    {
      src: "https://images.pexels.com/photos/35493893/pexels-photo-35493893.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "38% 56%",
      viewerPos: "34% 54%",
    },
    {
      src: "https://images.pexels.com/photos/4119847/pexels-photo-4119847.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "56% 50%",
      viewerPos: "52% 50%",
    },
    {
      src: "https://images.pexels.com/photos/8082197/pexels-photo-8082197.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "74% 54%",
      viewerPos: "70% 52%",
    },
    {
      src: "https://images.pexels.com/photos/18078647/pexels-photo-18078647.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "28% 48%",
      viewerPos: "26% 48%",
    },
    {
      src: "https://images.pexels.com/photos/36777837/pexels-photo-36777837.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "66% 56%",
      viewerPos: "64% 54%",
    },
    {
      src: "https://images.pexels.com/photos/8135490/pexels-photo-8135490.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "44% 44%",
      viewerPos: "40% 44%",
    },
    {
      src: "https://images.pexels.com/photos/11018252/pexels-photo-11018252.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "18% 60%",
      viewerPos: "20% 58%",
    },
    {
      src: "https://images.pexels.com/photos/10117754/pexels-photo-10117754.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "78% 46%",
      viewerPos: "76% 46%",
    },
    {
      src: "https://images.pexels.com/photos/7601156/pexels-photo-7601156.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "24% 40%",
      viewerPos: "26% 42%",
    },
    {
      src: "https://images.pexels.com/photos/8288957/pexels-photo-8288957.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "58% 58%",
      viewerPos: "58% 56%",
    },
    {
      src: "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1800",
      thumbPos: "72% 48%",
      viewerPos: "70% 48%",
    },
  ];

  const allWorks = [...worksData.acrylic, ...worksData.quartz, ...worksData.natural];
  allWorks.forEach((item, index) => {
    const first = photoPool[index % photoPool.length];
    const second = photoPool[(index + 2) % photoPool.length];
    item.photos = [
      {
        src: first.src,
        thumbPos: first.thumbPos || item.thumbPos,
        viewerPos: first.viewerPos || item.viewerPos,
      },
      {
        src: second.src,
        thumbPos: second.thumbPos || item.thumbPos,
        viewerPos: second.viewerPos || item.viewerPos,
      },
    ];
  });

  let currentWorkFilter =
    worksFilters.find((button) => button.classList.contains("is-active"))?.dataset.workFilter || "acrylic";
  let currentWorkList = worksData[currentWorkFilter] || worksData.acrylic;
  let currentWorkId = currentWorkList[0]?.id || "";
  let currentWorkPhotoIndex = 0;
  let modalPhotoIndex = 0;

  const cssUrl = (value) => `url("${String(value).replace(/"/g, '\\"')}")`;

  function getWorkPhotos(item) {
    if (!item) {
      return [];
    }

    if (Array.isArray(item.photos) && item.photos.length) {
      return item.photos;
    }

    return [
      {
        src: "./hero-kitchen.jpg",
        thumbPos: item.thumbPos,
        viewerPos: item.viewerPos,
      },
    ];
  }

  function renderWorkPoints(items) {
    worksPoints.innerHTML = "";

    items.forEach((text, index) => {
      const row = document.createElement("li");
      row.className = "work-point";
      row.textContent = text;
      worksPoints.append(row);

      if (reducedMotion) {
        row.classList.add("is-visible");
        return;
      }

      setTimeout(() => {
        row.classList.add("is-visible");
      }, index * 90);
    });
  }

  function renderViewerPhoto(item) {
    const photos = getWorkPhotos(item);
    if (!photos.length) {
      return;
    }

    currentWorkPhotoIndex = (currentWorkPhotoIndex + photos.length) % photos.length;
    const photo = photos[currentWorkPhotoIndex];
    worksViewerImage.style.setProperty("--viewer-image", cssUrl(photo.src));
    worksViewerImage.style.setProperty("--viewer-pos", photo.viewerPos || item.viewerPos || "center");
    worksViewerImage.style.setProperty("--viewer-tint", item.tint);

    if (worksPhotoCounterInline) {
      worksPhotoCounterInline.textContent = `${currentWorkPhotoIndex + 1} / ${photos.length}`;
    }
  }

  function renderWorksGrid() {
    worksGrid.innerHTML = "";

    currentWorkList.forEach((item) => {
      const firstPhoto = getWorkPhotos(item)[0];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "work-card";
      if (item.id === currentWorkId) {
        card.classList.add("is-active");
      }
      card.dataset.workId = item.id;
      card.style.setProperty("--work-image", cssUrl(firstPhoto?.src || "./hero-kitchen.jpg"));
      card.style.setProperty("--work-pos", firstPhoto?.thumbPos || item.thumbPos);
      card.style.setProperty("--work-tint", item.tint);
      card.innerHTML =
        `<span class="work-card__media"></span>` +
        `<span class="work-card__title">${item.cardTitle}</span>` +
        `<span class="work-card__meta">${item.cardMeta}</span>` +
        `<span class="work-card__tag">${item.tag}</span>`;
      worksGrid.append(card);
    });
  }

  function getCurrentWork() {
    return currentWorkList.find((item) => item.id === currentWorkId) || currentWorkList[0];
  }

  function renderWorksViewer() {
    const item = getCurrentWork();
    if (!item) {
      return;
    }

    worksFieldMap.badge.textContent = item.badge;
    worksFieldMap.title.textContent = item.title;
    worksFieldMap.description.textContent = item.description;
    worksFieldMap.layout.textContent = item.layout;
    worksFieldMap.timeline.textContent = item.timeline;
    worksFieldMap.budget.textContent = item.budget;
    renderViewerPhoto(item);

    worksFilters.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.workFilter === currentWorkFilter);
    });

    renderWorkPoints(item.points);
  }

  function applyWorkFilter(filter) {
    const list = worksData[filter];
    if (!list || !list.length) {
      return;
    }

    currentWorkFilter = filter;
    currentWorkList = list;
    currentWorkId = list[0].id;
    currentWorkPhotoIndex = 0;
    renderWorksGrid();
    renderWorksViewer();
  }

  function setCurrentWork(id) {
    if (!id || !currentWorkList.some((item) => item.id === id)) {
      return;
    }

    currentWorkId = id;
    currentWorkPhotoIndex = 0;
    renderWorksGrid();
    renderWorksViewer();
  }

  worksFilters.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.workFilter;
      if (!filter || filter === currentWorkFilter) {
        return;
      }

      applyWorkFilter(filter);
    });
  });

  worksGrid.addEventListener("click", (event) => {
    const target = event.target.closest(".work-card[data-work-id]");
    if (!target) {
      return;
    }

    const id = target.dataset.workId;
    if (!id || id === currentWorkId) {
      return;
    }

    setCurrentWork(id);
  });

  worksNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.workNav || 0);
      if (!step || !currentWorkList.length) {
        return;
      }

      const index = currentWorkList.findIndex((item) => item.id === currentWorkId);
      const nextIndex = (index + step + currentWorkList.length) % currentWorkList.length;
      currentWorkId = currentWorkList[nextIndex].id;
      currentWorkPhotoIndex = 0;
      renderWorksGrid();
      renderWorksViewer();
    });
  });

  worksPhotoNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.workPhotoNav || 0);
      if (!step) {
        return;
      }

      const item = getCurrentWork();
      const photos = getWorkPhotos(item);
      if (photos.length < 2) {
        return;
      }

      currentWorkPhotoIndex = (currentWorkPhotoIndex + step + photos.length) % photos.length;
      renderViewerPhoto(item);
    });
  });

  const openWorkPhotoModal = () => {
    if (!worksPhotoModal || !worksPhotoModalImage) {
      return;
    }

    const item = getCurrentWork();
    const photos = getWorkPhotos(item);
    if (!photos.length) {
      return;
    }

    modalPhotoIndex = currentWorkPhotoIndex;
    const photo = photos[modalPhotoIndex];
    worksPhotoModalImage.src = photo.src;
    worksPhotoModalImage.alt = `${item.title} — фото ${modalPhotoIndex + 1}`;
    if (worksPhotoModalCounter) {
      worksPhotoModalCounter.textContent = `${modalPhotoIndex + 1} / ${photos.length}`;
    }

    worksPhotoModal.hidden = false;
    worksPhotoModal.style.display = "grid";
    document.body.classList.add("has-work-photo-modal");
  };

  const closeWorkPhotoModal = () => {
    if (!worksPhotoModal) {
      return;
    }

    worksPhotoModal.hidden = true;
    worksPhotoModal.style.display = "none";
    document.body.classList.remove("has-work-photo-modal");
  };

  const shiftModalPhoto = (step) => {
    const item = getCurrentWork();
    const photos = getWorkPhotos(item);
    if (photos.length < 2) {
      return;
    }

    modalPhotoIndex = (modalPhotoIndex + step + photos.length) % photos.length;
    currentWorkPhotoIndex = modalPhotoIndex;

    const photo = photos[modalPhotoIndex];
    if (worksPhotoModalImage) {
      worksPhotoModalImage.src = photo.src;
      worksPhotoModalImage.alt = `${item.title} — фото ${modalPhotoIndex + 1}`;
    }
    if (worksPhotoModalCounter) {
      worksPhotoModalCounter.textContent = `${modalPhotoIndex + 1} / ${photos.length}`;
    }

    renderViewerPhoto(item);
  };

  if (worksPhotoOpenButton) {
    worksPhotoOpenButton.addEventListener("click", () => {
      openWorkPhotoModal();
    });
  }

  worksViewerVisual.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest(".works-photo-nav") || event.target.closest("[data-work-photo-open]")) {
      return;
    }

    openWorkPhotoModal();
  });

  worksPhotoModalClose.forEach((button) => {
    button.addEventListener("click", () => {
      closeWorkPhotoModal();
    });
  });

  worksPhotoModalNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.workPhotoModalNav || 0);
      if (!step) {
        return;
      }

      shiftModalPhoto(step);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!worksPhotoModal || worksPhotoModal.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeWorkPhotoModal();
      return;
    }

    if (event.key === "ArrowLeft") {
      shiftModalPhoto(-1);
    }

    if (event.key === "ArrowRight") {
      shiftModalPhoto(1);
    }
  });

  if (!reducedMotion) {
    worksGrid.addEventListener("pointermove", (event) => {
      const card = event.target.closest(".work-card");
      if (!card) {
        return;
      }

      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rx = ((rect.height / 2 - y) / rect.height) * 4;
      const ry = ((x - rect.width / 2) / rect.width) * 4;
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
      card.style.setProperty("--card-rx", `${rx.toFixed(2)}deg`);
      card.style.setProperty("--card-ry", `${ry.toFixed(2)}deg`);
    });

    worksGrid.addEventListener("pointerleave", () => {
      const cards = worksGrid.querySelectorAll(".work-card");
      cards.forEach((card) => {
        card.style.removeProperty("--card-rx");
        card.style.removeProperty("--card-ry");
      });
    });

    worksViewer.addEventListener("pointermove", (event) => {
      const rect = worksViewer.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      worksViewer.style.setProperty("--vx", `${x}px`);
      worksViewer.style.setProperty("--vy", `${y}px`);
    });
  }

  applyWorkFilter(currentWorkFilter);
  });

  runSafe("order-block", () => {
  const orderBlock = document.querySelector(".order-block");
  if (!orderBlock) {
    return;
  }

  const orderProcess = orderBlock.querySelector(".order-process");
  const orderSteps = Array.from(orderBlock.querySelectorAll(".order-step[data-order-stage]"));
  const orderProgressBar = orderBlock.querySelector(".order-progress__bar");
  const orderPercentFill = orderBlock.querySelector(".order-percent-card__fill");
  const orderList = orderBlock.querySelector(".order-process__list");
  const orderForm = orderBlock.querySelector(".order-form-panel");
  const orderSubmit = orderBlock.querySelector(".order-submit");

  const orderFieldMap = {
    badge: orderBlock.querySelector('[data-order-field="badge"]'),
    title: orderBlock.querySelector('[data-order-field="title"]'),
    description: orderBlock.querySelector('[data-order-field="description"]'),
    percent: orderBlock.querySelector('[data-order-field="percent"]'),
    percentNote: orderBlock.querySelector('[data-order-field="percent-note"]'),
    eta: orderBlock.querySelector('[data-order-field="eta"]'),
  };

  const hasOrderFields = Object.values(orderFieldMap).every(Boolean);
  if (!orderProcess || !orderSteps.length || !orderProgressBar || !orderPercentFill || !orderList || !hasOrderFields) {
    return;
  }

  const orderFlow = {
    measure: {
      badge: "Шаг 1",
      percent: 18,
      percentNote: "Этап: выезд и первичные замеры",
      eta: "до готовности: 7 дней",
      title: "Профессиональный замер",
      description: "Выезжаем на объект, фиксируем геометрию помещения и все технические привязки.",
      points: [
        "Проверяем уровни стен и мебели лазерным инструментом.",
        "Уточняем точки мойки, варочной панели и розеток.",
        "Согласовываем финальную конфигурацию изделия.",
      ],
    },
    template: {
      badge: "Шаг 2",
      percent: 36,
      percentNote: "Этап: шаблон и согласование",
      eta: "до готовности: 6 дней",
      title: "Подготовка шаблона",
      description: "Формируем точный шаблон, чтобы изделие село в помещение без зазоров.",
      points: [
        "Переносим замер в цифровой чертеж для производства.",
        "Проверяем диагонали и сложные зоны примыканий.",
        "Подтверждаем с вами вырезы и профиль кромки.",
      ],
    },
    fabrication: {
      badge: "Шаг 3",
      percent: 63,
      percentNote: "Этап: основной цикл производства",
      eta: "до готовности: 4 дня",
      title: "Изготовление в цехе",
      description: "Режем камень на ЧПУ, выполняем склейку и формируем точную геометрию.",
      points: [
        "Фрезеровка мест под технику и мойку по шаблону.",
        "Склейка элементов с выравниванием по фактуре.",
        "Контроль качества до отправки на полировку.",
      ],
    },
    polish: {
      badge: "Шаг 4",
      percent: 84,
      percentNote: "Этап: финишная доводка",
      eta: "до готовности: 2 дня",
      title: "Полировка и финиш",
      description: "Доводим кромки и поверхность до чистого премиального результата.",
      points: [
        "Многоэтапная обработка торцов под выбранный профиль.",
        "Финишная полировка до ровного блеска или сатина.",
        "Защитная обработка и упаковка перед доставкой.",
      ],
    },
    install: {
      badge: "Шаг 5",
      percent: 100,
      percentNote: "Этап: установка у клиента",
      eta: "проект готов к использованию",
      title: "Монтаж под ключ",
      description: "Привозим, устанавливаем и герметизируем столешницу на вашем объекте.",
      points: [
        "Выставляем изделие в точный уровень без щелей.",
        "Монтируем мойку/технику и герметизируем примыкания.",
        "Проводим финальную проверку и сдаем готовый результат.",
      ],
    },
  };

  const orderStageKeys = Object.keys(orderFlow);
  let currentOrderStage =
    orderSteps.find((button) => button.classList.contains("is-active"))?.dataset.orderStage || orderStageKeys[0];
  let orderAutoTimer = null;
  let orderAutoStopped = false;

  function renderOrderList(items) {
    orderList.innerHTML = "";

    items.forEach((text, index) => {
      const row = document.createElement("li");
      row.className = "order-process__item";
      row.textContent = text;
      orderList.append(row);

      if (reducedMotion) {
        row.classList.add("is-visible");
        return;
      }

      setTimeout(() => {
        row.classList.add("is-visible");
      }, index * 90);
    });
  }

  function renderOrderStage(stage) {
    const data = orderFlow[stage];
    if (!data) {
      return;
    }

    currentOrderStage = stage;
    orderProcess.dataset.orderStage = stage;
    orderFieldMap.badge.textContent = data.badge;
    orderFieldMap.title.textContent = data.title;
    orderFieldMap.description.textContent = data.description;
    orderFieldMap.percent.textContent = `${data.percent}%`;
    orderFieldMap.percentNote.textContent = data.percentNote;
    orderFieldMap.eta.textContent = data.eta;
    orderPercentFill.style.width = `${data.percent}%`;
    renderOrderList(data.points);

    orderSteps.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.orderStage === stage);
    });

    const index = orderStageKeys.indexOf(stage);
    const progress = ((index + 1) / orderStageKeys.length) * 100;
    orderProgressBar.style.width = `${progress}%`;
  }

  function stopOrderAuto() {
    orderAutoStopped = true;
    if (orderAutoTimer) {
      clearInterval(orderAutoTimer);
      orderAutoTimer = null;
    }
  }

  orderSteps.forEach((button) => {
    button.addEventListener("click", () => {
      const stage = button.dataset.orderStage;
      if (!stage || stage === currentOrderStage) {
        return;
      }

      stopOrderAuto();
      renderOrderStage(stage);
    });
  });

  if (!reducedMotion) {
    orderBlock.addEventListener("pointerdown", stopOrderAuto, { once: true });

    orderAutoTimer = setInterval(() => {
      if (orderAutoStopped) {
        return;
      }

      const index = orderStageKeys.indexOf(currentOrderStage);
      const nextIndex = (index + 1) % orderStageKeys.length;
      renderOrderStage(orderStageKeys[nextIndex]);
    }, 6400);
  }

  if (orderForm && orderSubmit) {
    const initialSubmitText = orderSubmit.textContent;

    orderForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      orderSubmit.textContent = "Отправляем...";
      orderSubmit.disabled = true;

      try {
        await sendFormByEmail(orderForm, {
          subject: "Getalo: быстрый расчет стоимости",
          formName: "Форма быстрого расчета",
          source: "Блок заказа",
          extraFields: {
            request_type: "order-quick",
          },
        });

        orderSubmit.textContent = "Заявка отправлена";
        orderForm.reset();
        showToast("Спасибо! Заявка на расчет отправлена.", "success");
      } catch (error) {
        console.error("[order-form]", error);
        orderSubmit.textContent = "Ошибка отправки";
        showToast(getSubmitErrorMessage(error), "error");
      }

      setTimeout(() => {
        orderSubmit.textContent = initialSubmitText;
        orderSubmit.disabled = false;
      }, 2000);
    });
  }

  renderOrderStage(currentOrderStage);
  });

  runSafe("price-advantage", () => {
  const priceBlock = document.querySelector(".price-advantage");
  if (!priceBlock) {
    return;
  }

  const priceModeButtons = Array.from(priceBlock.querySelectorAll(".price-mode__btn[data-price-mode]"));
  const priceRows = Array.from(priceBlock.querySelectorAll(".price-bar[data-price-row]"));
  const priceSummary = priceBlock.querySelector('[data-price-field="summary"]');
  const priceSave = priceBlock.querySelector('[data-price-field="save"]');

  if (!priceModeButtons.length || !priceRows.length || !priceSummary || !priceSave) {
    return;
  }

  const priceModel = {
    others: {
      save: "до 0%",
      summary:
        "У большинства компаний в стоимость входят расходы на шоурумы, посредников и дополнительные накрутки по цепочке.",
      rows: {
        showroom: 24,
        middleman: 19,
        logistics: 14,
        production: 27,
        warranty: 16,
      },
    },
    ours: {
      save: "до 32%",
      summary:
        "Мы держим цену ниже за счет собственного производства, прямых закупок и работы без посредников и дилерских комиссий.",
      rows: {
        showroom: 0,
        middleman: 0,
        logistics: 8,
        production: 74,
        warranty: 18,
      },
    },
  };

  let currentPriceMode =
    priceModeButtons.find((button) => button.classList.contains("is-active"))?.dataset.priceMode || "others";
  let priceAutoTimer = null;
  let priceAutoStopped = false;

  function renderPriceMode(mode) {
    const model = priceModel[mode];
    if (!model) {
      return;
    }

    currentPriceMode = mode;
    priceSummary.textContent = model.summary;
    priceSave.textContent = model.save;

    priceModeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.priceMode === mode);
    });

    priceRows.forEach((row) => {
      const key = row.dataset.priceRow;
      const value = Math.max(0, Math.min(100, Number(model.rows[key] ?? 0)));
      const fill = row.querySelector(".price-bar__fill");
      const valueNode = row.querySelector(".price-bar__value");
      if (!fill || !valueNode) {
        return;
      }

      valueNode.textContent = `${value}%`;
      fill.style.width = `${value}%`;
    });
  }

  function stopPriceAuto() {
    priceAutoStopped = true;
    if (priceAutoTimer) {
      clearInterval(priceAutoTimer);
      priceAutoTimer = null;
    }
  }

  function restartPriceAuto() {
    if (priceAutoTimer) {
      clearInterval(priceAutoTimer);
      priceAutoTimer = null;
    }

    if (priceAutoStopped || reducedMotion) {
      return;
    }

    priceAutoTimer = setInterval(() => {
      const nextMode = currentPriceMode === "others" ? "ours" : "others";
      renderPriceMode(nextMode);
    }, 6200);
  }

  priceModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.priceMode;
      if (!mode || mode === currentPriceMode) {
        return;
      }

      stopPriceAuto();
      renderPriceMode(mode);
    });
  });

  if (!reducedMotion) {
    priceBlock.addEventListener("pointerdown", stopPriceAuto, { once: true });
  }

  renderPriceMode(currentPriceMode);
  if (!reducedMotion) {
    restartPriceAuto();
  }
  });

  runSafe("geo-strip", () => {
  const geoBlock = document.querySelector(".geo-strip");
  if (!geoBlock) {
    return;
  }

  const geoCities = Array.from(geoBlock.querySelectorAll(".geo-city"));
  const geoNote = geoBlock.querySelector('[data-geo-field="note"]');
  const geoSummary = geoBlock.querySelector('[data-geo-field="summary"]');

  if (!geoCities.length || !geoNote || !geoSummary) {
    return;
  }

  const geoCityInfo = {
    Москва: {
      note: "Москва: выезд замерщика возможен уже сегодня или завтра.",
      summary: "Москва: быстрый замер и монтаж по графику без задержек",
    },
    Химки: {
      note: "Химки: регулярные выезды монтажной бригады каждую неделю.",
      summary: "Химки: стабильные выезды и точные сроки установки",
    },
    Красногорск: {
      note: "Красногорск: удобная логистика по северо-западу Подмосковья.",
      summary: "Красногорск: оперативная доставка и аккуратный монтаж",
    },
    Мытищи: {
      note: "Мытищи: много заказов в новых ЖК и частных домах.",
      summary: "Мытищи: опытные монтажники под квартиры и коттеджи",
    },
    Одинцово: {
      note: "Одинцово: часто заказывают кухни с островом и сложной геометрией.",
      summary: "Одинцово: проекты повышенной сложности под ключ",
    },
    Балашиха: {
      note: "Балашиха: быстрый цикл от замера до установки.",
      summary: "Балашиха: производство и монтаж без лишних ожиданий",
    },
    Люберцы: {
      note: "Люберцы: доступная цена при полном комплексе работ.",
      summary: "Люберцы: честный расчет и прозрачная смета",
    },
    Подольск: {
      note: "Подольск: работаем по городу и прилегающим районам МО.",
      summary: "Подольск: выезды по городу и области в одном графике",
    },
    Реутов: {
      note: "Реутов: высокий спрос на компактные современные кухни.",
      summary: "Реутов: точная подгонка столешниц под небольшие кухни",
    },
    Королёв: {
      note: "Королёв: монтаж под ключ с гарантией на работы и материал.",
      summary: "Королёв: гарантия на материал и монтажные узлы",
    },
  };

  let currentGeoIndex = geoCities.findIndex((button) => button.classList.contains("is-active"));
  if (currentGeoIndex < 0) {
    currentGeoIndex = 0;
  }

  let geoAutoTimer = null;
  let geoAutoStopped = false;

  function renderGeoCity(index) {
    const nextIndex = (index + geoCities.length) % geoCities.length;
    currentGeoIndex = nextIndex;
    const cityName = geoCities[nextIndex].textContent?.trim() || "Москва";
    const info = geoCityInfo[cityName] || geoCityInfo.Москва;

    geoCities.forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === nextIndex);
    });

    geoNote.textContent = info.note;
    geoSummary.textContent = info.summary;
  }

  function stopGeoAuto() {
    geoAutoStopped = true;
    if (geoAutoTimer) {
      clearInterval(geoAutoTimer);
      geoAutoTimer = null;
    }
  }

  function restartGeoAuto() {
    if (geoAutoTimer) {
      clearInterval(geoAutoTimer);
      geoAutoTimer = null;
    }

    if (geoAutoStopped || reducedMotion || geoCities.length < 2) {
      return;
    }

    geoAutoTimer = setInterval(() => {
      renderGeoCity(currentGeoIndex + 1);
    }, 3200);
  }

  geoCities.forEach((button, index) => {
    button.addEventListener("click", () => {
      stopGeoAuto();
      renderGeoCity(index);
    });
  });

  if (!reducedMotion) {
    geoBlock.addEventListener("pointerdown", stopGeoAuto, { once: true });
  }

  renderGeoCity(currentGeoIndex);
  if (!reducedMotion) {
    restartGeoAuto();
  }
  });
})();
