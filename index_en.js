const request = require("request");

const API_KEY = "cac28766847e26031e196d931b95445b";  
const BASE_URL = "http://api.openweathermap.org/data/2.5/weather?appid=" + API_KEY + "&units=metric&lang=en&q=";

function getWeatherData(city, callback) {
    const url = BASE_URL + city;
    
    request(url, function (error, response, body) {
        if (error) {
            callback(error, null);
        } else {
            const weatherData = JSON.parse(body);

            if (weatherData.cod !== 200) {
                callback(weatherData.message, null);
                return;
            }

            const result = {
                description: weatherData.weather[0].description,
                temperature: weatherData.main.temp + "°C",
                humidity: weatherData.main.humidity + "%"
            };

            callback(null, result);
        }
    });
}


getWeatherData("Sousse", function (error, data) {
    if (error) {
        console.error("Error :", error);
    } else {
        console.log("Weather in Sousse:");
        console.log("Description:", data.description);
        console.log("Temperature:", data.temperature);
        console.log("Humidity:", data.humidity);
        
    }
});
