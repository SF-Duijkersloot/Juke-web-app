const express = require('express');
const crypto = require('crypto');
const dotenv = require('dotenv');

const app = express();
const port = 3000;

// In-memory storage for code verifier (in a production app, use a database)
let codeVerifierStore = {};
let currentToken = null

dotenv.config();

app
  .use(express.static('public'))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .set('view engine', 'ejs')
  .set('views', 'src/views');

app.get('/', (req, res) => {
  res.render('index', { loggedIn: false });
});

// Generate random string for code verifier
const generateRandomString = length => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.randomBytes(length))
    .map(byte => possible[byte % possible.length])
    .join('');
};

// Generate SHA-256 hash
const sha256 = plain => {
  return crypto.createHash('sha256').update(plain).digest();
};

// Base64 URL encode
const base64encode = input => {
  return input.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

// Endpoint to start authorization
app.get('/login', async (req, res) => {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = base64encode(sha256(codeVerifier));
  codeVerifierStore['current'] = codeVerifier; // Store code verifier

  const clientId = process.env.CLIENT_ID;
  const redirectUri = process.env.REDIRECT_URI;
  const scope = 'user-read-private user-read-email';
  const authUrl = new URL('https://accounts.spotify.com/authorize');

  const params = {
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  };

  authUrl.search = new URLSearchParams(params).toString();
  res.redirect(authUrl.toString());
});

// Endpoint to handle the callback
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  const codeVerifier = codeVerifierStore['current'];
  const clientId = process.env.CLIENT_ID;
  const redirectUri = process.env.REDIRECT_URI;

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  };

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', payload);
    const data = await response.json();
    currentToken = data // Store access token
    // console.log(data);
    res.render('index', { loggedIn: true });
  } catch (error) {
    console.error(error);
    res.send('An error occurred while fetching the access token.');
  }
});

/**
 * Web API helper function
 */
async function fetchWebApi(endpoint, method, body) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        'Authorization': 'Bearer ' + currentToken.access_token
      },
      method,
      body: JSON.stringify(body)
    });
    return await res.json();
}
  
// Get top tracks
async function getTopTracks() {
    return (await fetchWebApi(
      'v1/me/top/tracks?time_range=long_term&limit=10', 'GET'
    )).items;
}
  
// Endpoint to get top tracks
app.get('/top-tracks', async (req, res) => {
    try {
        const data = await getTopTracks();
        console.log(data)
        res.render('topTracks', { tracks: data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching top tracks.' });
    }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});