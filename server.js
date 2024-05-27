const express = require('express')
const session = require('express-session')
const dotenv = require('dotenv')
const crypto = require('crypto')
const querystring = require('querystring')

const app = express()
const port = 3000

dotenv.config()

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
        res.redirect('/#' +
            querystring.stringify({ error: 'api_request_failed' })
        )
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
    // const topTracks = await getTopTracks(req)
    // const seedTracks = topTracks.map(track => track.id).join(',')
    // console.log('Seed Tracks:', seedTracks)
    return (await fetchWebApi(
        req,
        // `/v1/recommendations?limit=25&seed_tracks=${seedTracks}`, 'GET'
        // `/v1/recommendations?limit=5&seed_tracks=3va7Q99A1EJk8eAZ2DV74v`, 'GET'
        `/v1/recommendations?limit=5&market=ES&seed_artists=4NHQUGzhtTLFvgF5SZesLK&seed_genres=classical%2Ccountry&seed_tracks=0c6xIDDpzE81m2q797ordA`, 'GET'
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

app.get('/get-recommendations', async (req, res) =>
{
    try 
    {
        if (!req.session.loggedIn) 
        {
            return res.status(401).json({ error: 'User is not logged in' })
        }
        const recommendationData = await getRecommendations(req)
        console.log('Recommendations:', recommendationData) // Log the top tracks for debugging
        // res.render('topTracks', { recommendations: recommendations, tracks: []})
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})












// // V2
// const express = require('express')
// const crypto = require('crypto')
// const dotenv = require('dotenv')

// dotenv.config() 

// const app = express()
// const port = 3000

// // In-memory storage for code verifier (in a production app, use a database)
// let codeVerifierStore = {}
// let currentToken = null

// app
//   .use(express.static('public'))
//   .use(express.json())
//   .use(express.urlencoded({ extended: true }))
//   .set('view engine', 'ejs')
//   .set('views', 'src/views')

// app.get('/', (req, res) => {
//   res.render('index', { loggedIn: currentToken !== null })
// })

// // Generate random string for code verifier
// const generateRandomString = length => {
//   const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
//   return Array.from(crypto.randomBytes(length))
//     .map(byte => possible[byte % possible.length])
//     .join('')
// }

// // Generate SHA-256 hash
// const sha256 = plain => {
//   return crypto.createHash('sha256').update(plain).digest()
// }

// // Base64 URL encode
// const base64encode = input => {
//   return input.toString('base64')
//     .replace(/=/g, '')
//     .replace(/\+/g, '-')
//     .replace(/\//g, '_')
// }

// // Endpoint to start authorization
// app.get('/login', async (req, res) => {
//   const codeVerifier = generateRandomString(64)
//   const codeChallenge = base64encode(sha256(codeVerifier))
//   codeVerifierStore['current'] = codeVerifier // Store code verifier

//   const clientId = process.env.CLIENT_ID
//   const redirectUri = process.env.REDIRECT_URI
//   const scope = 'user-read-private user-read-email user-top-read'
//   const authUrl = new URL('https://accounts.spotify.com/authorize')

//   const params = {
//     response_type: 'code',
//     client_id: clientId,
//     scope: scope,
//     code_challenge_method: 'S256',
//     code_challenge: codeChallenge,
//     redirect_uri: redirectUri,
//   }

//   authUrl.search = new URLSearchParams(params).toString()
//   res.redirect(authUrl.toString())
// })

// // Endpoint to handle the callback
// app.get('/callback', async (req, res) => {
//   const code = req.query.code
//   const codeVerifier = codeVerifierStore['current']
//   const clientId = process.env.CLIENT_ID
//   const redirectUri = process.env.REDIRECT_URI

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
//   }

//   try {
//     const response = await fetch('https://accounts.spotify.com/api/token', payload)
//     const data = await response.json()
//     if (data.error) {
//       throw new Error(data.error_description)
//     }
//     currentToken = data // Store access token
//     console.log('Access Token:', data) // Log the access token for debugging
//     res.render('index', { loggedIn: true })
//   } catch (error) {
//     console.error('Error fetching access token:', error)
//     res.send('An error occurred while fetching the access token.')
//   }
// })

// /**
//  * Web API helper function
//  */
// async function fetchWebApi(endpoint, method, body) {
//   if (!currentToken || !currentToken.access_token) {
//     throw new Error('Access token is not set or invalid')
//   }

//   const res = await fetch(`https://api.spotify.com/${endpoint}`, {
//     headers: {
//       'Authorization': 'Bearer ' + currentToken.access_token,
//       'Content-Type': 'application/json',
//     },
//     method,
//     body: JSON.stringify(body)
//   })

//   if (!res.ok) {
//     const errorResponse = await res.json()
//     throw new Error(`Error fetching data from Spotify API: ${errorResponse.error.message}`)
//   }

//   return await res.json()
// }

// // Get top tracks
// async function getTopTracks() {
//   return (await fetchWebApi(
//     'v1/me/top/tracks?time_range=long_term&limit=10', 'GET'
//   )).items
// }

// // Endpoint to get top tracks
// app.get('/top-tracks', async (req, res) => {
//   try {
//     if (!currentToken) {
//       return res.status(401).json({ error: 'User is not logged in' })
//     }

//     const data = await getTopTracks()
//     console.log('Top Tracks:', data) // Log the top tracks for debugging
//     res.render('topTracks', { tracks: data })
//   } catch (error) {
//     console.error('Error fetching top tracks:', error)
//     res.status(500).json({ error: 'An error occurred while fetching top tracks.' })
//   }
// })

// app.listen(port, () => {
//   console.log(`Server listening at http://localhost:${port}`)
// })
