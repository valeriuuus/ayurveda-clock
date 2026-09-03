// --- Словари локализации ---
const TRANSLATIONS = {
  ru: {
    appTitle: "Аюрведические Часы",
    locDetecting: "Определение локации...",
    lblSelectDate: "📅 Выберите дату:",
    btnAutoLoc: "📍 Автовыбор (GPS)",
    phCountry: "🔍 Введите или выберите страну...",
    phCity: "🔍 Введите или выберите город...",
    lblNow: "СЕЙЧАС",
    tblAstroTitle: "Астрономические данные",
    lblSunrise: "🌅 Восход:",
    lblNoon: "☀️ Солнечный полдень:",
    lblSunset: "🌇 Закат:",
    lblMidnight: "🌌 Полночь:",
    lblDayLength: "⏳ Долгота дня:",
    lblBrahma: "🧘‍♂️ Брахма-мухурта:",
    tblScheduleTitle: "Расписание Дош на день",
    thPhase: "Фаза",
    thDosha: "Доша",
    thTime: "Время",
    thDuration: "Длит.",
    untilTransition: "ДО ПЕРЕХОДА В",
    unitH: "ч",
    unitM: "мин",
    doshas: {
      KAPHA: "Капха",
      PITTA: "Питта",
      VATA: "Вата"
    },
    phases: {
      predawn: "предрассветные часы",
      earlyMorning: "раннее утро",
      midday: "середина дня",
      afternoon: "вторая половина дня",
      evening: "вечер",
      deepNight: "глубокая ночь"
    }
  },
  uk: {
    appTitle: "Аюрведичний Годинник",
    locDetecting: "Визначення локації...",
    lblSelectDate: "📅 Оберіть дату:",
    btnAutoLoc: "📍 Автовибір (GPS)",
    phCountry: "🔍 Введіть або оберіть країну...",
    phCity: "🔍 Введіть або оберіть місто...",
    lblNow: "ЗАРАЗ",
    tblAstroTitle: "Астрономічні дані",
    lblSunrise: "🌅 Схід сонця:",
    lblNoon: "☀️ Сонячний полудень:",
    lblSunset: "🌇 Захід сонця:",
    lblMidnight: "🌌 Північ:",
    lblDayLength: "⏳ Тривалість дня:",
    lblBrahma: "🧘‍♂️ Брахма-мухурта:",
    tblScheduleTitle: "Розклад Дош на день",
    thPhase: "Фаза",
    thDosha: "Доша",
    thTime: "Час",
    thDuration: "Трив.",
    untilTransition: "ДО ПЕРЕХОДУ В",
    unitH: "г",
    unitM: "хв",
    doshas: {
      KAPHA: "Капха",
      PITTA: "Пітта",
      VATA: "Вата"
    },
    phases: {
      predawn: "передсвітанкові години",
      earlyMorning: "ранок",
      midday: "середина дня",
      afternoon: "друга половина дня",
      evening: "вечір",
      deepNight: "глибока ніч"
    }
  },
  en: {
    appTitle: "Ayurvedic Clock",
    locDetecting: "Detecting location...",
    lblSelectDate: "📅 Select date:",
    btnAutoLoc: "📍 Auto Location (GPS)",
    phCountry: "🔍 Enter or select country...",
    phCity: "🔍 Enter or select city...",
    lblNow: "NOW",
    tblAstroTitle: "Astronomical Data",
    lblSunrise: "🌅 Sunrise:",
    lblNoon: "☀️ Solar Noon:",
    lblSunset: "🌇 Sunset:",
    lblMidnight: "🌌 Midnight:",
    lblDayLength: "⏳ Day Length:",
    lblBrahma: "🧘‍♂️ Brahma Muhurta:",
    tblScheduleTitle: "Daily Dosha Schedule",
    thPhase: "Phase",
    thDosha: "Dosha",
    thTime: "Time",
    thDuration: "Dur.",
    untilTransition: "UNTIL TRANSITION TO",
    unitH: "h",
    unitM: "m",
    doshas: {
      KAPHA: "Kapha",
      PITTA: "Pitta",
      VATA: "Vata"
    },
    phases: {
      predawn: "pre-dawn hours",
      earlyMorning: "early morning",
      midday: "midday",
      afternoon: "afternoon",
      evening: "evening",
      deepNight: "deep night"
    }
  }
};

