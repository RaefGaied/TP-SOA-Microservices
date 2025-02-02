import axios from "axios";

async function RecupererDonnees(url, apiName) {
    try {
        const response = await axios.get(url);
        console.log(`✅ [${apiName}] Données récupérées avec succès !`);
        return response.data;
    } catch (error) {
        console.error(`❌ [${apiName}] Échec de la récupération des données :`, error.message);
        return null;
    }
}

async function ObtenirLivres() {
    const auteurs = ["Victor Hugo", "Jules Verne", "Agatha Christie", "William Shakespeare", "Leo Tolstoy", 
        "Jane Austen", "Mark Twain", "George Orwell", "Charles Dickens", "Fyodor Dostoevsky"];
  
    const ecrivain = auteurs[Math.floor(Math.random() * auteurs.length)];

    const url = `https://openlibrary.org/search.json?author=${encodeURIComponent(ecrivain)}`;
    const data = await RecupererDonnees(url, "OpenLibrary");

    if (data && data.docs.length > 0) {
        console.log(`\n📖 Quelques œuvres de ${ecrivain} trouvées :`);
        data.docs.slice(0, 3).forEach((book, index) => {
            const titreLivre = book.title ? book.title : "Titre inconnu";
            console.log(`📘 Livre ${index + 1} : ${titreLivre}`);
        });
    } else {
        console.log(`❌ Aucun livre trouvé pour l'écrivain : ${ecrivain}`);
    }
}




async function AfficherMasaImage() {
    const API_KEY = "C1t2WNE3d9DQ6SZlReaBY1B1JC1iQ1ytsdDozyKH"; // Remplace par ta propre clé API
    const url = `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`;
    const data = await RecupererDonnees(url, "NASA");
    if (data) {
        console.log("\n🚀 Exploration de l'espace avec la NASA !");
        console.log(`🛰️ Image du jour : ${data.title}`);
        console.log(`🔗 Lien : ${data.url}`);
    }
}


async function GenererProfilAleatoire() {
    const url = "https://randomuser.me/api/";
    const data = await RecupererDonnees(url, "RandomUser");
    if (data) {
        const user = data.results[0];
        console.log("\n👥 Création d'un profil utilisateur aléatoire :");
        console.log(`🆔 Nom complet : ${user.name.title} ${user.name.first} ${user.name.last}`);
        console.log(`🌍 Localisation : ${user.location.city}, ${user.location.country}`);
        console.log(`📩 Contact : ${user.email}`);
    }
}


ObtenirLivres();
AfficherMasaImage();
GenererProfilAleatoire();
