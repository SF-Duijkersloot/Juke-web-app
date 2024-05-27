const express = require('express')
const session = require('express-session')
const dotenv = require('dotenv')
const crypto = require('crypto')
const querystring = require('querystring')

const app = express()
const port = 3000

dotenv.config()
// hallo
// Set up middleware
app
    // Serve static files from the 'public' directory   
    .use(express.static('public'))

    // Parse JSON and URL-encoded data into req.body
    .use(express.json())
    .use(express.urlencoded({ extended: true }))

    // EJS view engine
    .set('view engine', 'ejs')
    .set('views', 'src/views')
  
    // Server-side session storage
    .use(session({ 
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true
    }))

// Standard routes
app.get('/', (req, res) => 
{
    res.render('index', { loggedIn: req.session.loggedIn })
})


/**
 * Spotify Web API Authorization Code Flow
 */
// Define environment variables
const client_id = process.env.CLIENT_ID
const redirect_uri = process.env.REDIRECT_URI
const client_secret = process.env.CLIENT_SECRET

// Generate random string for code verifier
const generateRandomString = (length) => {
  return crypto
    .randomBytes(60)
    .toString('hex')
    .slice(0, length)
}

// Endpoint to start authorization
app.get('/login', (req, res) => 
{
    const state = generateRandomString(16)
    const scope = `
        user-read-private
        user-read-email
        user-top-read
        playlist-modify-public
        playlist-modify-private
        user-read-private
        user-read-email
        `
 
    // Store the state in session for later validation
    req.session.state = state

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state,
            show_dialog: true
    }))
})

// Endpoint to handle the callback
app.get('/callback', async (req, res) =>
{
    const code = req.query.code || null
    const state = req.query.state || null

    if (state === null || state !== req.session.state) 
    {
        res.redirect('/#' +
        querystring.stringify({ error: 'state_mismatch' })
        )
    } 
    else 
    {
        // delete req.session.state // State no longer needed

        // Options for token request
        const authOptions = 
        {
            method: 'POST',
            headers: 
            {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            body: querystring.stringify({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            })
        }
        try {
            // Fetch token
            await fetch('https://accounts.spotify.com/api/token', authOptions) // Make request to token endpoint for tokens
            .then(response => response.json())
            .then(data => 
            {
                req.session.token = data
                req.session.loggedIn = true

                console.log('Access Token:', data)
                res.render('index', { loggedIn: req.session.loggedIn })
            })
        }
        catch (error) 
        {
            console.error(error)
            res.redirect('/#' +
                querystring.stringify({ error: 'token_request_failed' })
            )
        }
    }
})


/**
 * Web API helper function
 */
async function fetchWebApi(req, endpoint, method, body) 
{
    if (!req.session.token || !req.session.token.access_token) 
    {
        throw new Error('Access token is not set or invalid')
    }
    try 
    {
        const res = await fetch(`https://api.spotify.com/${endpoint}`, 
        {
            headers: {
                'Authorization': 'Bearer ' + req.session.token.access_token,
                'Content-Type': 'application/json',
            },
            method,
            body: JSON.stringify(body)
        })

        return await res.json()
    }
    catch (error) 
    {
        console.error(error)
    }
}

// Get top tracks
async function getTopTracks(req) 
{
    return (await fetchWebApi(
        req,
        'v1/me/top/tracks?time_range=short_term&limit=5', 'GET'
    )).items
}

async function getRecommendations(req) 
{
    const topTracks = await getTopTracks(req)
    const seedTracks = topTracks.map(track => track.id).join(',')
    console.log('Seed Tracks:', seedTracks)
    return (await fetchWebApi(
        req,
        // `/v1/recommendations?limit=25&seed_tracks=${seedTracks}`, 'GET'
        `/v1/recommendations?limit=25&seed_tracks=3va7Q99A1EJk8eAZ2DV74v`, 'GET'
    )).items
}

// URL to get top tracks
app.get('/top-tracks', async (req, res) => 
{
    try 
    {
        if (!req.session.loggedIn) 
        {
            return res.status(401).json({ error: 'User is not logged in' })
        }
        
        const data = await getTopTracks(req)
        console.log('Top Tracks:', data) // Log the top tracks for debugging
        res.render('topTracks', { tracks: data, recommendations: []})
  } 
  catch (error) 
  {
    console.error('Error fetching top tracks:', error)
    res.status(500).json({ error: 'An error occurred while fetching top tracks.' })
  }
})

app.get('/reccomendations', async (req, res) =>
{
    try 
    {
        if (!req.session.loggedIn) 
        {
            return res.status(401).json({ error: 'User is not logged in' })
        }
        const recommendations = await getRecommendations(req)
        console.log('Recommendations:', recommendations) // Log the top tracks for debugging
        res.render('topTracks', { recommendations: recommendations, tracks: []})
  } 
  catch (error) 
  {
    console.error('Error fetching top tracks:', error)
    res.status(500).json({ error: 'An error occurred while fetching top tracks.' })
  }
})

// Debugging route to check session token
app.get('/session-test', (req, res) => 
{
    console.log("session token", req.session.token)
    res.send(req.session.token)
})

// vivanne stuk: maak playlist aan

// const tracksUri = [
//     'spotify:track:5ARG0eQKOYOsFAdFeUuXrm','spotify:track:6G53gri09h5KXRegSCcWy9','spotify:track:3fajzhEHSdlSmY31dORz9M','spotify:track:24LO2UMNHWNoPZnhdAw4TO','spotify:track:0LMwmV37RCmBO2so0szAFs','spotify:track:03eyNjBM2mpx28H6kdaufN','spotify:track:0nTl6b84STC3E1J32yw4iq','spotify:track:3PHdgHZ58axM9ss7mkD2XJ','spotify:track:3cR5ZtQ4JqGj4VHBb1gvFf','spotify:track:5H3TCfiw0CQTX1XU7A9TXM'
//   ];
  
//   async function createPlaylist(tracksUri){
//     const { id: user_id } = await fetchWebApi('v1/me', 'GET')
  
//     const playlist = await fetchWebApi(
//       `v1/users/${user_id}/playlists`, 'POST', {
//         "name": "My recommendation playlist",
//         "description": "Playlist created by the tutorial on developer.spotify.com",
//         "public": false
//     })
  
//     await fetchWebApi(
//       `v1/playlists/${playlist.id}/tracks?uris=${tracksUri.join(',')}`,
//       'POST'
//     );
  
//     return playlist;
//   }

async function getUserData(req) {
    return (await fetchWebApi(
        req,
        'v1/me', 'GET'
    )).items
}

// async function createdPlaylist(req) 
// {
//     const userData = await getUserData(req)
//     console.log(userData)
//     return (await fetchWebApi(
//         req,
//         `v1/users/${userData.id}/playlists`, 'POST', {
//             "name": "My recommendation playlist",
//             "description": "Playlist created by the tutorial on developer.spotify.com",
//             "public": false
//         }).items
// }

async function createdPlaylist(req) {
    const userData = await getUserData(req);
    console.log('userdata:', userData);
    return (await fetchWebApi(
        req,
        `v1/users/${userData.id}/playlists`, 'POST', {
            "name": "My recommendation playlist",
            "description": "Playlist created by the tutorial on developer.spotify.com",
            "public": false
        }
    )).items;
}

  
  app.get('/create-playlist', async (req, res) => 
  {
    const Playlist = await createdPlaylist(req);
    console.log(Playlist.name, Playlist.id);
  })

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})





