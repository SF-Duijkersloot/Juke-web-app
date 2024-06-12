const express = require('express')
const session = require('express-session')
const dotenv = require('dotenv')
const crypto = require('crypto')
const querystring = require('querystring')

const app = express()
const port = 3000

dotenv.config()


/*==========================================\

              Setup middleware

===========================================*/
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
        saveUninitialized: true,
    }))





/*==========================================\

                MongoDB Setup

===========================================*/
const { MongoClient, ServerApiVersion } = require('mongodb')
const { create } = require('domain')
// Construct URL used to connect to database from info in the .env file
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`
// Create a MongoClient
const client = new MongoClient(uri, {
    serverApi: 
    {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
})

// Try to open a database connection
client.connect()
.then(() => {
    console.log('Database connection established')
})
.catch((err) => {
    console.log(`Database connection error - ${err}`)
    console.log(`For uri - ${uri}`)
})

// Get the users collection
const usersCollection = client.db(process.env.DB_NAME).collection('users')
const songsCollection = client.db(process.env.DB_NAME).collection('songs')

// Logout route
app.get('/logout', (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/')
    }
    catch (error) {
        console.error('Error logging out:', error)
    }
})





/*==========================================\

        Spotify Authorization Flow

===========================================*/
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
            // show_dialog: true
    }))
})


// Endpoint to handle the callback
app.get('/callback', async (req, res) => {
    const code = req.query.code || null
    const state = req.query.state || null

    if (state === null || state !== req.session.state) {
        res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }))
    } else {
        // Options for token request
        const authOptions = {
            method: 'POST',
            headers: {
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
            const response = await fetch('https://accounts.spotify.com/api/token', authOptions)
            const data = await response.json()

            // Store token in session if it exists
            if (data.access_token) {
                req.session.token = data
                req.session.loggedIn = true

                // Get user profile and store in session and database
                const profileData = await getUserProfile(req)
                req.session.user = profileData

                const user = {
                    _id: profileData.id,
                    name: profileData.display_name,
                    playlist_id: '',
                    recommendations: [],
                    swipes: {
                        likes: 0,
                        dislikes: 0
                    }
                }

                // Check if user exists in the database
                const userExists = await usersCollection.findOne({ _id: user._id })
                if (!userExists) {
                    await usersCollection.insertOne(user)
                    console.log(`Successfully inserted item with _id: ${user._id}`)
                } else {
                    console.log('User already exists in the database')
                }

                // Save session and redirect
                req.session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err)
                        res.redirect('/#' + querystring.stringify({ error: 'session_save_error' }))
                    }
                    else {
                        res.redirect('/')
                    }
                })
            } else {
                console.log('Failed to obtain access token')
                res.redirect('/#' + querystring.stringify({ error: 'token_request_failed' }))
            }
        } catch (error) {
            console.error('Error during token request:', error)
            res.redirect('/#' + querystring.stringify({ error: 'token_request_failed' }))
        }
    }
})





/*==========================================\

            Standard page routes

===========================================*/

app.get('/', async (req, res) => {
    if (req.session.loggedIn) {
        try {
            res.redirect('/recommendations')
        } catch (error) {
            console.error(error)
        }
    } else {
        res.render('pages/connect')
    }
})

app.get('/zoek', async (req, res) => {
    if (req.session.loggedIn) {
        try {
            // Haal de topartiesten en genres op
            const { artists, genres } = await getTopArtists(req)
            const topTracks = await getTopTracks(req)

            res.render('pages/zoek', {
                user: req.session.user,
                genres: genres,
                artists: artists,
                topTracks: topTracks,  // voeg topTracks toe aan de render
            })
        } catch (error) {
            console.error('Error fetching data for zoek page:', error)
            res.status(500).send('An error occurred while fetching data for zoek page.')
        }
    } else {
        res.render('pages/connect')
    }
})




// app.get('/genres', async (req, res) => {
//     if (req.session.loggedIn) {
//         try {
//             // Haal de genres op vanuit de Spotify API
//             const genres = await getGenresFromSpotifyAPI() // Dit is een placeholder voor de functie om genres op te halen van Spotify

//             res.render('pages/genres', {
//                 user: req.session.user,
//                 genres: genres
//             })
//         } catch (error) {
//             console.error('Error fetching genres:', error)
//             res.status(500).send('An error occurred while fetching genres.')
//         }
//     } else {
//         res.render('pages/connect')
//     }
// })



app.get('/profiel', async (req, res) => {
    if (req.session.loggedIn) {
        const genres = [
            { name: 'Pop', image: 'pop.jpg' },
            { name: 'Edm', image: 'pop.jpg' },
            { name: 'Rock', image: 'pop.jpg' },
            { name: 'House', image: 'pop.jpg' },
            { name: 'Indie', image: 'pop.jpg' },
            { name: 'Rap', image: 'pop.jpg' },
            { name: 'Jazz', image: 'pop.jpg' },
            { name: 'Klassiek', image: 'pop.jpg'},
            { name: 'Reggae', image: 'pop.jpg' },
        ]

        // Get user from DB
        const user = await usersCollection.findOne({ _id: req.session.user.id })
        
        // Recent recommendations first
        const recommendations = user.recommendations.reverse() 

        const totalSwipes = user.swipes.likes + user.swipes.dislikes
        const likes = user.swipes.likes
        const dislikes = user.swipes.dislikes

        res.render('pages/profiel', { 
            user: req.session.user,
            image: req.session.user.images[1]?.url, 
            genres: genres,
            recommendations: recommendations,
            stats: {
                totalSwipes: totalSwipes,
                likes: likes,
                dislikes: dislikes
            }
        })
    } else {
        res.render('pages/connect')
    }
})






/*==========================================\

            API fetch helper function

===========================================*/
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





/*==========================================\

              Get user profile

===========================================*/
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






/*==========================================\

                Get top tracks

===========================================*/
async function getTopTracks(req) {
    const cacheTimeTillExpiration = 60 * 60 * 1000; // 1 hour in milliseconds

    // Check if top tracks are in the session and not expired
    if (req.session.topTracks && new Date() < new Date(req.session.topTracksExpiry)) {
        // console.log('Using cached top tracks');
        // console.log('Top tracks expiry:', req.session.topTracksExpiry);
        return req.session.topTracks;
    }

    // Fetch top tracks from Spotify API
    const topTracks = (await fetchWebApi(
        req,
        'v1/me/top/tracks?time_range=short_term&limit=5', 'GET'
    )).items;

    // Store top tracks and expiry time in session
    req.session.topTracks = topTracks;
    req.session.topTracksExpiry = new Date(new Date().getTime() + cacheTimeTillExpiration);

    // console.log('Fetched new top tracks');
    // console.log('Top tracks expiry:', req.session.topTracksExpiry);
    return topTracks;
}







/*==========================================\

            Get recommendations

===========================================*/

async function getRecommendations(req, limit, seed_type, seed_uri) {
    try {
        let approvedRecommendations = []
        let remainingLimit = limit
        
        while (remainingLimit > 0) {
                const recommendations = (
                    await fetchWebApi(
                        req,
                        `v1/recommendations?limit=${remainingLimit}&${seed_type}=${seed_uri.join(',')}`,
                        'GET'
                    )
                ).tracks

            const filteredRecommendations = await filterRecommendations(req, recommendations)
            approvedRecommendations.push(...filteredRecommendations)
            remainingLimit = limit - approvedRecommendations.length
        }

        return approvedRecommendations.slice(0, limit)
    } catch (error) {
        console.error('Error getting recommendations:', error)
    }
}

async function filterRecommendations(req, recommendations) {
    try {
        const filteredRecommendations = await Promise.all(
            recommendations.map(async (track) => {
                if (!hasPreviewUrl(track)) {
                    console.log(`Track "${track.name}" doesn't have a preview_url`)
                    return null
                }

                const userRecommendations = await usersCollection.findOne(
                    {
                        _id: req.session.user.id,
                        'recommendations._id': track.id
                    },
                    { projection: { _id: 1 } }
                )

                if (userRecommendations) {
                    console.log(`Track "${track.name}" already registered.`)
                    return null
                }

                return track
            })
        )

        return filteredRecommendations.filter(Boolean)
    } catch (error) {
        console.error('Error filtering recommendations:', error)
    }
}

