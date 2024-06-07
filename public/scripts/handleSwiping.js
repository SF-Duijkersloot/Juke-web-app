document.addEventListener('DOMContentLoaded', function() {
    const swipeThreshold = 200;
    const cards = document.querySelectorAll('.card > .article');

    function handleSwipe(card, liked) {
        if (liked) {
            console.log('Liked', card);
            handleButtonClick(card.closest('.card'), 'like');
        } else {
            console.log('Disliked', card);
            handleButtonClick(card.closest('.card'), 'dislike');
        }

        // Reset card position
        card.style.transform = 'translateX(0) rotate(0)';

        // Reset button styles
        resetButtonStyles(card.closest('.card'));
    }

    function onMove(clientX, startX, card) {
        const offsetX = clientX - startX;
        const rotation = offsetX / 20;
        card.style.transform = `translateX(${offsetX}px) rotate(${rotation}deg)`;

        const songCard = card.closest('.card');
        const dislikeBtn = songCard.querySelector('.dislike-button');
        const likeBtn = songCard.querySelector('.like-button');

        if (offsetX > 0) {
            likeBtn.style.backgroundColor = '#a2daa7';
            likeBtn.style.border = '.1em #1cc02a solid';
            dislikeBtn.style.backgroundColor = '';
            dislikeBtn.style.border = '';
        } else {
            dislikeBtn.style.backgroundColor = '#f19f99';
            dislikeBtn.style.border = '.1em #c0271c solid';
            likeBtn.style.backgroundColor = '';
            likeBtn.style.border = '';
        }
    }

    function attachEventListeners(card) {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        card.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentX = startX;
        });

        card.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            onMove(currentX, startX, card);
        });

        card.addEventListener('touchend', () => {
            const offsetX = currentX - startX;
            if (Math.abs(offsetX) > swipeThreshold) {
                handleSwipe(card, offsetX > swipeThreshold);
            } else {
                // Snap back if the threshold isn't met
                card.style.transform = 'translateX(0) rotate(0)';
                resetButtonStyles(card.closest('.card'));
            }
        });

        card.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            currentX = startX;
            isDragging = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            currentX = e.clientX;
            onMove(currentX, startX, card);
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            const offsetX = currentX - startX;
            if (Math.abs(offsetX) > swipeThreshold) {
                handleSwipe(card, offsetX > swipeThreshold);
            } else {
                // Snap back if the threshold isn't met
                card.style.transform = 'translateX(0) rotate(0)';
                resetButtonStyles(card.closest('.card'));
            }
        });
    }

    cards.forEach((card) => {
        attachEventListeners(card);
    });

    function resetButtonStyles(songCard) {
        const dislikeBtn = songCard.querySelector('.dislike-button');
        const likeBtn = songCard.querySelector('.like-button');

        if (dislikeBtn) {
            dislikeBtn.style.backgroundColor = '';
            dislikeBtn.style.border = '';
        }
        if (likeBtn) {
            likeBtn.style.backgroundColor = '';
            likeBtn.style.border = '';
        }
    }

    const handleButtonClick = async (songCard, action, e) => {
        // e.preventDefault();
        const form = songCard.querySelector('form');
        const trackId = form.querySelector('input[name="track_id"]').value;
        const trackName = form.querySelector('input[name="track_name"]').value;
        const trackArtists = JSON.parse(form.querySelector('input[name="track_artists"]').value);
        const trackImages = JSON.parse(form.querySelector('input[name="track_images"]').value);

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
            songCard.remove();

            // Fetch a new recommendation
            const newRecommendation = await fetchNewRecommendation();
            if (newRecommendation) {
                // Append the new recommendation to the page
                const cardsContainer = document.querySelector('.cards-container');
                const newCard = createCardElement(newRecommendation);
                cardsContainer.appendChild(newCard);
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
    
    function createCardElement(track) {
        const card = document.createElement('div');
        card.classList.add('card');
        // card.style.zIndex = 0;
    
        const imageUrl = track.album.images[0].url;
        const trackName = track.name;
        const trackId = track.id;
        const artistNames = track.artists.map(artist => artist.name);
    
        card.innerHTML = `
            <div class="card">
                <article class="article">
                    <header style="background-image: url(${imageUrl})"></header>
                    <section>
                        <div>
                            <h3>${trackName}</h3>
                            <p>${artistNames.join(', ')}</p>
                        </div>
                        <aside>
                            <p>${artistNames.join(', ')}</p>
                        </aside>
                    </section>
                </article>
                <div class="track-buttons">
                    <form>
                        <input type="hidden" name="track_id" value="${trackId}" class="input" />
                        <input type="hidden" name="track_name" value="${trackName}" class="input" />
                        <input type="hidden" name="track_artists" value='${JSON.stringify(artistNames)}' class="input" />
                        <input type="hidden" name="track_images" value='${JSON.stringify(track.album.images)}' class="input" />
                        <button type="submit" name="action" value="dislike" class="dislike-button">
                            <img src="images/dislike.svg" alt="dislike icon">
                        </button>
                        <button class="preview-button" data-preview-url="${track.preview_url}">
                            <img src="images/play.svg" alt="play icon">
                        </button>
                        <button type="submit" name="action" value="like" class="like-button">
                            <img src="images/Like.svg" alt="like icon">
                        </button>
                    </form>
                </div>
            </div>
        `;
    
        // Add event listeners to the new card
        const likeButton = card.querySelector('.like-button');
        const dislikeButton = card.querySelector('.dislike-button');
    
        likeButton.addEventListener('click', (e) => handleButtonClick(card, 'like', e));
        dislikeButton.addEventListener('click', (e) => handleButtonClick(card, 'dislike', e));
    
        const previewButton = card.querySelector('.preview-button');
        previewButton.addEventListener('click', (e) => handlePreviewButtonClick(previewButton, e));
    
        attachEventListeners(card);
    
        return card;
    }
    

})




