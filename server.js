const express = require('express');
const path = require('path');

const app = express();

// serve the home folder so the browser can load Home.html, images, etc.
app.use(express.static(path.join(__dirname, 'home')));

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