function hasPreviewUrl(track) {
    return track.preview_url !== null && track.preview_url !== ''
}




/*==========================================\

           Regular recommendations

===========================================*/
app.get('/recommendations', async (req, res) => {
    try {
        const limit = 2
        const seed_type = 'seed_tracks'
        const topTracks = await getTopTracks(req)
        const seed_uri = topTracks.map((track) => track.id)

        const recommendedTracks = await getRecommendations(req, limit, seed_type, seed_uri)
        res.render('pages/verkennen', { tracks: recommendedTracks, user: req.session.user })
    } catch (error) {
        console.error('Error fetching recommendations:', error)
        res.status(500).json({ error: 'An error occurred while fetching recommendations.' })
    }
})

app.get('/new-recommendation', async (req, res) => {
    try {
        const limit = 2
        const seed_type = 'seed_tracks'
        const topTracks = await getTopTracks(req)
        const seed_uri = topTracks.map((track) => track.id)

        const recommendedTracks = await getRecommendations(req, limit, seed_type, seed_uri)
        res.json({ recommendation: recommendedTracks[0] })
    } catch (error) {
        console.error('Error fetching new recommendation:', error)
        res.status(500).json({ error: 'An error occurred while fetching a new recommendation.' })
    }
})



/*==========================================\

           Searched recommendations

===========================================*/
app.get('/search-recommendations', async (req, res) => {
    try {
        const { seed_uri, seed_type, seed_name } = req.query

        if (!seed_uri || !seed_type) {
            return res.status(400).json({ error: 'No query provided' })
        }
        const limit = 2
        const recommendedTracks = await getRecommendations(req, limit, seed_type, [seed_uri])
        res.render('pages/recommendations', { tracks: recommendedTracks, user: req.session.user, seed_name: seed_name })
    } catch (error) {
        console.error('Error fetching recommendations:', error)
        res.status(500).json({ error: 'An error occurred while fetching recommendations.' })
    }
})

