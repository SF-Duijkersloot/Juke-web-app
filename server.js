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

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
})