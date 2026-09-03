const DOSHA_CONFIG = {
  KAPHA: { name: "Kapha", ruName: "Капха", color: "#8A9A5B", class: "kapha", desc: "Период заземления, структуры и медлительности. Подходит для пробуждения, плавного вхождения в день и вечернего расслабления." },
  PITTA: { name: "Pitta", ruName: "Питта", color: "#E56B55", class: "pitta", desc: "Период огня и метаболизма. Идеально для основного приема пищи (обеда) и активной умственной/физической работы." },
  VATA: { name: "Vata", ruName: "Вата", color: "#5B84B1", class: "vata", desc: "Период движения и легкости. Подходит для творчества, духовных практик (Брахма-мухурта) и легких дел." }
};

let currentCoords = null;
let selectedDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
  initDatePicker();
  initLocationControls();
  tryAutoLocation();
  setInterval(updateClock, 30000);
  registerServiceWorker();
});

// Инициализация поля даты
function initDatePicker() {
  const dateInput = document.getElementById('input-date');
  
  // Устанавливаем сегодня по умолчанию (YYYY-MM-DD)
  const todayStr = selectedDate.toISOString().split('T')[0];
  dateInput.value = todayStr;

  dateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      // Сохраняем выбранную дату с сохранением текущего времени
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
      pos => setLocation(pos.coords.latitude, pos.coords.longitude, "Ваше местоположение"),
      () => fetchIPLocation()
    );
  } else {
    fetchIPLocation();
  }
}

function fetchIPLocation() {
  fetch('https://api.country.is')
    .then(res => res.json())
    .then(data => {
      setLocation(50.45, 30.52, `Локация по IP (${data.country})`);
    })
    .catch(() => setLocation(50.45, 30.52, "Киев (по умолчанию)"));
}

function setLocation(lat, lng, label) {
  currentCoords = { lat, lng };
  document.getElementById('location-name').textContent = label;
  localStorage.setItem('dosha_coords', JSON.stringify({ lat, lng, label }));
  updateClock();
}

// Загрузка списков с поддержкой поиска (через datalist)
function initLocationControls() {
  const countryInput = document.getElementById('input-country');
  const cityInput = document.getElementById('input-city');
  const countriesDatalist = document.getElementById('datalist-countries');
  const citiesDatalist = document.getElementById('datalist-cities');
  const autoBtn = document.getElementById('btn-auto-location');

  autoBtn.addEventListener('click', tryAutoLocation);

  // Загрузка списка стран
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

  // При выборе страны — подгружаем список городов
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
        citiesDatalist.innerHTML = '';
        data.data.forEach(city => {
          const opt = document.createElement('option');
          opt.value = city;
          citiesDatalist.appendChild(opt);
        });
        cityInput.disabled = false;
      }
    });
  });

  // При выборе города — геокодинг координат
  cityInput.addEventListener('change', (e) => {
    const city = e.target.value.trim();
    const country = countryInput.value.trim();
    if (!city) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ',' + country)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setLocation(parseFloat(data[0].lat), parseFloat(data[0].lon), `${city}, ${country}`);
        }
      });
  });
}

