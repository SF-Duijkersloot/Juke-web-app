/*==========================================\

Ongebruikte code, maar voor backup laten staan

===========================================*/

const likeButtons = document.querySelectorAll('.like-button')
const dislikeButtons = document.querySelectorAll('.dislike-button')

const handleButtonClick = async (e, action) => {
    e.preventDefault()

    const form = e.target.closest('form')
    const trackId = form.querySelector('input[name="track_id"]').value
    const trackName = form.querySelector('input[name="track_name"]').value
    const trackArtists = JSON.parse(form.querySelector('input[name="track_artists"]').value)
    const trackImages = JSON.parse(form.querySelector('input[name="track_images"]').value)

    const res = await fetch(`/${action}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            track_id: trackId,
            track_name: trackName,
            track_artists: trackArtists,
            track_images: trackImages,
            action: action
        })
    })

    if (res.ok) {
        // Remove the liked/disliked recommendation from the page
        form.closest('li').remove()

        // Fetch a new recommendation
        const newRecommendation = await fetchNewRecommendation()
        if (newRecommendation) {
            // Append the new recommendation to the page
            const ul = document.querySelector('ul')
            const li = createRecommendationElement(newRecommendation)
            ul.appendChild(li)
        }
    }
}

async function fetchNewRecommendation() {
    const res = await fetch('/new-recommendation')
  
    if (res.ok) {
        const data = await res.json()
        return data.recommendation
    }
  
    return null
}

function createRecommendationElement(track) {
    const li = document.createElement('li')
    const imageUrl = track.album.images[0].url
    const trackName = track.name
    const trackId = track.id
    const artistNames = track.artists.map(artist => artist.name)

    li.innerHTML = `
        <img src="${imageUrl}" alt="${trackName}">
        <h3>${trackName}</h3>
        <p>${artistNames.join(', ')}</p>
        <form>
            <input type="hidden" name="track_id" value="${trackId}" class="input" />
            <input type="hidden" name="track_name" value="${trackName}" class="input" />
            <input type="hidden" name="track_artists" value='${JSON.stringify(artistNames)}' class="input" />
            <input type="hidden" name="track_images" value='${JSON.stringify(track.album.images)}' class="input" />
            <button type="submit" name="action" value="like" class="like-button">LIKE</button>
            <button type="submit" name="action" value="dislike" class="dislike-button">DISLIKE</button>
        </form>
        <button class="preview-button" data-preview-url="${track.preview_url}">Play Preview</button>
    `

    // Add event listeners for the "Like" and "Dislike" buttons
    const likeButton = li.querySelector('.like-button')
    const dislikeButton = li.querySelector('.dislike-button')

    likeButton.addEventListener('click', (e) => handleButtonClick(e, 'like'))
    dislikeButton.addEventListener('click', (e) => handleButtonClick(e, 'dislike'))

    // Add event listener for the preview button
    const previewButton = li.querySelector('.preview-button')
    previewButton.addEventListener('click', () => handlePreviewButtonClick(previewButton))

    return li
}

likeButtons.forEach(likeButton => {
    likeButton.addEventListener('click', (e) => handleButtonClick(e, 'like'))
})

dislikeButtons.forEach(dislikeButton => {
    dislikeButton.addEventListener('click', (e) => handleButtonClick(e, 'dislike'))
})

let currentAudio = new Audio()

const handlePreviewButtonClick = (button) => {
    const previewUrl = button.getAttribute('data-preview-url')

    if (currentAudio.src !== previewUrl) {
        currentAudio.src = previewUrl
        currentAudio.play()
        button.textContent = "Pause Preview"
    } else {
        if (currentAudio.paused) {
            currentAudio.play()
            button.textContent = "Pause Preview"
        } else {
            currentAudio.pause()
            button.textContent = "Play Preview"
        }
    }

    currentAudio.onended = () => {
        button.textContent = "Play Preview"
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.preview-button').forEach(button => {
        button.addEventListener('click', () => handlePreviewButtonClick(button))
    })
})