/*==========================================\

         Oude code voor vergelijking

===========================================*/

// document.addEventListener('DOMContentLoaded', function() {
//     let songs = [
//         { cover: 'images/Olivia.jpeg', title: 'Drivers License', artist: 'Olivia Rodrigo', genre: 'Pop' },
//         { cover: 'images/Harry.jpeg', title: 'Watermelon Sugar', artist: 'Harry Styles', genre: 'Pop' },
//         { cover: 'images/Miley.jpeg', title: 'Wrecking Ball', artist: 'Miley Cyrus', genre: 'Pop' }
//     ]

//     let currentSongIndex = 0
//     let card = document.querySelector('.article')
//     let dislikeBtn = document.querySelector('.dislike-btn')
//     let likeBtn = document.querySelector('.like-btn')
//     let playBtn = document.querySelector('.play-btn')
    
//     function loadSong(song) {
//         card.querySelector('.card header').style.backgroundImage = `url(${song.cover})`
//         card.querySelector('section div h3').textContent = song.title
//         card.querySelector('section div p').textContent = song.artist
//         card.querySelector('aside p').textContent = song.genre
//     }
    
//     function handleSwipe(offsetX) {
//         if (offsetX > 50 || offsetX < -50) {
//             let liked = offsetX > 50
//             console.log(liked ? 'Liked' : 'Disliked', songs[currentSongIndex])
            
//             currentSongIndex = (currentSongIndex + 1) % songs.length
//             loadSong(songs[currentSongIndex])
            
//             card.style.transition = 'none'
//             card.style.transform = 'translateX(0) rotate(0)'
//             setTimeout(() => {
//                 card.style.transition = 'transform 0.3s ease'
//             }, 50)
            
//             dislikeBtn.style.backgroundColor = ''
//             dislikeBtn.style.border = ''
//             likeBtn.style.backgroundColor = ''
//             likeBtn.style.border = ''

//         } else {
//             card.style.transform = 'translateX(0) rotate(0)'

//             dislikeBtn.style.backgroundColor = ''
//             dislikeBtn.style.border = ''
//             likeBtn.style.backgroundColor = ''
//             likeBtn.style.border = ''
//         }
//     }

//     loadSong(songs[currentSongIndex])

//     let startX = 0
//     let currentX = 0
//     let isDragging = false

//     function onMove(clientX) {
//         currentX = clientX
//         let offsetX = currentX - startX
//         let rotation = offsetX / 20 
//         card.style.transform = `translateX(${offsetX}px) rotate(${rotation}deg)`

//         if (offsetX > 0) {
//             likeBtn.style.backgroundColor = '#a2daa7' 
//             likeBtn.style.border = '.1em #1cc02a solid'
//             dislikeBtn.style.backgroundColor = ''
//             dislikeBtn.style.border = ''
//         } else {
//             dislikeBtn.style.backgroundColor = '#f19f99'
//             dislikeBtn.style.border = '.1em #c0271c solid'
//             likeBtn.style.backgroundColor = ''
//             likeBtn.style.border = ''
//         }
//     }

//     card.addEventListener('touchstart', (e) => {
//         startX = e.touches[0].clientX
//         currentX = startX
//     })

//     card.addEventListener('touchmove', (e) => {
//         onMove(e.touches[0].clientX)
//     })

//     card.addEventListener('touchend', () => {
//         let offsetX = currentX - startX
//         handleSwipe(offsetX)
//     })

//     card.addEventListener('mousedown', (e) => {
//         startX = e.clientX
//         currentX = startX
//         isDragging = true
//     })

//     document.addEventListener('mousemove', (e) => {
//         if (!isDragging) return
//         onMove(e.clientX)
//     })

//     document.addEventListener('mouseup', () => {
//         if (!isDragging) return
//         isDragging = false
//         let offsetX = currentX - startX
//         handleSwipe(offsetX)
//     })

//     dislikeBtn.addEventListener('click', () => {
//         handleSwipe(-101)
//     })

//     likeBtn.addEventListener('click', () => {
//         handleSwipe(101) 
//     })

//     playBtn.addEventListener('click', () => {
      
//         console.log('Play song:', songs[currentSongIndex])
//     })
// })