function updateClock() {
  if (!currentCoords) return;

  // Используем выбранную пользователем дату
  const calcDate = new Date(selectedDate);
  const times = SunCalc.getTimes(calcDate, currentCoords.lat, currentCoords.lng);
  
  let sunrise = times.sunrise;
  let sunset = times.sunset;
  let solarNoon = times.solarNoon;

  let dayDuration = sunset - sunrise;
  let nightDuration = (24 * 3600 * 1000) - dayDuration;

  if (calcDate < sunrise) {
    const yesterday = new Date(calcDate.getTime() - 24 * 3600 * 1000);
    const prevTimes = SunCalc.getTimes(yesterday, currentCoords.lat, currentCoords.lng);
    sunset = prevTimes.sunset;
    solarNoon = prevTimes.solarNoon;
    dayDuration = prevTimes.sunset - prevTimes.sunrise;
    nightDuration = sunrise - sunset;
  }

  // Брахма-мухурта
  const brahmaStart = new Date(sunrise.getTime() - (96 * 60 * 1000));
  const brahmaEnd = new Date(sunrise.getTime() - (48 * 60 * 1000));

  document.getElementById('time-sunrise').textContent = formatTime(sunrise);
  document.getElementById('time-noon').textContent = formatTime(solarNoon);
  document.getElementById('time-sunset').textContent = formatTime(sunset);
  
  const dayHrs = Math.floor(dayDuration / (3600 * 1000));
  const dayMins = Math.round((dayDuration % (3600 * 1000)) / (60 * 1000));
  document.getElementById('time-daylength').textContent = `${dayHrs} ч ${dayMins} мин`;
  document.getElementById('time-brahma').textContent = `${formatTime(brahmaStart)} - ${formatTime(brahmaEnd)}`;

  // Расчет 6 интервалов
  const dayThird = dayDuration / 3;
  const nightThird = nightDuration / 3;

  const intervals = [
    { phase: "Раннее утро", name: 'KAPHA', start: sunrise, end: new Date(sunrise.getTime() + dayThird), isDay: true },
    { phase: "Середина дня", name: 'PITTA', start: new Date(sunrise.getTime() + dayThird), end: new Date(sunrise.getTime() + 2 * dayThird), isDay: true },
    { phase: "Вторая половина дня", name: 'VATA', start: new Date(sunrise.getTime() + 2 * dayThird), end: sunset, isDay: true },
    { phase: "Вечер", name: 'KAPHA', start: sunset, end: new Date(sunset.getTime() + nightThird), isDay: false },
    { phase: "Глубокая ночь", name: 'PITTA', start: new Date(sunset.getTime() + nightThird), end: new Date(sunset.getTime() + 2 * nightThird), isDay: false },
    { phase: "Предрассветные часы", name: 'VATA', start: new Date(sunset.getTime() + 2 * nightThird), end: new Date(sunset.getTime() + 3 * nightThird), isDay: false }
  ];

  document.getElementById('label-top').textContent = `${formatTime(sunrise)}`;
  document.getElementById('label-right').textContent = `${formatTime(solarNoon)}`;
  document.getElementById('label-bottom').textContent = `${formatTime(sunset)}`;
  document.getElementById('label-left').textContent = `Полночь`;

  drawClockSectorsAndLabels(intervals);

  // Угол стрелки
  let currentAngle = 0;
  if (calcDate >= sunrise && calcDate < sunset) {
    const progress = (calcDate - sunrise) / dayDuration;
    currentAngle = progress * 180;
  } else {
    let nightProgress;
    if (calcDate >= sunset) {
      nightProgress = (calcDate - sunset) / nightDuration;
    } else {
      nightProgress = (calcDate - sunset + (24 * 3600 * 1000)) / nightDuration;
    }
    currentAngle = 180 + (nightProgress * 180);
  }

  document.getElementById('hand-group').setAttribute('transform', `rotate(${currentAngle}, 200, 200)`);

  // Отрисовка Таблицы 2
  let activeDosha = null;
  const tableBody = document.getElementById('dosha-schedule-body');
  tableBody.innerHTML = '';

  intervals.forEach(item => {
    const isActive = (calcDate >= item.start && calcDate < item.end);
    if (isActive) activeDosha = DOSHA_CONFIG[item.name];

    const durMs = item.end - item.start;
    const hrs = Math.floor(durMs / (3600 * 1000));
    const mins = Math.round((durMs % (3600 * 1000)) / (60 * 1000));

    const tr = document.createElement('tr');
    if (isActive) tr.className = 'row-active';

    tr.innerHTML = `
      <td>${item.phase} ${isActive ? '👈' : ''}</td>
      <td><span class="tag-dosha ${DOSHA_CONFIG[item.name].class}">${DOSHA_CONFIG[item.name].name}</span></td>
      <td>${formatTime(item.start)} - ${formatTime(item.end)}</td>
      <td>${hrs}ч ${mins}м</td>
    `;
    tableBody.appendChild(tr);
  });

  if (activeDosha) {
    const badge = document.getElementById('current-dosha-badge');
    badge.textContent = activeDosha.name;
    badge.className = `badge ${activeDosha.class}`;
    document.getElementById('current-dosha-title').textContent = `Период: ${activeDosha.name} (${activeDosha.ruName})`;
    document.getElementById('current-dosha-desc').textContent = activeDosha.desc;
  }
}

function drawClockSectorsAndLabels(intervals) {
  const sectorsGroup = document.getElementById('sectors-group');
  const labelsGroup = document.getElementById('dosha-labels-group');
  sectorsGroup.innerHTML = '';
  labelsGroup.innerHTML = '';

  const cx = 200, cy = 200, rArc = 155, rText = 155;

  intervals.forEach((interval, index) => {
    const startAngle = index * 60;
    const endAngle = (index + 1) * 60;
    const midAngle = startAngle + 30;
    const config = DOSHA_CONFIG[interval.name];

    const pathData = describeArc(cx, cy, rArc, startAngle, endAngle);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", config.color);
    path.setAttribute("stroke-width", "36");
    path.setAttribute("opacity", interval.isDay ? "0.9" : "0.55");
    sectorsGroup.appendChild(path);

    const pos = polarToCartesian(cx, cy, rText, midAngle);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", pos.x);
    text.setAttribute("y", pos.y + 4);
    text.setAttribute("class", "dosha-text");
    text.setAttribute("fill", "#ffffff");
    text.setAttribute("text-anchor", "middle");
    text.textContent = config.name;
    labelsGroup.appendChild(text);
  });
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
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

function formatTime(date) {
  if (!date || isNaN(date)) return "--:--";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg error:', err));
  }
}
