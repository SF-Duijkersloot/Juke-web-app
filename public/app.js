const likeButtons = document.querySelectorAll('.like-button');
const dislikeButtons = document.querySelectorAll('.dislike-button');

const handleButtonClick = async (e, action) => {
    e.preventDefault();

    const form = e.target.closest('form');
    const trackId = form.querySelector('input[name="track_id"]').value;
    const trackName = form.querySelector('input[name="track_name"]').value;
    const trackArtists = form.querySelector('input[name="track_artists"]').value;
    const trackImages = form.querySelector('input[name="track_images"]').value;

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
    });

    if (res.ok) {
        // Remove the liked/disliked recommendation from the page
        form.closest('li').remove();

        // Fetch a new recommendation
        const newRecommendation = await fetchNewRecommendation();
        if (newRecommendation) {
            // Append the new recommendation to the page
            const ul = document.querySelector('ul');
            const li = createRecommendationElement(newRecommendation);
            ul.appendChild(li);
        }
    }
};  

async function fetchNewRecommendation() {
    const res = await fetch('/new-recommendation');
  
    if (res.ok) {
      const data = await res.json();
      return data.recommendation;
    }
  
    return null;
}

function createRecommendationElement(track) {
    const li = document.createElement('li');
    const imageUrl = track.album.images[0].url;
    const trackName = track.name;
    const artistName = track.artists[0].name;
    const trackId = track.id;

    li.innerHTML = `
        <img src="${imageUrl}" alt="${trackName}">
        <h3>${trackName}</h3>
        <p>${artistName}</p>
        <form>
            <input type="hidden" name="track_id" value="${trackId}">
            <input type="hidden" name="track_name" value="${trackName}">
            <input type="hidden" name="track_artists" value="${JSON.stringify(track.artists.map(artist => artist.name))}">
            <input type="hidden" name="track_images" value="${JSON.stringify(track.album.images)}">
            <button type="button" class="like-button">Like</button>
            <button type="button" class="dislike-button">Dislike</button>
        </form>
    `;

    // Add event listeners for the "Like" and "Dislike" buttons
    const likeButton = li.querySelector('.like-button');
    const dislikeButton = li.querySelector('.dislike-button');

    likeButton.addEventListener('click', (e) => handleButtonClick(e, 'like'));
    dislikeButton.addEventListener('click', (e) => handleButtonClick(e, 'dislike'));

    return li;
}

likeButtons.forEach(likeButton => {
    likeButton.addEventListener('click', (e) => handleButtonClick(e, 'like'));
});

dislikeButtons.forEach(dislikeButton => {
    dislikeButton.addEventListener('click', (e) => handleButtonClick(e, 'dislike'));
});