// Определение языка интерфейса
function detectLanguage() {
  const lang = (navigator.language || navigator.userLanguage || 'ru').toLowerCase();
  if (lang.startsWith('uk')) return 'uk';
  if (lang.startsWith('ru')) return 'ru';
  return 'en';
}

const currentLang = detectLanguage();
const t = TRANSLATIONS[currentLang];

const DOSHA_CONFIG = {
  KAPHA: { color: "#16a085", class: "kapha" },
  PITTA: { color: "#d35400", class: "pitta" },
  VATA: { color: "#5c6bc0", class: "vata" }
};

let currentCoords = null;
let selectedDate = new Date();
let currentCityName = "ВИННИЦА";

document.addEventListener('DOMContentLoaded', () => {
  applyStaticTranslations();
  initDatePicker();
  initLocationControls();
  tryAutoLocation();
  setInterval(updateClock, 1000);
  registerServiceWorker();
});

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (t[key]) el.setAttribute('placeholder', t[key]);
  });
}

function initDatePicker() {
  const dateInput = document.getElementById('input-date');
  dateInput.value = selectedDate.toISOString().split('T')[0];

  dateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      const [year, month, day] = e.target.value.split('-').map(Number);
      const now = new Date();
      selectedDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
      updateClock();
    }
  });
}

function tryAutoLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => setLocation(pos.coords.latitude, pos.coords.longitude, "VINNYTSIA"),
      () => fetchIPLocation()
    );
  } else {
    fetchIPLocation();
  }
}

function fetchIPLocation() {
  fetch('https://api.country.is')
    .then(res => res.json())
    .then(() => setLocation(49.23, 28.46, "VINNYTSIA"))
    .catch(() => setLocation(49.23, 28.46, "VINNYTSIA"));
}

function setLocation(lat, lng, label) {
  currentCoords = { lat, lng };
  currentCityName = label.split(',')[0].toUpperCase();
  document.getElementById('location-name').textContent = label;
  document.getElementById('clock-center-city').textContent = currentCityName;
  updateClock();
}

function initLocationControls() {
  const countryInput = document.getElementById('input-country');
  const cityInput = document.getElementById('input-city');
  const countriesDatalist = document.getElementById('datalist-countries');
  const citiesDatalist = document.getElementById('datalist-cities');

  document.getElementById('btn-auto-location').addEventListener('click', tryAutoLocation);

  fetch('https://countriesnow.space/api/v0.1/countries')
    .then(res => res.json())
    .then(data => {
      countriesDatalist.innerHTML = '';
      data.data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.country;
        countriesDatalist.appendChild(opt);
      });
    });

  countryInput.addEventListener('input', (e) => {
    const country = e.target.value.trim();
    cityInput.value = '';
    cityInput.disabled = true;
    citiesDatalist.innerHTML = '';
    if (!country) return;

    fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    })
    .then(res => res.json())
    .then(data => {
      if (data.data && data.data.length > 0) {
        data.data.forEach(city => {
          const opt = document.createElement('option');
          opt.value = city;
          citiesDatalist.appendChild(opt);
        });
        cityInput.disabled = false;
      }
    });
  });

  cityInput.addEventListener('change', (e) => {
    const city = e.target.value.trim();
    const country = countryInput.value.trim();
    if (!city) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ',' + country)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setLocation(parseFloat(data[0].lat), parseFloat(data[0].lon), city);
        }
      });
  });
}

