// populatedb.js

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Placeholder for the database file name
const dbFileName = 'blog.db';

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_likes (
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, post_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (post_id) REFERENCES posts(id)
        )
    `);

    // Sample data - Replace these arrays with your own data
    // const users = [
    //     { username: 'user1', hashedGoogleId: 'hashedGoogleId1', avatar_url: '', memberSince: '2024-01-01 12:00:00' },
    //     { username: 'user2', hashedGoogleId: 'hashedGoogleId2', avatar_url: '', memberSince: '2024-01-02 12:00:00' }
    // ];

    // const posts = [
    //     { title: 'First Post', content: 'This is the first post', username: 'user1', timestamp: '2024-01-01 12:30:00', likes: 0 },
    //     { title: 'Second Post', content: 'This is the second post', username: 'user2', timestamp: '2024-01-02 12:30:00', likes: 0 }
    // ];

    const users = [
        { username: 'TravelGuru', hashedGoogleId: 'hashedGoogleId1', avatar_url: undefined, memberSince: '2024-05-01 10:00' },
        { username: 'FoodieFanatic', hashedGoogleId: 'hashedGoogleId2', avatar_url: undefined, memberSince: '2024-05-01 11:30' },
        { username: 'TechSage', hashedGoogleId: 'hashedGoogleId3', avatar_url: undefined, memberSince: '2024-05-01 12:15' },
        { username: 'EcoWarrior', hashedGoogleId: 'hashedGoogleId4', avatar_url: undefined, memberSince: '2024-05-01 13:45' },
        { username: 'CrunchyCat', hashedGoogleId: 'hashedGoogleId5', avatar_url: 'uploads/5-crunchycat.png', memberSince: '2024-05-01 14:45' }
    ];

    const posts = [
        { title: 'Exploring Hidden Gems in Europe', content: 'Just got back from an incredible trip through Europe. Visited some lesser-known spots that are truly breathtaking!', username: 'TravelGuru', timestamp: '2024-05-02 08:30', likes: 0 },
        { title: 'The Ultimate Guide to Homemade Pasta', content: 'Learned how to make pasta from scratch, and it’s easier than you think. Sharing my favorite recipes and tips.', username: 'FoodieFanatic', timestamp: '2024-05-02 09:45', likes: 0 },
        { title: 'Top 5 Gadgets to Watch Out for in 2024', content: 'Tech enthusiasts, here’s my list of the top 5 gadgets to look out for in 2024. Let me know your thoughts!', username: 'TechSage', timestamp: '2024-05-02 11:00', likes: 0 },
        { title: 'Sustainable Living: Easy Swaps You Can Make Today', content: 'Making the shift to sustainable living is simpler than it seems. Sharing some easy swaps to get you started.', username: 'EcoWarrior', timestamp: '2024-05-02 13:00', likes: 0 },
        { title: 'Ultimate Cat Food Review: What is Best for Your Feline Friend?', content: 'As a passionate cat owner, finding the right food for your feline can be a game-changer. This week, I haveve tested several top-rated cat foods to see which one reigns supreme for health, taste (according to my cat!)', username: 'CrunchyCat', timestamp: '2024-05-02 15:00', likes: 0 }
    ];

    // Insert sample data into the database
    await Promise.all(users.map(user => {
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
        );
    }));

    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});