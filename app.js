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

function initDatePicker() {
  const dateInput = document.getElementById('input-date');
  const todayStr = selectedDate.toISOString().split('T')[0];
  dateInput.value = todayStr;

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

function initLocationControls() {
  const countryInput = document.getElementById('input-country');
  const cityInput = document.getElementById('input-city');
  const countriesDatalist = document.getElementById('datalist-countries');
  const citiesDatalist = document.getElementById('datalist-cities');
  const autoBtn = document.getElementById('btn-auto-location');

  autoBtn.addEventListener('click', tryAutoLocation);

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

  const calcDate = new Date(selectedDate);
  const startOfDay = new Date(calcDate.getFullYear(), calcDate.getMonth(), calcDate.getDate(), 0, 0, 0);
  const times = SunCalc.getTimes(calcDate, currentCoords.lat, currentCoords.lng);
  
  let sunrise = times.sunrise;
  let sunset = times.sunset;
  let solarNoon = times.solarNoon;
  let nadir = times.nadir; // Астрономическая полночь

  let dayDuration = sunset - sunrise;
  let nightDuration = (24 * 3600 * 1000) - dayDuration;

  const brahmaStart = new Date(sunrise.getTime() - (96 * 60 * 1000));
  const brahmaEnd = new Date(sunrise.getTime() - (48 * 60 * 1000));

  // Таблица 1
  document.getElementById('time-sunrise').textContent = formatTime(sunrise);
  document.getElementById('time-noon').textContent = formatTime(solarNoon);
  document.getElementById('time-sunset').textContent = formatTime(sunset);
  document.getElementById('time-midnight').textContent = formatTime(nadir);
  
  const dayHrs = Math.floor(dayDuration / (3600 * 1000));
  const dayMins = Math.round((dayDuration % (3600 * 1000)) / (60 * 1000));
  document.getElementById('time-daylength').textContent = `${dayHrs} ч ${dayMins} мин`;
  document.getElementById('time-brahma').textContent = `${formatTime(brahmaStart)} - ${formatTime(brahmaEnd)}`;

  // Расчет 6 динамических интервалов
  const dayThird = dayDuration / 3;
  const nightThird = nightDuration / 3;

  const intervals = [
    { phase: "Предрассветные часы", name: 'VATA', start: new Date(sunrise.getTime() - nightThird), end: sunrise, isDay: false },
    { phase: "Раннее утро", name: 'KAPHA', start: sunrise, end: new Date(sunrise.getTime() + dayThird), isDay: true },
    { phase: "Середина дня", name: 'PITTA', start: new Date(sunrise.getTime() + dayThird), end: new Date(sunrise.getTime() + 2 * dayThird), isDay: true },
    { phase: "Вторая половина дня", name: 'VATA', start: new Date(sunrise.getTime() + 2 * dayThird), end: sunset, isDay: true },
    { phase: "Вечер", name: 'KAPHA', start: sunset, end: new Date(sunset.getTime() + nightThird), isDay: false },
    { phase: "Глубокая ночь", name: 'PITTA', start: new Date(sunset.getTime() + nightThird), end: new Date(sunset.getTime() + 2 * nightThird), isDay: false }
  ];

  // Отрисовка секторов и названий по дуге
  drawClockSectorsAndLabels(intervals, startOfDay);

  // Поворот стрелки строго относительно 24 часов
  const msFromStartOfDay = calcDate - startOfDay;
  const currentAngle = (msFromStartOfDay / (24 * 3600 * 1000)) * 360;
  document.getElementById('hand-group').setAttribute('transform', `rotate(${currentAngle}, 200, 200)`);

  // Определение активной фазы и подсветка меток времени
  let activeInterval = null;
  const tableBody = document.getElementById('dosha-schedule-body');
  tableBody.innerHTML = '';

  intervals.forEach(item => {
    const isActive = (calcDate >= item.start && calcDate < item.end);
    if (isActive) activeInterval = item;

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

  if (activeInterval) {
    const activeDosha = DOSHA_CONFIG[activeInterval.name];
    const badge = document.getElementById('current-dosha-badge');
    badge.textContent = activeDosha.name;
    badge.className = `badge ${activeDosha.class}`;
    document.getElementById('current-dosha-title').textContent = `Период: ${activeDosha.name} (${activeDosha.ruName})`;
    document.getElementById('current-dosha-desc').textContent = activeDosha.desc;

    // Подсветка меток времени 24, 3, 6, 12, 15, 18, попадающих в текущую дошу
    highlightActiveTimeLabels(activeInterval, startOfDay);
  }
}

function highlightActiveTimeLabels(activeInterval, startOfDay) {
  const timeHoursMap = {
    'time-lbl-24': 0,
    'time-lbl-3': 3,
    'time-lbl-6': 6,
    'time-lbl-12': 12,
    'time-lbl-15': 15,
    'time-lbl-18': 18
  };

  Object.entries(timeHoursMap).forEach(([id, hour]) => {
    const labelDate = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate(), hour, 0, 0);
    const el = document.getElementById(id);
    if (labelDate >= activeInterval.start && labelDate < activeInterval.end) {
      el.classList.add('active-time');
    } else {
      el.classList.remove('active-time');
    }
  });
}

function drawClockSectorsAndLabels(intervals, startOfDay) {
  const sectorsGroup = document.getElementById('sectors-group');
  const labelsGroup = document.getElementById('dosha-labels-group');
  const defsGroup = document.getElementById('text-paths-defs');

  sectorsGroup.innerHTML = '';
  labelsGroup.innerHTML = '';
  defsGroup.innerHTML = '';

  const cx = 200, cy = 200, rArc = 140, rText = 140;

  intervals.forEach((interval, index) => {
    const startMs = interval.start - startOfDay;
    const endMs = interval.end - startOfDay;

    const startAngle = (startMs / (24 * 3600 * 1000)) * 360;
    const endAngle = (endMs / (24 * 3600 * 1000)) * 360;
    const midAngle = startAngle + (endAngle - startAngle) / 2;

    const config = DOSHA_CONFIG[interval.name];

    // Отрисовка пропорциональной дуги сектора
    const pathData = describeArc(cx, cy, rArc, startAngle, endAngle);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", config.color);
    path.setAttribute("stroke-width", "50");
    path.setAttribute("opacity", interval.isDay ? "0.9" : "0.65");
    sectorsGroup.appendChild(path);

    // Создание пути вдоль окружности для изогнутого текста VATA / PITTA / KAPHA
    const textPathId = `dosha-path-${index}`;
    const textArcData = describeArc(cx, cy, rText, midAngle - 25, midAngle + 25);
    
    const textPathDef = document.createElementNS("http://www.w3.org/2000/svg", "path");
    textPathDef.setAttribute("id", textPathId);
    textPathDef.setAttribute("d", textArcData);
    defsGroup.appendChild(textPathDef);

    const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textNode.setAttribute("class", "dosha-text-path");

    const textPathNode = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
    textPathNode.setAttributeNS("http://www.w3.org/1999/xlink", "href", `#${textPathId}`);
    textPathNode.setAttribute("startOffset", "50%");
    textPathNode.setAttribute("text-anchor", "middle");
    textPathNode.textContent = config.name;

    textNode.appendChild(textPathNode);
    labelsGroup.appendChild(textNode);
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
  const largeArcFlag = (endAngle - startAngle) <= 180 ? "0" : "1";
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
