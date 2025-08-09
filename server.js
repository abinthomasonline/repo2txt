const express = require('express');
const open = require('open');
const app = express();
const path = require('path');

// Servir les fichiers statiques du répertoire courant
app.use(express.static('./'));

// Route par défaut qui renvoie index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    open(`http://localhost:${PORT}`);
});