app.get('/new-search-recommendation', async (req, res) => {
    try {
        const { seed_type, seed_uri } = req.query

        if (!seed_type || !seed_uri) {
            return res.status(400).json({ error: 'Missing seed_type or seed_uri' })
        }

        const limit = 1
        const recommendedTracks = await getRecommendations(req, limit, seed_type, [seed_uri])
        res.json({ recommendation: recommendedTracks[0] })
    } catch (error) {
        console.error('Error fetching new recommendation:', error)
        res.status(500).json({ error: 'An error occurred while fetching a new recommendation.' })
    }
})




/*==========================================\

              Playlist handling

===========================================*/
// Function to create the Juke Playlist
async function JukePlaylist(req) {
    try {
        const userInfo = req.session.user
        const user = await usersCollection.findOne({ _id: userInfo.id }, { playlist_id: 1 }) // playlist_id: 1, to only return the playlist_id field

        if (user.playlist_id) {
            console.log('Playlist_id exists:', user.playlist_id)

            return user.playlist_id
        } else {
            console.log('Playlist does not exist yet')

            const playlist = await fetchWebApi(
                req,
                `v1/users/${userInfo.id}/playlists`, 
                'POST', 
                {
                    name: "My Juke Playlist",
                    description: "Playlist created by Juke. to store your liked songs.",
                    public: false
                }
            )

            // Set playlist_id in the user's DB object
            await usersCollection.updateOne(
                { _id: userInfo.id },
                { $set: { playlist_id: playlist.id } }
            )

            console.log('Created playlist:', playlist.id)
            return playlist.id
        }
    } catch (error) {
        console.error('Error creating playlist:', error)
    }
}

// Route to handle playlist creation
app.get('/create-playlist', async (req, res) => {
    try {
        const playlist = await JukePlaylist(req)
        // console.log("createdPlaylist", playlist)
        res.redirect('/')
    } catch (error) {
        console.error('Error url - creating playlist:', error)
    }
})