function updateClock() {
  if (!currentCoords) return;

  const now = new Date();
  const calcDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
  const startOfDay = new Date(calcDate.getFullYear(), calcDate.getMonth(), calcDate.getDate(), 0, 0, 0);
  
  const times = SunCalc.getTimes(calcDate, currentCoords.lat, currentCoords.lng);
  
  let sunrise = times.sunrise;
  let sunset = times.sunset;
  let solarNoon = times.solarNoon;
  let nadir = times.nadir;

  let dayDuration = sunset - sunrise;
  let nightDuration = (24 * 3600 * 1000) - dayDuration;

  const brahmaStart = new Date(sunrise.getTime() - (96 * 60 * 1000));
  const brahmaEnd = new Date(sunrise.getTime() - (48 * 60 * 1000));

  document.getElementById('clock-center-time').textContent = formatTime(calcDate);

  document.getElementById('time-sunrise').textContent = formatTime(sunrise);
  document.getElementById('time-noon').textContent = formatTime(solarNoon);
  document.getElementById('time-sunset').textContent = formatTime(sunset);
  document.getElementById('time-midnight').textContent = formatTime(nadir);
  
  const dayHrs = Math.floor(dayDuration / (3600 * 1000));
  const dayMins = Math.round((dayDuration % (3600 * 1000)) / (60 * 1000));
  document.getElementById('time-daylength').textContent = `${dayHrs} ${t.unitH} ${dayMins} ${t.unitM}`;
  document.getElementById('time-brahma').textContent = `${formatTime(brahmaStart)} - ${formatTime(brahmaEnd)}`;

  const dayThird = dayDuration / 3;
  const nightThird = nightDuration / 3;

  const intervals = [
    { phase: t.phases.predawn, name: 'VATA', start: new Date(sunrise.getTime() - nightThird), end: sunrise, isDay: false },
    { phase: t.phases.earlyMorning, name: 'KAPHA', start: sunrise, end: new Date(sunrise.getTime() + dayThird), isDay: true },
    { phase: t.phases.midday, name: 'PITTA', start: new Date(sunrise.getTime() + dayThird), end: new Date(sunrise.getTime() + 2 * dayThird), isDay: true },
    { phase: t.phases.afternoon, name: 'VATA', start: new Date(sunrise.getTime() + 2 * dayThird), end: sunset, isDay: true },
    { phase: t.phases.evening, name: 'KAPHA', start: sunset, end: new Date(sunset.getTime() + nightThird), isDay: false },
    { phase: t.phases.deepNight, name: 'PITTA', start: new Date(sunset.getTime() + nightThird), end: new Date(sunset.getTime() + 2 * nightThird), isDay: false }
  ];

  drawClockSectors(intervals, startOfDay, sunrise, sunset);

  // Отрисовка полосы указателя времени
  const msFromStartOfDay = calcDate - startOfDay;
  const currentAngle = (msFromStartOfDay / (24 * 3600 * 1000)) * 360;
  
  const cx = 200, cy = 200;
  const rInner = 129;
  const rOuter = 161;

  const ptInner = polarToCartesian(cx, cy, rInner, currentAngle);
  const ptOuter = polarToCartesian(cx, cy, rOuter, currentAngle);

  const markerLine = document.getElementById('time-marker-line');
  markerLine.setAttribute('x1', ptInner.x);
  markerLine.setAttribute('y1', ptInner.y);
  markerLine.setAttribute('x2', ptOuter.x);
  markerLine.setAttribute('y2', ptOuter.y);

  const markerDot = document.getElementById('time-marker-dot');
  markerDot.setAttribute('cx', ptInner.x);
  markerDot.setAttribute('cy', ptInner.y);

  let activeIndex = -1;
  for (let i = 0; i < intervals.length; i++) {
    if (calcDate >= intervals[i].start && calcDate < intervals[i].end) {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex !== -1) {
    const activeInterval = intervals[activeIndex];
    const nextInterval = intervals[(activeIndex + 1) % intervals.length];
    
    const activeConfig = DOSHA_CONFIG[activeInterval.name];
    const activeDoshaName = t.doshas[activeInterval.name];
    const nextDoshaName = t.doshas[nextInterval.name];

    const totalMs = activeInterval.end - activeInterval.start;
    const passedMs = calcDate - activeInterval.start;
    const remainMs = activeInterval.end - calcDate;

    const totalHrs = Math.floor(totalMs / (3600 * 1000));
    const totalMins = Math.round((totalMs % (3600 * 1000)) / (60 * 1000));

    const titleEl = document.getElementById('current-dosha-title');
    titleEl.textContent = activeDoshaName;
    titleEl.style.color = activeConfig.color;

    document.getElementById('current-dosha-meta').textContent = 
      `${activeInterval.phase} · ${formatTime(activeInterval.start)} — ${formatTime(activeInterval.end)} · ${totalHrs} ${t.unitH} ${totalMins} ${t.unitM}`;

    const progressPercent = Math.min(100, Math.max(0, (passedMs / totalMs) * 100));
    const progressBar = document.getElementById('dosha-progress-bar');
    progressBar.style.width = `${progressPercent}%`;
    progressBar.style.background = activeConfig.color;

    document.getElementById('next-dosha-label').textContent = `${t.untilTransition} ${nextDoshaName.toUpperCase()}`;
    document.getElementById('countdown-timer').textContent = formatCountdown(remainMs);
  }

  const tableBody = document.getElementById('dosha-schedule-body');
  tableBody.innerHTML = '';
  intervals.forEach((item, idx) => {
    const isActive = (idx === activeIndex);
    const durMs = item.end - item.start;
    const hrs = Math.floor(durMs / (3600 * 1000));
    const mins = Math.round((durMs % (3600 * 1000)) / (60 * 1000));

    const tr = document.createElement('tr');
    if (isActive) tr.className = 'row-active';

    tr.innerHTML = `
      <td>${item.phase} ${isActive ? '👈' : ''}</td>
      <td><span class="tag-dosha ${DOSHA_CONFIG[item.name].class}">${t.doshas[item.name]}</span></td>
      <td>${formatTime(item.start)} - ${formatTime(item.end)}</td>
      <td>${hrs}${t.unitH} ${mins}${t.unitM}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function drawClockSectors(intervals, startOfDay, sunrise, sunset) {
  const sectorsGroup = document.getElementById('sectors-group');
  const ticksGroup = document.getElementById('ticks-group');
  
  sectorsGroup.innerHTML = '';
  ticksGroup.innerHTML = '';

  const cx = 200, cy = 200, rArc = 145;

  intervals.forEach(interval => {
    const startMs = interval.start - startOfDay;
    const endMs = interval.end - startOfDay;

    const startAngle = (startMs / (24 * 3600 * 1000)) * 360;
    const endAngle = (endMs / (24 * 3600 * 1000)) * 360;
    const config = DOSHA_CONFIG[interval.name];

    const pathData = describeArc(cx, cy, rArc, startAngle, endAngle);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", config.color);
    path.setAttribute("stroke-width", "32");
    sectorsGroup.appendChild(path);

    const tickPos1 = polarToCartesian(cx, cy, 163, startAngle);
    const tickPos2 = polarToCartesian(cx, cy, 169, startAngle);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", tickPos1.x);
    line.setAttribute("y1", tickPos1.y);
    line.setAttribute("x2", tickPos2.x);
    line.setAttribute("y2", tickPos2.y);
    line.setAttribute("stroke", "#ffffff");
    line.setAttribute("stroke-width", "2.5");
    ticksGroup.appendChild(line);
  });

  const sunriseAngle = ((sunrise - startOfDay) / (24 * 3600 * 1000)) * 360;
  const sunsetAngle = ((sunset - startOfDay) / (24 * 3600 * 1000)) * 360;
  const dayArcData = describeArc(cx, cy, 118, sunriseAngle, sunsetAngle);
  document.getElementById('inner-day-arc').setAttribute('d', dayArcData);
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = (endAngle - startAngle) <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

function formatTime(date) {
  if (!date || isNaN(date)) return "--:--";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCountdown(ms) {
  if (ms <= 0) return "0:00:00";
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Автоматическая регистрация и сброс старого Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        };
      };
    }).catch(err => console.log('SW reg error:', err));
  }
}
