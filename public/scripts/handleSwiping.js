document.addEventListener('DOMContentLoaded', function() {
    const swipeThreshold = 20
    const cards = document.querySelectorAll('.card > .article');
    const cardsContainer = document.querySelector('.cards-container');

    let currentAudio = new Audio();
    let animationFrameId;

    function handleSwipe(card, liked) {
        const currentCard = card.closest('.card');
    
        if (liked) {
            handleCardEvent(currentCard, 'like');
        } else {
            handleCardEvent(currentCard, 'dislike');
        }
    
        card.style.transition = 'transform 0.3s ease-out';
    
        const direction = liked ? 1 : -1;
        card.style.transform = `translateX(${direction * 1000}px) rotate(${direction * 45}deg)`;
    
        setTimeout(() => {
            currentCard.remove();
        }, 300);
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
            card.style.transition = ''; 
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
                card.style.transform = 'translateX(0) rotate(0)';
                resetButtonStyles(card.closest('.card'));
            }
        });

        card.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            currentX = startX;
            isDragging = true;
            card.style.transition = ''; 
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
                card.style.transform = 'translateX(0) rotate(0)';
                resetButtonStyles(card.closest('.card'));
            }
        });

        const songCard = card.closest('.card');
        const likeButton = songCard.querySelector('.like-button');
        const dislikeButton = songCard.querySelector('.dislike-button');
        const previewButton = songCard.querySelector('.preview-button');

        likeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            handleCardEvent(songCard, 'like', e);
            colorizeButton(songCard, 'like');
            setTimeout(() => {
                resetButtonStyles(songCard);
            }, 500)
        });

        dislikeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            handleCardEvent(songCard, 'dislike', e);
            colorizeButton(songCard, 'dislike');
            setTimeout(() => {
                resetButtonStyles(songCard);
            }, 500)
        });

        previewButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            handlePreviewButtonClick(previewButton);
        })
        
    }

    function colorizeButton(songCard, action) {
        const dislikeBtn = songCard.querySelector('.dislike-button');
        const likeBtn = songCard.querySelector('.like-button');

        if (action === 'like') {
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




    let startTime = null;
    let pauseTime = null;

    function updateProgressRing(button, progress) {
        const circle = button.querySelector('.progress-ring circle');
        if (circle) {
            const radius = circle.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (progress / 100) * circumference;
            circle.style.strokeDashoffset = - offset;
        }
    }
    
    function animateProgress(button, duration) {
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min((elapsed / duration) * 100, 100);
            updateProgressRing(button, progress);
    
            if (progress < 100) {
                animationFrameId = requestAnimationFrame(step);
            } else {
                cancelAnimationFrame(animationFrameId);
            }
        }
    
        animationFrameId = requestAnimationFrame(step);
    }
    
    function handlePreviewButtonClick(button) {
        const previewUrl = button.getAttribute('data-preview-url');
        const previewIcon = button.querySelector('img');
    
        if (currentAudio.src !== previewUrl) {
            startAudioPreview(previewUrl, previewIcon, button);
        } else {
            if (currentAudio.paused) {
                resumeAudioPreview(previewIcon, button);
            } else {
                pauseAudioPreview(previewIcon);
            }
        }
    
        currentAudio.onended = () => {
            stopAudioPreview(previewIcon, button);
        };
    }
    
    function startAudioPreview(previewUrl, previewIcon, button) {
        currentAudio.src = previewUrl;
        currentAudio.volume = 0.3;
        currentAudio.play();
        previewIcon.src = "images/pause.svg";
        startTime = performance.now();
        animateProgress(button, 30000); // 30 seconds for the preview
    }
    
    function resumeAudioPreview(previewIcon, button) {
        currentAudio.play();
        previewIcon.src = "images/pause.svg";
        startTime += performance.now() - pauseTime; // Adjust start time based on pause time
        animateProgress(button, 30000 - (performance.now() - pauseTime)); // resume animation
    }
    
    function pauseAudioPreview(previewIcon) {
        currentAudio.pause();
        previewIcon.src = "images/play.svg";
        pauseTime = performance.now(); // Store pause time
        cancelAnimationFrame(animationFrameId);
    }
    
    function stopAudioPreview(previewIcon, button) {
        previewIcon.src = "images/play.svg";
        updateProgressRing(button, 0); // reset progress
        cancelAnimationFrame(animationFrameId);
    }
    


    cards.forEach((card) => {
        attachEventListeners(card);
    });


    const handleCardEvent = async (songCard, action, e) => {

        // Timeout zodat de animatie kan afspelen/afronden
        setTimeout(() => {
            songCard.remove();
            
            // Timeout voor soepelere overgang
            setTimeout(() => {
                // Play the preview of the next card
                const nextCard = cardsContainer.querySelector('.card:nth-of-type(1)'); // nth-of-type(1) is the second card
                const previewButton = nextCard.querySelector('.preview-button');
                handlePreviewButtonClick(previewButton);
            }, 250)

        }, 250)

        if (e) e.preventDefault();

        const form = songCard.querySelector('form');
        const trackId = form.querySelector('input[name="track_id"]').value;
        const trackName = form.querySelector('input[name="track_name"]').value;
        const trackArtists = JSON.parse(form.querySelector('input[name="track_artists"]').value);
        const trackImages = JSON.parse(form.querySelector('input[name="track_images"]').value);

        const card = songCard.querySelector('.article');
        const direction = action === 'like' ? 1 : -1;

        card.style.transition = 'transform 0.3s ease-out';
        card.style.transform = `translateX(${direction * 1000}px) rotate(${direction * 45}deg)`;

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
            // Fetch the next recommendation
            const newRecommendation = await fetchNewRecommendation();
            setTimeout(() => {
                if (newRecommendation) {
                    // Create a new card for the next recommendation
                    const newCard = createCardElement(newRecommendation);
                    cardsContainer.appendChild(newCard);
                }
            }, 300);
        };
    }

    async function fetchNewRecommendation() {
        const res = await fetch('/new-recommendation');

        if (res.ok) {
            const data = await res.json();
            return data.recommendation;
        }

        return null;
    }

    let cardsIndex = 0;

    function createCardElement(track) {
        const card = document.createElement('div');
        card.classList.add('card');
        card.classList.add('card-' + cardsIndex);
        cardsIndex++;

        const imageUrl = track.album.images[0].url;
        const trackName = track.name;
        const trackId = track.id;
        const artistNames = track.artists.map(artist => artist.name);

        card.innerHTML = `
            <article class="article">
                <header style="background-image: url(${imageUrl})"></header>
                <section>
                    <div>
                        <h3>${trackName}</h3>
                        <p>${artistNames.join(', ')}</p>
                    </div>
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
                        <svg class="progress-ring" width="100" height="100">
                            <circle cx="50" cy="50" r="35"></circle>
                        </svg>
                        <img src="images/play.svg" alt="play icon">
                    </button>
                    <button type="submit" name="action" value="like" class="like-button">
                        <img src="images/like.svg" alt="like icon">
                    </button>
                </form>
            </div>
        `;
        
        const innerCard = card.querySelector('.article');
        attachEventListeners(innerCard);

        return card;
    }
});




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
