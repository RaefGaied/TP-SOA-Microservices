const axios = require("axios");

const API_KEY = "cac28766847e26031e196d931b95445b"; 
const BASE_URL = "http://api.openweathermap.org/data/2.5/weather?appid=" + API_KEY + "&units=metric&lang=fr&q=";

async function getWeatherData(city) {
    try {
        const response = await axios.get(BASE_URL + city);
        const weatherData = response.data;

        console.log("Météo à", city);
        console.log("Description :", weatherData.weather[0].description);
        console.log("Température :", weatherData.main.temp + "°C");
        console.log("Humidité :", weatherData.main.humidity + "%");
    } catch (error) {
        console.error("Erreur :", error.response ? error.response.data.message : error.message);
    }
}


getWeatherData("Sousse");
