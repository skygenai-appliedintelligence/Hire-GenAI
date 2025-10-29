const http = require('http');

const fs = require('fs');

const path = require('path');

 

const server = http.createServer((req, res) => {

    // Serve the HTML file

    if (req.url === '/' || req.url === '/index.html' || req.url.includes('Azure')) {

        fs.readFile(path.join(__dirname, 'Azure WEbRTC API (1).html'), (err, content) => {

            if (err) {

                res.writeHead(500);

                res.end('Error loading the file');

                return;

            }

            res.writeHead(200, { 'Content-Type': 'text/html' });

            res.end(content);

        });

        return;

    }

 

    // Handle 404

    res.writeHead(404);

    res.end('Not found');

});

 

const PORT = 8000;

server.listen(PORT, () => {

    console.log(`Server running at http://localhost:${PORT}`);

    console.log('Press Ctrl+C to stop');

});