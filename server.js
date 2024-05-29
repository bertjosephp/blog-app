require('dotenv').config();
const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const crypto = require('crypto');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;
const accessToken = process.env.EMOJI_API_KEY;

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
//
app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'Chirpr';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Chirp';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
app.get('/', async (req, res) => {
    const user = await getCurrentUser(req) || {};
    const userId = req.session.userId;
    try {
        const posts = await getPosts();
        let likedPosts = [];
        if (userId) {
            const db = await getDBConnection();
            try {
                const rows = await db.all('SELECT post_id FROM user_likes WHERE user_id = ?', userId);
                likedPosts = rows.map(row => row.post_id);
            } finally {
                await db.close();
            }
        }

        const postsWithDetails = posts.map(post => {
            const posterAvatarUrl = post.avatar_url;
            const isLikedByUser = likedPosts.includes(post.id);
            const isOwnedByUser = post.username === (user ? user.username : null);
            return {...post, posterAvatarUrl, isLikedByUser, isOwnedByUser};
        })

        if (req.session.loggedIn) {
            // include api key if user is logged in
            res.render('home', { posts: postsWithDetails, user: user, accessToken: accessToken });
        } else {
            res.render('home', { posts: postsWithDetails, user: user });
        }
    } catch (error) {
        console.error('Failed to load home page:', error);
        res.render('error', { error: 'Failed to load home page.' });
    }
    
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement


app.post('/posts', async (req, res) => {
    // Add a new post and redirect to home
    await submitPost(req, res);
});
app.post('/like/:id', async (req, res) => {
    // Update post likes
    await updatePostLikes(req, res);
});
app.get('/profile', isAuthenticated, async (req, res) => {
    // Render profile page
    await renderProfile(req, res);
});
app.get('/avatar/:username', (req, res) => {
    // Serve the avatar image for the user
    handleAvatar(req, res);
});
app.post('/register', async (req, res) => {
    // Register a new user
    await registerUser(req, res);
});
app.post('/login', (req, res) => {
    // Login a user
    loginUser(req, res);
});
app.get('/logout', (req, res) => {
    // Logout the user
    logoutUser(req, res);
});
app.post('/delete/:id', isAuthenticated, (req, res) => {
    // Delete a post if the current user is the owner
    deletePost(req, res);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Function to establish connection with database
async function getDBConnection() {
    const db = await sqlite.open({
        filename: 'blog.db',
        driver: sqlite3.Database
    });

    return db;
}

// Function to start server
async function startServer() {
    try {
        const db = await getDBConnection();
        console.log('Connected to database.');

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to database:', error);
        res.render('error', { error: 'Failed to connect to database.' });
    }
}

startServer();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Function to find a user by username
async function findUserByUsername(username) {
    // Return user object if found, otherwise return undefined
    // return users.find(user => user.username === username);
    const db = await getDBConnection();
    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', username);
        return user;
    } finally {
        await db.close();
    }
}

// Function to find a user by user ID
async function findUserById(userId) {
    // // Return user object if found, otherwise return undefined
    // return users.find(user => user.id === userId);
    const db = await getDBConnection();
    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
        return user;
    } finally {
        await db.close();
    }
}

// Function to add a new user
async function addUser(username) {
    // Create a new user object and add to users array
    const hashedGoogleId = generateRandomId();
    const avatarUrl = undefined;    // set default avatar
    const memberSince = getDate();
    const db = await getDBConnection();
    try {
        await db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [username, hashedGoogleId, avatarUrl, memberSince]
        );
    } finally {
        await db.close();
    }
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log(req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
async function registerUser(req, res) {
    // Register a new user and redirect appropriately
    const username = req.body.username;
    const db = await getDBConnection();
    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', username);
        if (user) {
            // Username already exists
            res.redirect('register?error=Username+already+exists');
        } else {
            // Add the new user
            await addUser(username);
            res.redirect('/login');
        }
    } finally {
        await db.close();
    }
}

// Function to login a user
async function loginUser(req, res) {
    // Login a user and redirect appropriately
    const username = req.body.username;
    const user = await findUserByUsername(username);
    if (user) {
        // successful login
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        // invalid username
        res.redirect('login?error=Invalid+username');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    // Destroy session and redirect appropriately
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.redirect('/error');
        } else {
            res.redirect('/');
        }
    });
}

// Function to render the profile page
async function renderProfile(req, res) {
    // Fetch user posts and render the profile page
    const user = await getCurrentUser(req);
    const userId = req.session.userId;
    const db = await getDBConnection();
    let postsWithDetails = [];
    try {
        const posts = await db.all('SELECT * FROM posts WHERE username = ? ORDER BY timestamp DESC', user.username);
        const rows = await db.all('SELECT post_id FROM user_likes WHERE user_id = ?', userId);
        const likedPosts = rows.map(row => row.post_id);

        postsWithDetails = posts.map(post => {
            const posterAvatarUrl = post.avatar_url;
            const isLikedByUser = likedPosts.includes(post.id);
            const isOwnedByUser = post.username === (user ? user.username : null);
            return {...post, posterAvatarUrl, isLikedByUser, isOwnedByUser};
        })
    } finally {
        await db.close();
    }
    res.render('profile', { posts: postsWithDetails, user: user });
}

