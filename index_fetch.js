
(async () => {
    const { default: fetch } = await import("node-fetch");
  
    const API_KEY = "cac28766847e26031e196d931b95445b";
    const BASE_URL = "http://api.openweathermap.org/data/2.5/weather?appid=" + API_KEY + "&units=metric&lang=fr&q=";
  
    async function getWeatherData(city) {
        try {
            const response = await fetch(BASE_URL + city);
            const weatherData = await response.json();
  
            if (weatherData.cod !== 200) {
                throw new Error(weatherData.message);
            }
  
            console.log("Météo à", city);
            console.log("Description :", weatherData.weather[0].description);
            console.log("Température :", weatherData.main.temp + "°C");
            console.log("Humidité :", weatherData.main.humidity + "%");
        } catch (error) {
            console.error("Erreur :", error.message);
        }
    }
  
    getWeatherData("Sousse");
  })();
  
