
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
const errorMessageEl = document.getElementById("error-message"); // Added reference

// GLOBAL timezone offset for current city
let currentTimezoneOffset = 0;

// Utility helpers

function showError(message) {
    // Use the stored DOM reference
    if (!errorMessageEl) return;

    errorMessageEl.textContent = message;
    errorMessageEl.classList.add("show");

    // Auto-hide after 1 seconds
    setTimeout(() => {
        errorMessageEl.classList.remove("show");
    }, 1000);
}

function clearError() {
    // Function to explicitly clear the error message
    if (!errorMessageEl) return;
    errorMessageEl.classList.remove("show");
    errorMessageEl.textContent = "";
}


function formatGMTOffset(tzSeconds) {
    const sign = tzSeconds >= 0 ? "+" : "-";
    const abs = Math.abs(tzSeconds);
    const hours = Math.floor(abs / 3600);
    const minutes = Math.floor((abs % 3600) / 60);
    if (minutes === 0) return `GMT${sign}${hours}`;
    return `GMT${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}

//Get precipitation safely 
function getPrecipitationMm(data) {
    if (data.rain) return data.rain['1h'] ?? data.rain['3h'] ?? 0;
    if (data.snow) return data.snow['1h'] ?? data.snow['3h'] ?? 0;
    return 0;
}

//Format Date into readable string 
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

//    LIVE CLOCK — Updates every second according to timezone
function startLiveClock() {
    setInterval(() => {
        const nowUTC = Date.now();
        const localTime = new Date(nowUTC + currentTimezoneOffset * 1000);

        const gmtOffset = formatGMTOffset(currentTimezoneOffset);
        const formattedDate = formatDateTimeForDisplay(localTime);

        dateDisplay.textContent = `${gmtOffset} | ${formattedDate}`;
    }, 1000);
}

//    Update UI with weather data
function updateWeatherDisplay(data) {
    try {
        // Clear error on successful update
        clearError();

        const name = data.name || "Unknown";
        const country = data.sys?.country ? `, ${data.sys.country}` : "";
        cityDisplay.textContent = `${name}${country}`;

        // Save timezone offset globally
        currentTimezoneOffset = data.timezone ?? 0;

        // Temperature
        mainTemp.textContent = `${Math.round(data.main?.temp ?? 0)}°`;

        // Metrics
        feelsLikeEl.textContent = `${Math.round(data.main?.feels_like ?? 0)}°`;
        humidityEl.textContent = `${data.main?.humidity ?? 0}%`;
        // Convert m/s to km/h and round
        const windSpeedKmh = Math.round((data.wind?.speed ?? 0) * 3.6);
        windEl.textContent = `${windSpeedKmh} km/h`;

        precipitationEl.textContent = `${getPrecipitationMm(data)} mm`;

        // Weather description
        const weather = data.weather?.[0];
        const description = weather?.description || "";
        weatherDescriptionEl.textContent = description
            .split(" ")
            .map(s => s[0].toUpperCase() + s.slice(1))
            .join(" ");

        // Icon
        const iconCode = weather?.icon ?? "01d";
        const iconName = ICON_MAP[iconCode] || "sunny";
        sunnyIcon.src = `./assets/images/icon-${iconName}.webp`;
    } catch (e) {
        console.error("Error updating UI:", e);
    }
}

//    Fetch Weather
async function getWeather(city) {
    const trimmedCity = String(city).trim();
    if (!trimmedCity) {
        // Only show error for missing input if explicitly triggered by user action
        if (event && event.type === 'click' || event.type === 'keydown') {
            showError("Enter a city name.");
        }
        return;
    }

    // Clear any previous error before attempting a new fetch
    clearError();

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trimmedCity)}&appid=${apiKey}&units=metric`;

    try {
        const res = await fetch(url);

        // Handle HTTP errors (like 404 Not Found)
        if (!res.ok) {
            // Check for 404 specifically for 'City not found'
            if (res.status === 404) {
                showError(`City "${trimmedCity}" was not found.`);
            } else {
                // Generic error for other HTTP status codes (401, 500, etc.)
                showError(`Error ${res.status}: Failed to load weather data.`);
            }
            // Do NOT proceed to parse JSON or update UI on error
            return;
        }

        // Parse JSON data
        const data = await res.json();

        // Update the UI with the valid weather data
        updateWeatherDisplay(data);


    } catch (error) {
        console.error("Fetch/Network Error:", error);
        // Show network error to the user
        showError("Network error. Please check your connection.");
    }
}


// Auto-refresh Weather Every 60 Seconds
setInterval(() => {
    // Only refresh if a city is currently displayed
    if (cityDisplay.textContent) {
        const city = cityDisplay.textContent.split(",")[0].trim(); // Get just the city name
        getWeather(city); // Re-fetch weather for the current city
    }
}, 60000);

// UI Interactions

button?.addEventListener('click', () => {
    // Pass the input value to getWeather
    getWeather(input.value);

    // ⬇ clear input after search
    input.value = "";

    button.classList.add('active-glow');
    setTimeout(() => button.classList.remove('active-glow'), 1000);
});

input?.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        // Pass the input value to getWeather
        getWeather(input.value);

        // ⬇ clear input after search
        input.value = "";
    }
});

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    input.value = defaultCity;
    getWeather(defaultCity);
    startLiveClock(); // START LIVE TIME
});