// Function to update post likes
async function updatePostLikes(req, res) {
    // Increment post likes if conditions are met
    const userId = req.session.userId;
    const postId = req.params.id;
    const db = await getDBConnection();
    try {
        const post = await db.get('SELECT * FROM posts where id = ?', postId);
        if (!post) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }

        let newLikes = post.likes;
        const userLikesPost = await db.get('SELECT * FROM user_likes WHERE user_id = ? AND post_id = ?', userId, postId);
        let isLiked = true;
        if (userLikesPost) {
            // unlike post
            newLikes -= 1;
            isLiked = false;
            await db.run('DELETE FROM user_likes WHERE user_id = ? AND post_id = ?', userId, postId);
        } else {
            // like post
            newLikes += 1;
            await db.run('INSERT INTO user_likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
        }

        await db.run('UPDATE posts SET likes = ? WHERE id = ?', newLikes, postId);
        res.json({ success: true, likes: newLikes, isLiked: isLiked });
    } catch (error) {
        console.error('Error updating post likes:', error);
        res.status(500).json({ success: false, message: 'Error updating post likes.' });
    } finally {
        await db.close();
    }
}

// Function to handle avatar generation and serving
async function handleAvatar(req, res) {
    // Generate and serve the user's avatar image
    const username = req.params.username;
    const user = await findUserByUsername(username);
    const avatarPath = path.join(__dirname, 'public', 'avatar', `${username}.png`);

    try {
        // if avatar image file exists, then serve it
        await fs.access(avatarPath, fs.constants.F_OK);
        res.sendFile(avatarPath);
    } catch (error) {
        // if avatar image file does not exist, generate a new avatar, save it, and serve it
        await saveAvatar(generateAvatar(username.charAt(0)), username);
        res.sendFile(avatarPath);
    }
}

// Function to get the current user from session
async function getCurrentUser(req) {
    // Return the user object if the session user ID matches
    const user = await findUserById(req.session.userId);
    return user;
}

// Function to get all posts, sorted by latest first
async function getPosts() {
    const db = await getDBConnection();
    try {
        rows = await db.all('SELECT * FROM posts ORDER BY timestamp DESC')
        return rows;
    } finally {
        await db.close();
    }
}

// Function to add a new post
async function addPost(title, content, user) {
    // Create a new post object and add to posts array
    const timestamp = getDate();
    const db = await getDBConnection();
    try {
        await db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [title, content, user.username, timestamp, 0]
        );
    } catch (error) {
        console.error('Failed to add post:', error);
    } finally {
        await db.close();
    }
}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    // Generate an avatar image with a letter

    // 1. Choose a color scheme based on the letter [https://coolors.co/palette/f94144-f3722c-f8961e-f9844a-f9c74f-90be6d-43aa8b-4d908e-577590-277da1]
    const colors = ['#f94144', '#F3722C', '#F8961E', '#F9844A', '#F9C74F', '#90BE6D', '#43AA8B', '#4D908E', '#577590', '#277DA1'];
    const idx = letter.toUpperCase().charCodeAt(0) % colors.length;
    const backgroundColor = colors[idx];

    // 2. Create a canvas with the specified width and height
    const avatarCanvas = canvas.createCanvas(width, height);
    const context = avatarCanvas.getContext('2d');

    // 3. Draw the background color
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    // 4. Draw the letter in the center
    context.fillStyle = '#ffffff';
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter.toUpperCase(), width / 2, height / 2);
    
    // 5. Return the avatar as a PNG buffer
    return avatarCanvas.toBuffer('image/png');
}

// Function to generate a random id
function generateRandomId() {
    return crypto.randomUUID();
}

// Function to get current date as string
function getDate() {
    let currentDate = new Date(Date.now());
    return currentDate.toISOString().replace('T', ' ').substring(0, 16);
}

// Function to find a post by post id
async function findPostById(postId) {
    const db = await getDBConnection();
    try {
        const post = await db.get('SELECT * FROM posts WHERE id = ?', postId);
        return post;
    } finally {
        await db.close();
    }
}

// Function to save avatar buffer as PNG file
async function saveAvatar(buffer, username) {
    const avatarPath = path.join(__dirname, 'public', 'avatar', `${username}.png`);
    await fs.writeFile(avatarPath, buffer);
    return `/avatar/${username}.png`;
}

// Function to add a new post and redirect to home
async function submitPost(req, res) {
    const user = await getCurrentUser(req);
    const post = await addPost(req.body.title, req.body.content, user);
    res.redirect('/');
}

// Function to delete a post
async function deletePost(req, res) {
    const postId = req.params.id;
    const db = await getDBConnection();
    try {
        await db.run('DELETE FROM posts WHERE id = ?', postId);
        res.json({ success: true });
    } catch (error) {
        res.status(404).json({ success: false, message: 'Post not found' });
    } finally {
        await db.close();
    }
}