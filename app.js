const DOSHA_CONFIG = {
  KAPHA: { name: "Капха", color: "#8A9A5B", class: "kapha", desc: "Период заземления, тяжести и медлительности. Подходит для пробуждения, плавного вхождения в день и вечернего расслабления." },
  PITTA: { name: "Питта", color: "#E56B55", class: "pitta", desc: "Период огня и максимального метаболизма. Идеально для главного приема пищи (обеда) и активной умственной/физической работы." },
  VATA: { name: "Вата", color: "#5B84B1", class: "vata", desc: "Период движения, эфира и легкости. Подходит для творчества, духовных практик (Брахма-мухурта) и лёгкой активности." }
};

let currentCoords = null;

document.addEventListener('DOMContentLoaded', () => {
  initLocationControls();
  tryAutoLocation();
  setInterval(updateClock, 60000);
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
      document.getElementById('location-name').textContent = `Страна: ${data.country} (по IP)`;
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

  drawClockSectors(intervals);

  let currentAngle = 0;
  let activeDosha = null;

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

  intervals.forEach(item => {
    if (now >= item.start && now < item.end) {
      activeDosha = DOSHA_CONFIG[item.name];
    }
  });

  if (activeDosha) {
    const badge = document.getElementById('current-dosha-badge');
    badge.textContent = activeDosha.name;
    badge.className = `badge ${activeDosha.class}`;
    document.getElementById('current-dosha-title').textContent = `Период: ${activeDosha.name}`;
    document.getElementById('current-dosha-desc').textContent = activeDosha.desc;
  }
}

function drawClockSectors(intervals) {
  const g = document.getElementById('sectors-group');
  g.innerHTML = '';

  const cx = 200, cy = 200, r = 175;

  intervals.forEach((interval, index) => {
    const startAngle = index * 60;
    const endAngle = (index + 1) * 60;
    const config = DOSHA_CONFIG[interval.name];

    const pathData = describeArc(cx, cy, r, startAngle, endAngle);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", config.color);
    path.setAttribute("stroke-width", "25");
    path.setAttribute("opacity", interval.isDay ? "0.9" : "0.6");

    g.appendChild(path);
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
