//  — safer for script in <head defer>
document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

//  — LOADER reference (you must add <div id="loader" hidden>Loading…</div> in HTML)
const loader = document.getElementById("loader");

// Your original code starts here (NOT modified)
if (window.matchMedia("(max-width: 768px)").matches) {
    document.querySelector(".unit").style.left = "250px";
}

const apiKey = "4dc4e574386a136f8b3c0e5e75a8c157";
const defaultCity = "Berlin";

// Icon map
const ICON_MAP = {
    "01d": "sunny", "01n": "sunny",
    "02d": "partly-cloudy", "02n": "partly-cloudy",
    "03d": "overcast", "03n": "overcast",
    "04d": "overcast", "04n": "overcast",
    "09d": "rain", "09n": "rain",
    "10d": "rain", "10n": "rain",
    "11d": "storm", "11n": "storm",
    "13d": "snow", "13n": "snow",
    "50d": "fog", "50n": "fog",
};

// DOM references
const input = document.getElementById('search-input');
const button = document.getElementById('search-button');
const searchBar = document.getElementById('search-bar');

const cityDisplay = document.getElementById('city-display');
const dateDisplay = document.getElementById('date-display');
const mainTemp = document.getElementById('main-temp');
const sunnyIcon = document.getElementById('sunny-icon');

const feelsLikeEl = document.getElementById('temp');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const precipitationEl = document.getElementById('Precipitation');
const weatherDescriptionEl = document.getElementById('weather-description');
const errorMessageEl = document.getElementById("error-message");

let currentTimezoneOffset = 0;

// ————— ERROR HANDLING —————

function showError(message) {
    if (!errorMessageEl) return;

    errorMessageEl.textContent = message;
    errorMessageEl.classList.add("show");

    setTimeout(() => {
        errorMessageEl.classList.remove("show");
    }, 1000);
}

function clearError() {
    if (!errorMessageEl) return;
    errorMessageEl.classList.remove("show");
    errorMessageEl.textContent = "";
}

// ————— DATE HELPERS —————

function formatGMTOffset(tzSeconds) {
    const sign = tzSeconds >= 0 ? "+" : "-";
    const abs = Math.abs(tzSeconds);
    const hours = Math.floor(abs / 3600);
    const minutes = Math.floor((abs % 3600) / 60);
    if (minutes === 0) return `GMT${sign}${hours}`;
    return `GMT${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}

function getPrecipitationMm(data) {
    if (data.rain) return data.rain['1h'] ?? data.rain['3h'] ?? 0;
    if (data.snow) return data.snow['1h'] ?? data.snow['3h'] ?? 0;
    return 0;
}

function formatDateTimeForDisplay(date) {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const weekday = weekdays[date.getUTCDay()];
    const month = months[date.getUTCMonth()];
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();

    let hours = date.getUTCHours();
    let minutes = date.getUTCMinutes();

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    const minStr = minutes.toString().padStart(2, "0");

    return `${hours}:${minStr} ${ampm}, ${weekday} ${day}, ${month}, ${year}`;
}

// LIVE CLOCK
function startLiveClock() {
    setInterval(() => {
        const nowUTC = Date.now();
        const localTime = new Date(nowUTC + currentTimezoneOffset * 1000);
        const gmtOffset = formatGMTOffset(currentTimezoneOffset);
        const formattedDate = formatDateTimeForDisplay(localTime);
        dateDisplay.textContent = `${gmtOffset} | ${formattedDate}`;
    }, 1000);
}

// UPDATE UI
function updateWeatherDisplay(data) {
    try {
        clearError();

        const name = data.name || "Unknown";
        const country = data.sys?.country ? `, ${data.sys.country}` : "";
        cityDisplay.textContent = `${name}${country}`;

        currentTimezoneOffset = data.timezone ?? 0;
        mainTemp.textContent = `${Math.round(data.main?.temp ?? 0)}°`;

        feelsLikeEl.textContent = `${Math.round(data.main?.feels_like ?? 0)}°`;
        humidityEl.textContent = `${data.main?.humidity ?? 0}%`;

        const windSpeedKmh = Math.round((data.wind?.speed ?? 0) * 3.6);
        windEl.textContent = `${windSpeedKmh} km/h`;

        precipitationEl.textContent = `${getPrecipitationMm(data)} mm`;

        const weather = data.weather?.[0];
        const description = weather?.description || "";
        weatherDescriptionEl.textContent = description
            .split(" ")
            .map(s => s[0].toUpperCase() + s.slice(1))
            .join(" ");

        const iconCode = weather?.icon ?? "01d";
        const iconName = ICON_MAP[iconCode] || "sunny";
        sunnyIcon.src = `./assets/images/icon-${iconName}.webp`;
    } catch (e) {
        console.error("Error updating UI:", e);
    }
}

// ————— FETCH WEATHER —————
async function getWeather(city) {

    const trimmedCity = String(city).trim();
    if (!trimmedCity) return;

    clearError();

    // ⭐ — SHOW LOADER
    if (loader) loader.hidden = false;

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trimmedCity)}&appid=${apiKey}&units=metric`;

    try {
        const res = await fetch(url);

        if (!res.ok) {
            if (res.status === 404) {
                showError(`City "${trimmedCity}" was not found.`);
            } else {
                showError(`Error ${res.status}: Failed to load weather data.`);
            }
            return;
        }

        const data = await res.json();
        updateWeatherDisplay(data);

    } catch (error) {
        console.error("Fetch/Network Error:", error);
        showError("Network error. Please check your connection.");
    }

    // — HIDE LOADER
    if (loader) loader.hidden = true;
}

// ————— AUTO REFRESH —————
setInterval(() => {
    if (cityDisplay.textContent) {
        const city = cityDisplay.textContent.split(",")[0].trim();
        getWeather(city);
    }
}, 60000);

// ————— SEARCH EVENTS —————
function initializeApp() {
    input.value = defaultCity;
    getWeather(defaultCity);
    startLiveClock();

    button?.addEventListener('click', () => {
        getWeather(input.value);
        input.value = "";
        button.classList.add('active-glow');
        setTimeout(() => button.classList.remove('active-glow'), 1000);
    });

    input?.addEventListener('keydown', (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            getWeather(input.value);
            input.value = "";
        }
    });
}
