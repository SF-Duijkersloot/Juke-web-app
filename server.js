const express = require('express')
const app = express()
const port = 3000

app
    // Set static files directory
    .use(express.static('public'))
    // Parse URL-encoded bodies (bv.HTML forms)
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    // Set EJS as templating engine
    .set('view engine', 'ejs')
    .set('views', 'src/views')

app.get('/', (req, res) => {
    res.send('Test home page')
})

app.get('/zoek', (req, res) => {
    res.render('pages/zoek')
})

app.get('/genres', (req, res) => {
    res.render('pages/genres')
}) 

app.get('/connect', (req, res) => {
    res.render('pages/connect')
}) 

app.get('/verkennen', (req, res) => {
    res.render('pages/aanmelden')
}) 



app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
})