app.get('/delete-playlist', async (req, res) => {
    try {
        const userId = req.session.user.id

        // Remove the playlist_id field from the user's document
        const result = await usersCollection.updateOne(
            { _id: userId },
            { $unset: { playlist_id: '' } }
        )

        console.log('Playlist deleted from DB')

        res.redirect('/')
    } catch (err) {
        console.error('Error deleting playlist ID:', err)
        res.status(500).send('An error occurred while deleting the playlist ID')
    }
})






/*==========================================\

        Like and Dislike handling

===========================================*/
app.post('/like', async (req, res) => {
    await handleSongAction(req, res)
})

app.post('/dislike', async (req, res) => {
    await handleSongAction(req, res)
})

// Helper function for handling the "Like" and "Dislike" actions
async function handleSongAction(req, res) {
    const { track_id, track_name, track_artists, track_images, action } = req.body

    if (!track_id) {
        return res.status(400).send({ status: 'No track_id found' })
    }

    try {
        const userId = req.session.user.id // Get the user ID from the session

        // Check if the user exists in the database
        const user = await usersCollection.findOne({ _id: userId })

        if (!user) {
            return res.status(404).send({ status: 'error', message: 'User not found' })
        }

        // Check if the song is already in the recommendations array
        const existingTrack = user.recommendations.find(
            (track) => track._id === track_id
        )
        if (existingTrack) {
            console.log('Song in recommendations')
            return res.status(200).send({ status: 'success' })
        }

        // Create a track object
        const track = {
            _id: track_id,
            name: track_name,
            artists: track_artists,
            images: track_images,
            action: action,
        }

        // Add info to database
        await usersCollection.updateOne(
            { _id: userId },
            {
                $push: { recommendations: track },
                $inc: action === 'like' ? { 'swipes.likes': 1 } : { 'swipes.dislikes': 1 },
            }
        )
        console.log(`Song added with id: ${track_id}`)

        // Add song to playlist if it's liked
        if (action === 'like') {
            await addSongToPlaylist(req)
        }

        // Register the song in the songs collection
        await registerSongCollection(req)

        res.status(200).send({ status: 'success' })
    } catch (err) {
        console.error(err)
        res.status(500).send({ status: 'error', message: err.message })
    }
}

async function addSongToPlaylist(req) {
    try {
        const { track_id } = req.body

        const playlistId = await JukePlaylist(req)
        const response = await fetchWebApi(
            req,
            `v1/playlists/${playlistId}/tracks`,
            'POST',
            { uris: [`spotify:track:${track_id}`] }
        )

        console.log('Song added to playlist', response)
    } catch (error) {
        console.error('Error adding song to playlist:', error)
    }
}

async function registerSongCollection(req) {
    try {
        const { track_id, track_name, track_artists, track_images, action } = req.body
        const userId = req.session.user.id

        // Check if the song already exists in the songs collection
        let track = await songsCollection.findOne({ _id: track_id })
        if (!track) {
            let trackInfo = {
                _id: track_id,
                name: track_name,
                artists: track_artists,
                images: track_images,
                likes: [],
                dislikes: []
            }

            if (action === 'like') {
                trackInfo.likes.push(userId)
            } else if (action === 'dislike') {
                trackInfo.dislikes.push(userId)
            } else {
                console.error('Invalid action')
            }

            await songsCollection.insertOne(trackInfo)
            console.log('Song added to songs collection')
        } else {
            console.log('Song already exists in the songs collection')

            // Update swipes based on the action
            if (action === 'like' && !track.likes.includes(userId)) {
                await songsCollection.updateOne(
                    { _id: track_id },
                    { $push: { likes: userId } }
                )
            } else if (action === 'dislike' && !track.dislikes.includes(userId)) {
                await songsCollection.updateOne(
                    { _id: track_id },
                    { $push: { dislikes: userId } }
                )
            }
        }
    } catch (error) {
        console.error('Error registering song:', error)
    }
}





/*==========================================\

                  Search bar

===========================================*/

