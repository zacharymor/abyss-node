const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const articlesFilePath = path.join(__dirname, 'data', 'articles.json');
const usersFilePath = path.join(__dirname, 'data', 'users.json');
const uploadsDir = path.join(__dirname, 'data', 'uploads');
const port = 3000;
const app = express();
app.use(cors())
app.use(bodyParser.json()); // Middleware to parse JSON bodies
app.use('/uploads', express.static(uploadsDir)); // Serve static files

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// Function to read articles data from JSON file
function readArticlesData() {
    return JSON.parse(fs.readFileSync(articlesFilePath, 'utf8'));
}

// Function to write articles data to JSON file
function writeArticlesData(data) {
    fs.writeFileSync(articlesFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// Function to read users data from JSON file
function readUsersData() {
    return JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
}

// Function to write users data to JSON file
function writeUsersData(data) {
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// User registration endpoint
app.post('/register', (req, res) => {
    const { username, password, isAdmin } = req.body;
    const users = readUsersData();

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = { username, password: hashedPassword, isAdmin: isAdmin || false };
    users.push(newUser);
    writeUsersData(users);

    res.status(201).json({ message: 'User registered successfully' });
});


// User authentication endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsersData();
    const user = users.find(u => u.username === username);
    if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign({ username: user.username, isAdmin: user.isAdmin }, 'your_secret_key');
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});


const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, 'your_secret_key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};


// Upload image
app.post('/upload', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.status(201).json({ imageUrl: `./assets/uploads/${req.file.filename}` });
});

// Protected route example
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Protected route accessed successfully' });
});



app.get('/articles', (req, res) => {
    console.log('Requesting articles data');
    const articles = readArticlesData();
    res.json(articles);
});

app.get('/articles/:id', (req, res) => {
    console.log('Get a specific article');
    const articles = readArticlesData();
    const article = articles.find(a => a.id == req.params.id);
    if (article) {
        res.json(article);
    } else {
        res.status(404).send('Article not found');
    }
});

// Create a new article
app.post('/articles', (req, res) => {
    const { title, content } = req.body;
    const articles = readArticlesData();
    const newArticleID = articles.length ? articles[articles.length - 1].id + 1 : 1; // Generate a new article ID
    const newArticle = { id: newArticleID, title, content };
    articles.push(newArticle);
    writeArticlesData(articles); // Write updated data to file
    res.status(201).json(newArticle);
});

// Update an existing article
app.put('/articles/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { title, content } = req.body;
    const articles = readArticlesData();
    const articleIndex = articles.findIndex(a => a.id === id);
    if (articleIndex !== -1) {
        const updatedArticle = { ...articles[articleIndex], title, content };
        articles[articleIndex] = updatedArticle;
        writeArticlesData(articles); // Write updated data to file
        res.json(updatedArticle);
    } else {
        res.status(404).send('Article not found');
    }
});

// Delete an article
app.delete('/articles/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const articles = readArticlesData();
    const articleIndex = articles.findIndex(a => a.id === id);
    if (articleIndex !== -1) {
        const deletedArticle = articles.splice(articleIndex, 1);
        writeArticlesData(articles); // Write updated data to file
        res.json(deletedArticle[0]);
    } else {
        res.status(404).send('Article not found');
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});


