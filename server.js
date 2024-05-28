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


// Get user profile
async function getUserProfile(req) {
    try {
        return (await fetchWebApi(
            req,
            'v1/me', 'GET'
        ))
    }
    catch (error) {
        console.error(error)
    }
}

app.get('/profile', async (req, res) => {
    try {
        const profileData = await getUserProfile(req)
        console.log('Profile:', profileData)
        res.redirect('/')
    }
    catch (error) {
        console.error('Error fetching profile:', error)
    }
})


// Debugging route to check session token
app.get('/session-test', (req, res) => 
{
    console.log("session token", req.session.token)
    res.send(req.session.token)
})


// Create playlist  
async function createPlaylist(req){
    try {
        const userInfo = await getUserProfile(req)
        
        // Create playlist
        const playlist = await fetchWebApi(
            req,
          `v1/users/${userInfo.id}/playlists`, 'POST', {
            "name": "Your Juke Playlist",
            "description": "Playlist created by the tutorial on developer.spotify.com",
            "public": false
        })

        // Add top tracks to playlist
        const topTracks = await getTopTracks(req)
        const tracksUri = topTracks.map(track => `spotify:track:${track.id}`);
        console.log('Tracks URI:', tracksUri)

        await fetchWebApi(
            req,
            `v1/playlists/${playlist.id}/tracks?uris=${tracksUri.join(',')}`,
            'POST'
        )
        return playlist
    }
    catch (error) {
        console.error('Error fetching - creating playlist:', error)
    }
}
  
app.get('/create-playlist', async (req, res) => 
{
    try {
        const playlist = await createPlaylist(req)
        console.log("createdPlaylist", playlist)
        res.redirect('/')
    }
    catch (error) {
        console.error('Error url - creating playlist:', error)
    }
})


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})