const DOSHA_CONFIG = {
  KAPHA: { name: "Kapha", ruName: "Капха", color: "#8A9A5B", class: "kapha", desc: "Период заземления, структуры и медлительности. Подходит для пробуждения, плавного вхождения в день и вечернего расслабления." },
  PITTA: { name: "Pitta", ruName: "Питта", color: "#E56B55", class: "pitta", desc: "Период огня и метаболизма. Идеально для основного приема пищи (обеда) и активной умственной/физической работы." },
  VATA: { name: "Vata", ruName: "Вата", color: "#5B84B1", class: "vata", desc: "Период движения и легкости. Подходит для творчества, духовных практик (Брахма-мухурта) и легких дел." }
};

let currentCoords = null;

document.addEventListener('DOMContentLoaded', () => {
  initLocationControls();
  tryAutoLocation();
  setInterval(updateClock, 30000); // Обновление каждые 30 секунд
  registerServiceWorker();
});

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
  const countrySelect = document.getElementById('select-country');
  const citySelect = document.getElementById('select-city');
  const autoBtn = document.getElementById('btn-auto-location');

  autoBtn.addEventListener('click', tryAutoLocation);

  fetch('https://countriesnow.space/api/v0.1/countries')
    .then(res => res.json())
    .then(data => {
      data.data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.country;
        opt.textContent = c.country;
        countrySelect.appendChild(opt);
      });
    });

  countrySelect.addEventListener('change', (e) => {
    const country = e.target.value;
    citySelect.innerHTML = '<option value="">Выбрать город...</option>';
    citySelect.disabled = !country;
    if (!country) return;

    fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    })
    .then(res => res.json())
    .then(data => {
      data.data.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        citySelect.appendChild(opt);
      });
    });
  });

  citySelect.addEventListener('change', (e) => {
    const city = e.target.value;
    const country = countrySelect.value;
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

  const now = new Date();
  const times = SunCalc.getTimes(now, currentCoords.lat, currentCoords.lng);
  
  let sunrise = times.sunrise;
  let sunset = times.sunset;

  document.getElementById('time-sunrise').textContent = formatTime(sunrise);
  document.getElementById('time-sunset').textContent = formatTime(sunset);

  let dayDuration = sunset - sunrise;
  let nightDuration = (24 * 3600 * 1000) - dayDuration;

  if (now < sunrise) {
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const prevTimes = SunCalc.getTimes(yesterday, currentCoords.lat, currentCoords.lng);
    sunset = prevTimes.sunset;
    dayDuration = prevTimes.sunset - prevTimes.sunrise;
    nightDuration = sunrise - sunset;
  }

  const dayThird = dayDuration / 3;
  const nightThird = nightDuration / 3;

  const intervals = [
    { name: 'KAPHA', start: sunrise, end: new Date(sunrise.getTime() + dayThird), isDay: true },
    { name: 'PITTA', start: new Date(sunrise.getTime() + dayThird), end: new Date(sunrise.getTime() + 2 * dayThird), isDay: true },
    { name: 'VATA', start: new Date(sunrise.getTime() + 2 * dayThird), end: sunset, isDay: true },
    { name: 'KAPHA', start: sunset, end: new Date(sunset.getTime() + nightThird), isDay: false },
    { name: 'PITTA', start: new Date(sunset.getTime() + nightThird), end: new Date(sunset.getTime() + 2 * nightThird), isDay: false },
    { name: 'VATA', start: new Date(sunset.getTime() + 2 * nightThird), end: new Date(sunset.getTime() + 3 * nightThird), isDay: false }
  ];

  drawClockSectorsAndLabels(intervals);

  // Расчет поворота стрелки относительно текущего времени
  let currentAngle = 0;
  if (now >= sunrise && now < sunset) {
    const progress = (now - sunrise) / dayDuration;
    currentAngle = progress * 180;
  } else {
    let nightProgress;
    if (now >= sunset) {
      nightProgress = (now - sunset) / nightDuration;
    } else {
      nightProgress = (now - sunset + (24 * 3600 * 1000)) / nightDuration;
    }
    currentAngle = 180 + (nightProgress * 180);
  }

  document.getElementById('hand-group').setAttribute('transform', `rotate(${currentAngle}, 200, 200)`);

  // Определение активной Доши
  let activeDosha = null;
  intervals.forEach(item => {
    if (now >= item.start && now < item.end) {
      activeDosha = DOSHA_CONFIG[item.name];
    }
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

    // Рисуем дугу сектора
    const pathData = describeArc(cx, cy, rArc, startAngle, endAngle);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", config.color);
    path.setAttribute("stroke-width", "36");
    path.setAttribute("opacity", interval.isDay ? "0.9" : "0.55");
    sectorsGroup.appendChild(path);

    // Добавляем текстовую метку (Vata, Kapha, Pitta)
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
