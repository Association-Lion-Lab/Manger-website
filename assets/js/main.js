(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  /* ---------- Nav : fond au scroll, masquée en descendant ---------- */
  const nav = $('#nav');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 20);
    nav.classList.toggle('is-hidden', y > 400 && y > lastY + 4);
    if (y < lastY - 4 || y < 400) nav.classList.remove('is-hidden');
    lastY = y;
  }, { passive: true });

  // Lien actif selon la section visible
  const navLinks = $$('.nav__links a');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(link => { const target = $(link.hash); if (target) sectionObserver.observe(target); });

  /* ---------- Apparitions au scroll ---------- */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(element => revealObserver.observe(element));

  /* ---------- Mot qui tourne dans le hero ---------- */
  const word = $('.rotator__word');
  const words = ['recettes', 'sorties', 'dates', 'invités', 'courses'];
  let wordIndex = 0;
  if (word && !reduceMotion) {
    setInterval(() => {
      word.classList.add('is-out');
      setTimeout(() => {
        wordIndex = (wordIndex + 1) % words.length;
        word.textContent = words[wordIndex];
        word.classList.remove('is-out');
        word.classList.add('is-pre');
        void word.offsetWidth;
        word.classList.remove('is-pre');
      }, 450);
    }, 2200);
  }

  /* ---------- Compteurs ---------- */
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      const target = Number(element.dataset.countTo);
      const start = performance.now();
      const duration = reduceMotion ? 0 : 1600;
      const tick = now => {
        const progress = duration ? Math.min((now - start) / duration, 1) : 1;
        element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) requestAnimationFrame(tick);
      };
      setTimeout(() => requestAnimationFrame(tick), reduceMotion ? 0 : 1400);
      countObserver.unobserve(element);
    });
  });
  $$('[data-count-to]').forEach(element => countObserver.observe(element));

  /* ---------- Téléphone : légère inclinaison au pointeur ---------- */
  const phone = $('[data-tilt]');
  const visual = $('.hero__visual');
  if (phone && visual && !reduceMotion && matchMedia('(hover: hover) and (min-width: 961px)').matches) {
    const base = { x: 6, y: -14, z: 2 };
    $('.hero').addEventListener('pointermove', event => {
      const rect = visual.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / innerWidth;
      const dy = (event.clientY - (rect.top + rect.height / 2)) / innerHeight;
      phone.style.transform = `rotateY(${base.y + dx * 16}deg) rotateX(${base.x - dy * 12}deg) rotate(${base.z}deg)`;
    });
    $('.hero').addEventListener('pointerleave', () => { phone.style.transform = ''; });
  }

  /* ---------- Scrollytelling des fonctions ---------- */
  const steps = $$('.step');
  const panels = $$('.stage__panel');
  const setStep = index => {
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    panels.forEach((panel, i) => panel.classList.toggle('is-active', i === index));
  };
  setStep(0);
  const stepObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) setStep(Number(entry.target.dataset.step)); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(step => stepObserver.observe(step));

  /* ---------- Démo : liste de courses ---------- */
  const recipes = [
    { id: 'bowl', emoji: '🥗', title: 'Bowl pois chiches', meta: '20 min · rapide', items: [['Pois chiches', 400, 'g'], ['Tomates', 2, ''], ['Citrons', 1, '']] },
    { id: 'curry', emoji: '🍛', title: 'Curry coco', meta: '35 min · favori', items: [['Lait de coco', 20, 'cl'], ['Curry', 2, 'c. à café'], ['Riz', 160, 'g']] },
    { id: 'gnocchis', emoji: '🥘', title: 'Gnocchis aux légumes', meta: '25 min · facile', items: [['Gnocchis', 500, 'g'], ['Courgettes', 2, ''], ['Oignon rouge', 1, '']] },
    { id: 'taboule', emoji: '🌿', title: 'Taboulé pois chiches', meta: '15 min · frais', items: [['Pois chiches', 200, 'g'], ['Tomates', 3, ''], ['Citrons', 1, ''], ['Semoule', 150, 'g']] }
  ];
  const planned = new Set(['bowl', 'curry']);
  const checked = new Set();
  let previous = new Map();
  const recipesRoot = $('.recipes');
  const listRoot = $('#shopping-list');
  const emptyHint = $('#list-empty');
  const countElement = $('#list-count');

  recipes.forEach(recipe => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recipe';
    button.setAttribute('aria-pressed', planned.has(recipe.id));
    button.innerHTML = `<span class="recipe__emoji" aria-hidden="true">${recipe.emoji}</span><span><b>${recipe.title}</b><small>${recipe.meta}</small></span><span class="recipe__check" aria-hidden="true"></span>`;
    button.addEventListener('click', () => {
      planned.has(recipe.id) ? planned.delete(recipe.id) : planned.add(recipe.id);
      button.setAttribute('aria-pressed', planned.has(recipe.id));
      renderList();
    });
    recipesRoot.append(button);
  });

  const formatQty = (amount, unit) => unit ? `${amount} ${unit}` : `×${amount}`;

  function aggregate() {
    const totals = new Map();
    recipes.filter(recipe => planned.has(recipe.id)).forEach(recipe => {
      recipe.items.forEach(([name, amount, unit]) => {
        const entry = totals.get(name) ?? { amount: 0, unit, from: [] };
        entry.amount += amount;
        entry.from.push(recipe.title);
        totals.set(name, entry);
      });
    });
    return totals;
  }

  function renderList() {
    const totals = aggregate();
    listRoot.replaceChildren();
    [...totals].sort(([a], [b]) => a.localeCompare(b, 'fr')).forEach(([name, entry]) => {
      const item = document.createElement('li');
      const bumped = previous.has(name) && previous.get(name) !== entry.amount;
      item.classList.toggle('is-checked', checked.has(name));
      item.innerHTML = `<span>${name}${entry.from.length > 1 ? `<span class="from">${entry.from.length} recettes</span>` : ''}</span><span class="lead"></span><span class="qty${bumped ? ' is-bump' : ''}">${formatQty(entry.amount, entry.unit)}</span>`;
      if (previous.has(name)) item.style.animation = 'none';
      item.addEventListener('click', () => {
        checked.has(name) ? checked.delete(name) : checked.add(name);
        item.classList.toggle('is-checked');
      });
      listRoot.append(item);
    });
    previous = new Map([...totals].map(([name, entry]) => [name, entry.amount]));
    countElement.textContent = totals.size;
    emptyHint.hidden = totals.size > 0;
  }
  renderList();

  const flash = (button, label) => {
    const original = button.textContent;
    button.textContent = label;
    setTimeout(() => { button.textContent = original; }, 1600);
  };
  const copy = async (text, button) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(button, 'Copié ✓');
    } catch {
      flash(button, 'Copie impossible');
    }
  };

  $('#copy-list').addEventListener('click', event => {
    const lines = [...aggregate()].map(([name, entry]) => `- ${name} : ${formatQty(entry.amount, entry.unit)}`);
    copy(lines.length ? `Courses Manger!\n${lines.join('\n')}` : 'Liste vide', event.currentTarget);
  });

  /* ---------- Démo : foyer mixte ---------- */
  const diets = [
    { id: 'vegan', label: 'Végane', allowed: ['plant'] },
    { id: 'vegetarian', label: 'Végétarien·ne', allowed: ['plant', 'egg'] },
    { id: 'pescetarian', label: 'Pescétarien·ne', allowed: ['plant', 'egg', 'fish'] },
    { id: 'omnivore', label: 'Omnivore', allowed: ['plant', 'egg', 'fish', 'meat'] }
  ];
  const proteins = [
    { name: 'Tofu fumé', category: 'plant' }, { name: 'Tempeh', category: 'plant' }, { name: 'Tofu', category: 'plant' },
    { name: 'Œuf mollet', category: 'egg' },
    { name: 'Saumon', category: 'fish' }, { name: 'Thon', category: 'fish' },
    { name: 'Poulet', category: 'meat' }, { name: 'Bœuf', category: 'meat' }
  ];
  const preferred = { vegan: 'plant', vegetarian: 'egg', pescetarian: 'fish', omnivore: 'meat' };
  const diners = [
    { name: 'Camille', color: '#e9a93a', diet: 0 },
    { name: 'Sam', color: '#ff8a6b', diet: 1 },
    { name: 'Noé', color: '#6fd0a7', diet: 2 },
    { name: 'Alex', color: '#c99bea', diet: 3 }
  ];
  const compatible = diner => proteins.filter(protein => diets[diner.diet].allowed.includes(protein.category));
  const pickDefault = diner => compatible(diner).find(protein => protein.category === preferred[diets[diner.diet].id]);
  diners.forEach(diner => { diner.protein = pickDefault(diner); });

  const dinersRoot = $('#diners');
  diners.forEach(diner => {
    const card = document.createElement('div');
    card.className = 'diner';
    card.innerHTML = `
      <div class="diner__top">
        <span class="diner__avatar" style="background:${diner.color}">${diner.name[0]}</span>
        <span class="diner__name">${diner.name}</span>
        <button type="button" class="pill pill--diet"></button>
      </div>
      <div class="diner__protein">
        <span>Protéine compatible</span>
        <button type="button" class="pill pill--protein"></button>
      </div>`;
    const dietButton = $('.pill--diet', card);
    const proteinButton = $('.pill--protein', card);
    const render = () => {
      dietButton.textContent = diets[diner.diet].label;
      dietButton.setAttribute('aria-label', `Régime de ${diner.name} : ${diets[diner.diet].label}. Changer`);
      proteinButton.textContent = diner.protein.name;
      proteinButton.setAttribute('aria-label', `Protéine de ${diner.name} : ${diner.protein.name}. Essayer une autre`);
      proteinButton.classList.remove('is-swap');
      void proteinButton.offsetWidth;
      proteinButton.classList.add('is-swap');
    };
    dietButton.addEventListener('click', () => {
      diner.diet = (diner.diet + 1) % diets.length;
      diner.protein = pickDefault(diner);
      render();
    });
    proteinButton.addEventListener('click', () => {
      const options = compatible(diner);
      diner.protein = options[(options.indexOf(diner.protein) + 1) % options.length];
      render();
    });
    render();
    dinersRoot.append(card);
  });

  /* ---------- Terminal : saisie animée ---------- */
  const term = $('#term');
  const commands = 'git clone https://codeberg.org/LION_LAB/manger.git\ncd manger\ndocker compose up -d --build';
  $('#copy-cmd').addEventListener('click', event => copy(commands, event.currentTarget));

  if (term && !reduceMotion) {
    const finalHTML = term.innerHTML;
    const lines = finalHTML.split('\n');
    term.innerHTML = '';
    let started = false;
    const typeObserver = new IntersectionObserver(async entries => {
      if (!entries[0].isIntersecting || started) return;
      started = true;
      typeObserver.disconnect();
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      let html = '';
      for (const line of lines) {
        const match = line.match(/^(<span class="p">\$<\/span> )(.*)$/);
        if (match) {
          html += match[1];
          for (const char of match[2]) {
            html += char;
            term.innerHTML = `${html}<span class="caret"></span>`;
            await wait(22 + Math.random() * 30);
          }
          await wait(260);
        } else {
          if (line.includes('class="ok"')) await wait(900);
          html += line;
          term.innerHTML = `${html}<span class="caret"></span>`;
          await wait(120);
        }
        html += '\n';
      }
      term.innerHTML = `${finalHTML}\n<span class="caret"></span>`;
    }, { threshold: .5 });
    typeObserver.observe(term);
  }
})();
