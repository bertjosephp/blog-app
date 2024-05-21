const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs').promises;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

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
    res.locals.appName = 'MicroBlog';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
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
app.get('/', (req, res) => {
    const user = getCurrentUser(req) || {};
    const userId = req.session.userId;
    const posts = getPosts().map(post => {
        // get poster's avatar url
        const posterAvatarUrl = findUserByUsername(post.username).avatar_url;
        // check if post is liked by user
        let isLikedByUser = false;
        if (userLikes[userId]) {
            isLikedByUser = userLikes[userId].has(post.id);
        }
        // check if post is owned by user
        const isOwnedByUser = post.username === user.username;

        return {...post, posterAvatarUrl, isLikedByUser, isOwnedByUser};
    });
    res.render('home', { posts, user });
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


app.post('/posts', (req, res) => {
    // Add a new post and redirect to home
    submitPost(req, res);
});
app.post('/like/:id', (req, res) => {
    // Update post likes
    updatePostLikes(req, res);
});
app.get('/profile', isAuthenticated, (req, res) => {
    // Render profile page
    renderProfile(req, res);
});
app.get('/avatar/:username', (req, res) => {
    // Serve the avatar image for the user
    handleAvatar(req, res);
});
app.post('/register', (req, res) => {
    // Register a new user
    registerUser(req, res);
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
    // TODO: Delete a post if the current user is the owner
    deletePost(req, res);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Sample data for testing the MicroBlog application

// Users object array
let users = [
    {
        id: 1,
        username: 'TravelGuru',
        avatar_url: undefined,
        memberSince: '2024-05-01 10:00'
    },
    {
        id: 2,
        username: 'FoodieFanatic',
        avatar_url: undefined,
        memberSince: '2024-05-01 11:30'
    },
    {
        id: 3,
        username: 'TechSage',
        avatar_url: undefined,
        memberSince: '2024-05-01 12:15'
    },
    {
        id: 4,
        username: 'EcoWarrior',
        avatar_url: undefined,
        memberSince: '2024-05-01 13:45'
    },
    {
        id: 5,
        username: 'CrunchyCat',
        avatar_url: 'https://creatorset.com/cdn/shop/files/Screenshot_2023-12-01_063405_1130x.png?v=1701405384',
        memberSince: '2024-05-01 14:45'
    }
];

// Posts object array
let posts = [
    {
        id: 1,
        title: 'Exploring Hidden Gems in Europe',
        content: 'Just got back from an incredible trip through Europe. Visited some lesser-known spots that are truly breathtaking!',
        username: 'TravelGuru',
        timestamp: '2024-05-02 08:30',
        likes: 0
    },
    {
        id: 2,
        title: 'The Ultimate Guide to Homemade Pasta',
        content: 'Learned how to make pasta from scratch, and it’s easier than you think. Sharing my favorite recipes and tips.',
        username: 'FoodieFanatic',
        timestamp: '2024-05-02 09:45',
        likes: 0
    },
    {
        id: 3,
        title: 'Top 5 Gadgets to Watch Out for in 2024',
        content: 'Tech enthusiasts, here’s my list of the top 5 gadgets to look out for in 2024. Let me know your thoughts!',
        username: 'TechSage',
        timestamp: '2024-05-02 11:00',
        likes: 0
    },
    {
        id: 4,
        title: 'Sustainable Living: Easy Swaps You Can Make Today',
        content: 'Making the shift to sustainable living is simpler than it seems. Sharing some easy swaps to get you started.',
        username: 'EcoWarrior',
        timestamp: '2024-05-02 13:00',
        likes: 0
    },
    {
        id: 5,
        title: 'Ultimate Cat Food Review: What is Best for Your Feline Friend?',
        content: 'As a passionate cat owner, finding the right food for your feline can be a game-changer. This week, I haveve tested several top-rated cat foods to see which one reigns supreme for health, taste (according to my cat!)',
        username: 'CrunchyCat',
        timestamp: '2024-05-02 15:00',
        likes: 0
    }
];

// Data structure to keep track of user post likes {userId: Set(postIds)}
let userLikes = {
    1: new Set(),
    2: new Set(),
    3: new Set(),
    4: new Set()
};

// Function to find a user by username
function findUserByUsername(username) {
    // Return user object if found, otherwise return undefined
    return users.find(user => user.username === username);
}

// Function to find a user by user ID
function findUserById(userId) {
    // Return user object if found, otherwise return undefined
    return users.find(user => user.id === userId);
}

// Function to add a new user
function addUser(username) {
    // Create a new user object and add to users array
    const userId = generateUserId();
    const avatarUrl = saveAvatar(generateAvatar(username.charAt(0)), username);     // set default avatar
    const dateNow = getDate();

    const user = {
        id: userId,
        username: username,
        avatar_url: undefined,   
        memberSince: dateNow
    };

    users.push(user);
    userLikes[userId] = new Set();  // initialize liked posts
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
function registerUser(req, res) {
    // Register a new user and redirect appropriately
    const username = req.body.username;
    console.log("Attempting to register:", username);
    if (findUserByUsername(username)) {
        // Username already exists
        res.redirect('register?error=Username+already+exists');
    } else {
        // Add the new user
        addUser(username);
        res.redirect('/login');
    }
}

// Function to login a user
function loginUser(req, res) {
    // Login a user and redirect appropriately
    const username = req.body.username;
    const user = findUserByUsername(username);
    console.log("Attempting to log in:", username);
    if (user) {
        // Successful login
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        // Invalid username
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
function renderProfile(req, res) {
    // Fetch user posts and render the profile page
    const user = getCurrentUser(req);
    const userId = req.session.userId;
    const posts = getPosts()
                    .filter(post => post.username === user.username)
                    .map(post => {
                        // check if post is liked by user
                        let isLikedByUser = false;
                        if (userLikes[userId]) {
                            isLikedByUser = userLikes[userId].has(post.id);
                        }
                        // check if post is owned by user
                        const isOwnedByUser = post.username === user.username;

                        return {...post, isLikedByUser, isOwnedByUser}
                    });
    res.render('profile', { posts: posts, user: user });
}

// Function to update post likes
function updatePostLikes(req, res) {
    // Increment post likes if conditions are met
    const userId = req.session.userId;
    const postId = req.params.id;
    const post = findPostById(postId);
    console.log('old post likes', post.likes);

    if (post) {
        let isLiked = true;
        if (!userLikes[userId].has(postId)) {
            // like post
            post.likes += 1;
            userLikes[userId].add(postId);
        } else {
            // unlike post
            post.likes -= 1;
            userLikes[userId].delete(postId);
            isLiked = false;
        }
        res.json({
            success: true,
            likes: post.likes,
            isLiked: isLiked
        });
        console.log('new post likes', post.likes);
    } else {
        res.status(404).json({
            success: false,
            message: 'Post not found'
        });
    }
}

// Function to handle avatar generation and serving
async function handleAvatar(req, res) {
    // Generate and serve the user's avatar image
    const username = req.params.username;
    const user = findUserByUsername(username);
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

    // if (user && user.avatar_url) {
    //     res.sendFile(path.join(__dirname, 'public', user.avatar_url));
    // } else {
    //     console.error('Error serving avatar image:', err);
    //     res.redirect('/error');
    // }
}

// Function to get the current user from session
function getCurrentUser(req) {
    // Return the user object if the session user ID matches
    const user = findUserById(req.session.userId);
    return user;
}

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
function addPost(title, content, user) {
    // Create a new post object and add to posts array
    const post = {
        id: generatePostId(),
        title: title,
        content: content,
        username: user.username,
        timestamp: getDate(),
        likes: 0
    };
    posts.push(post);
    console.log(post);
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

// Function to generate a random user id
function generateUserId() {
    let id = Math.floor(Math.random() * Date.now()).toString(16);
    while (findUserById(id) !== undefined) {
        id = Math.floor(Math.random() * Date.now()).toString(16);
    }
    return id;
}

// Function to generate a random post id
function generatePostId() {
    let id = Math.floor(Math.random() * Date.now()).toString(16);
    while (findPostById(id) !== undefined) {
        id = Math.floor(Math.random() * Date.now()).toString(16);
    }
    return id;
}

// Function to get current date as string
function getDate() {
    let currentDate = new Date(Date.now());
    return currentDate.toISOString().replace('T', ' ').substring(0, 16);
}

// Function to find a post by post id
function findPostById(postId) {
    return posts.find(post => post.id == postId);
}

// Function to save avatar buffer as PNG file
async function saveAvatar(buffer, username) {
    const avatarPath = path.join(__dirname, 'public', 'avatar', `${username}.png`);
    await fs.writeFile(avatarPath, buffer);
    return `/avatar/${username}.png`;
}

// Function to add a new post and redirect to home
function submitPost(req, res) {
    const user = getCurrentUser(req);
    const post = addPost(req.body.title, req.body.content, user)
    res.redirect('/');
}

// Function to delete a post
function deletePost(req, res) {
    const post = findPostById(req.params.id);
    console.log(req.params.id);
    
    if (post) {
        const postIdx = posts.findIndex(post => post.id == req.params.id);
        posts.splice(postIdx, 1);
        res.json({
            success: true,
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'Post not found'
        });
    }
}