app.get('/search', async (req, res) => {
    const query = req.query.q

    if (!query) {
        return res.status(400).send({ error: 'No query provided' })
    }

    try {
        const results = await fetchWebApi(
            req,
            `v1/search?q=${encodeURIComponent(query)}&type=track,artist,album&limit=10`,
            'GET'
        )

        res.render('pages/searchResults', { results: results, query: query, user: req.session.user })

    } catch (error) {
        console.error('Error performing search:', error)
        res.status(500).json({ error: 'An error occurred while performing search.' })
    }
})


/*==========================================\

                Get topartists
                
===========================================*/


async function getTopArtists(req) {
    try {
        const artists = (await fetchWebApi(
            req,
            'v1/me/top/artists?time_range=short_term&limit=5', 'GET'
        )).items

        // Create a list of unique genres
        let genresMap = {}
        artists.forEach(artist => {
            artist.genres.forEach(genre => {
                if (!genresMap[genre]) {
                    genresMap[genre] = {
                        name: genre,
                        image: artist.images[0]?.url || 'default_genre_image.jpg'  // Use artist image or a default image
                    }
                }
            })
        })

        // Convert the genresMap to an array
        const genres = Object.values(genresMap)

        return { artists, genres }
    } catch (error) {
        console.error('Error fetching top artists:', error)
    }
}

/*==========================================\

                Get all genres
                
===========================================*/

// Definieer de functie om genres op te halen vanuit de Spotify API
async function getGenresFromSpotifyAPI(req) {
    try {
        // Voer hier de logica uit om genres op te halen vanuit de Spotify API
        // Gebruik de fetchWebApi-functie om een verzoek naar de Spotify API te doen
        // Return een array van genres
    } catch (error) {
        console.error('Error fetching genres from Spotify API:', error)
        throw new Error('An error occurred while fetching genres from Spotify API.')
    }
}

// Roep de functie aan in de route voor de genrespagina
app.get('/genres', async (req, res) => {
    if (req.session.loggedIn) {
        try {
            // Haal de genres op vanuit de Spotify API
            const genres = await getGenresFromSpotifyAPI(req) // Roep de functie aan met 'req' als argument

            res.render('pages/genres', {
                user: req.session.user,
                genres: genres
            })
        } catch (error) {
            console.error('Error fetching genres:', error)
            res.status(500).send('An error occurred while fetching genres.')
        }
    } else {
        res.render('pages/connect')
    }
})


/*==========================================\

                Get top genres
                
===========================================*/

async function getTopGenres(req) {
    try {
        const artists = (await fetchWebApi(
            req,
            'v1/me/top/artists?time_range=short_term&limit=5', 'GET'
        )).items

        // Create a list of unique genres
        let genresMap = {}
        artists.forEach(artist => {
            artist.genres.forEach(genre => {
                if (!genresMap[genre]) {
                    genresMap[genre] = {
                        name: genre,
                        image: artist.images[0]?.url || 'default_genre_image.jpg'  // Use artist image or a default image
                    }
                }
            })
        })

        // Convert the genresMap to an array
        const genres = Object.values(genresMap)

        return { genres }
    } catch (error) {
        console.error('Error fetching genres:', error)
    }
}



/*==========================================\

                Get all genres
                
===========================================*/

app.get('/genres', async (req, res) => {
    if (req.session.loggedIn) {
        try {
            const genres = await getGenresFromSpotifyAPI(req)
            res.render('pages/genres', {
                user: req.session.user,
                genres: genres
            })
        } catch (error) {
            console.error('Error fetching genres:', error)
            res.status(500).send('An error occurred while fetching genres.')
        }
    } else {
        res.render('pages/connect')
    }
})


async function getGenresFromSpotifyAPI(req) {
    try {
        const response = await fetchWebApi(req, 'v1/recommendations/available-genre-seeds', 'GET')
        return response.genres
    } catch (error) {
        console.error('Error fetching genres from Spotify API:', error)
        throw new Error('An error occurred while fetching genres from Spotify API.')
    }
}





/*==========================================\

              Start the server

===========================================*/
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
  })





app.get('/liked-recommendations', (req, res) => {
    res.render('pages/liked', { user: req.session.user})
})

app.get('/disliked-recommendations', (req, res) => {
    res.render('pages/disliked', { user: req.session.user})
})