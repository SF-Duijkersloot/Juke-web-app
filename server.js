const express = require('express');
const dotenv = require('dotenv');
const querystring = require('querystring');

dotenv.config(); 

const app = express();
const port = 3000;

let tokenResponse = null;

let client_id = process.env.CLIENT_ID;
let redirect_uri = process.env.REDIRECT_URI;
let client_secret = process.env.CLIENT_SECRET;

function generateRandomString(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

app.get('/', (req, res) => {
    res.render('index', { loggedIn: tokenResponse !== null});
})

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  var scope = 'user-read-private user-read-email';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', async function(req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;

  if (state === null) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    const authOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
      },
      body: new URLSearchParams({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      })
    };

    try {
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', authOptions);
      const tokenData = await tokenResponse.json();

      if (tokenResponse.ok) {
        const access_token = tokenData.access_token;
        const refresh_token = tokenData.refresh_token;

        const userResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': 'Bearer ' + access_token }
        });
        const userData = await userResponse.json();
        console.log(userData);

        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    } catch (error) {
      console.error('Error fetching access token:', error);
      res.redirect('/#' +
        querystring.stringify({
          error: 'token_fetch_error'
        }));
    }
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});


// V2
// const express = require('express');
// const crypto = require('crypto');
// const dotenv = require('dotenv');

// dotenv.config(); 

// const app = express();
// const port = 3000;

// // In-memory storage for code verifier (in a production app, use a database)
// let codeVerifierStore = {};
// let currentToken = null;

// app
//   .use(express.static('public'))
//   .use(express.json())
//   .use(express.urlencoded({ extended: true }))
//   .set('view engine', 'ejs')
//   .set('views', 'src/views');

// app.get('/', (req, res) => {
//   res.render('index', { loggedIn: currentToken !== null });
// });

// // Generate random string for code verifier
// const generateRandomString = length => {
//   const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//   return Array.from(crypto.randomBytes(length))
//     .map(byte => possible[byte % possible.length])
//     .join('');
// };

// // Generate SHA-256 hash
// const sha256 = plain => {
//   return crypto.createHash('sha256').update(plain).digest();
// };

// // Base64 URL encode
// const base64encode = input => {
//   return input.toString('base64')
//     .replace(/=/g, '')
//     .replace(/\+/g, '-')
//     .replace(/\//g, '_');
// };

// // Endpoint to start authorization
// app.get('/login', async (req, res) => {
//   const codeVerifier = generateRandomString(64);
//   const codeChallenge = base64encode(sha256(codeVerifier));
//   codeVerifierStore['current'] = codeVerifier; // Store code verifier

//   const clientId = process.env.CLIENT_ID;
//   const redirectUri = process.env.REDIRECT_URI;
//   const scope = 'user-read-private user-read-email';
//   const authUrl = new URL('https://accounts.spotify.com/authorize');

//   const params = {
//     response_type: 'code',
//     client_id: clientId,
//     scope: scope,
//     code_challenge_method: 'S256',
//     code_challenge: codeChallenge,
//     redirect_uri: redirectUri,
//   };

//   authUrl.search = new URLSearchParams(params).toString();
//   res.redirect(authUrl.toString());
// });

// // Endpoint to handle the callback
// app.get('/callback', async (req, res) => {
//   const code = req.query.code;
//   const codeVerifier = codeVerifierStore['current'];
//   const clientId = process.env.CLIENT_ID;
//   const redirectUri = process.env.REDIRECT_URI;

//   const payload = {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/x-www-form-urlencoded',
//     },
//     body: new URLSearchParams({
//       client_id: clientId,
//       grant_type: 'authorization_code',
//       code: code,
//       redirect_uri: redirectUri,
//       code_verifier: codeVerifier,
//     }),
//   };

//   try {
//     const response = await fetch('https://accounts.spotify.com/api/token', payload);
//     const data = await response.json();
//     if (data.error) {
//       throw new Error(data.error_description);
//     }
//     currentToken = data; // Store access token
//     console.log('Access Token:', data); // Log the access token for debugging
//     res.render('index', { loggedIn: true });
//   } catch (error) {
//     console.error('Error fetching access token:', error);
//     res.send('An error occurred while fetching the access token.');
//   }
// });

// /**
//  * Web API helper function
//  */
// async function fetchWebApi(endpoint, method, body) {
//   if (!currentToken || !currentToken.access_token) {
//     throw new Error('Access token is not set or invalid');
//   }

//   const res = await fetch(`https://api.spotify.com/${endpoint}`, {
//     headers: {
//       'Authorization': 'Bearer ' + currentToken.access_token,
//       'Content-Type': 'application/json',
//     },
//     method,
//     body: JSON.stringify(body)
//   });

//   if (!res.ok) {
//     const errorResponse = await res.json();
//     throw new Error(`Error fetching data from Spotify API: ${errorResponse.error.message}`);
//   }

//   return await res.json();
// }

// // Get top tracks
// async function getTopTracks() {
//   return (await fetchWebApi(
//     'v1/me/top/tracks?time_range=long_term&limit=10', 'GET'
//   )).items;
// }

// // Endpoint to get top tracks
// app.get('/top-tracks', async (req, res) => {
//   try {
//     if (!currentToken) {
//       return res.status(401).json({ error: 'User is not logged in' });
//     }

//     const data = await getTopTracks();
//     console.log('Top Tracks:', data); // Log the top tracks for debugging
//     res.render('topTracks', { tracks: data });
//   } catch (error) {
//     console.error('Error fetching top tracks:', error);
//     res.status(500).json({ error: 'An error occurred while fetching top tracks.' });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server listening at http://localhost:${port}`);
// });
