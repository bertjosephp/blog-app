# blog-app

## Running the application

1. Install dependencies.
- Install the necessary npm packages by running the following command in the terminal:
```bash
npm install
```

2. Create a `.env` file.
- Place the file in the root of the project directory. This file should include secret keys and database configurations. Use the following template:
```bash
EMOJI_API_KEY='[Your Emoji API Key]'
CLIENT_ID='[Your Google Client ID]'
CLIENT_SECRET='[Your Google Client Secret]'
DB_PATH='blog.db'
```
3. Configure your environment variables.
- Replace the placeholders with actual values.
    - EMOJI_API_KEY: Key for the Emoji API.
    - CLIENT_ID & CLIENT_SECRET: Credentials for Google OAuth integration.
    - DB_PATH: Path to your SQLite database file.

4. Run the server.
- Start the server by executing the following command.
```bash
node server.js
```
- Access the application through your web browser at [http://localhost:3000](http://localhost:3000).