/* zoekpagina */



document.addEventListener("DOMContentLoaded", function() {
    var menuButton = document.querySelector(".navigatieButton");
    var hetMenu = document.querySelector(".navigatieContent");

    menuButton.onclick = toggleMenu;

    function toggleMenu() {
        menuButton.classList.toggle("open");
        hetMenu.classList.toggle("open");
    }
});




// -------------------swipe-----------------


document.addEventListener('DOMContentLoaded', function() {
    let songs = [
        { cover: 'images/Olivia.jpeg', title: 'Drivers License', artist: 'Olivia Rodrigo', genre: 'Pop' },
        { cover: 'images/Harry.jpeg', title: 'Watermelon Sugar', artist: 'Harry Styles', genre: 'Pop' },
        { cover: 'images/Miley.jpeg', title: 'Wrecking Ball', artist: 'Miley Cyrus', genre: 'Pop' }
    ];

    let currentSongIndex = 0;
    let card = document.querySelector('.article');
    let dislikeBtn = document.querySelector('.dislike-btn');
    let likeBtn = document.querySelector('.like-btn');
    let playBtn = document.querySelector('.play-btn');
    
    function loadSong(song) {
        card.querySelector('.card header').style.backgroundImage = `url(${song.cover})`;
        card.querySelector('section div h3').textContent = song.title;
        card.querySelector('section div p').textContent = song.artist;
        card.querySelector('aside p').textContent = song.genre;
    }
    
    function handleSwipe(offsetX) {
        if (offsetX > 50 || offsetX < -50) {
            let liked = offsetX > 50;
            console.log(liked ? 'Liked' : 'Disliked', songs[currentSongIndex]);
            
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            loadSong(songs[currentSongIndex]);
            
            card.style.transition = 'none';
            card.style.transform = 'translateX(0) rotate(0)';
            setTimeout(() => {
                card.style.transition = 'transform 0.3s ease';
            }, 50);
            
            dislikeBtn.style.backgroundColor = '';
            dislikeBtn.style.border = '';
            likeBtn.style.backgroundColor = '';
            likeBtn.style.border = '';

        } else {
            card.style.transform = 'translateX(0) rotate(0)';

            dislikeBtn.style.backgroundColor = '';
            dislikeBtn.style.border = '';
            likeBtn.style.backgroundColor = '';
            likeBtn.style.border = '';
        }
    }

    loadSong(songs[currentSongIndex]);

    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    function onMove(clientX) {
        currentX = clientX;
        let offsetX = currentX - startX;
        let rotation = offsetX / 20; 
        card.style.transform = `translateX(${offsetX}px) rotate(${rotation}deg)`;

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

    card.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        currentX = startX;
    });

    card.addEventListener('touchmove', (e) => {
        onMove(e.touches[0].clientX);
    });

    card.addEventListener('touchend', () => {
        let offsetX = currentX - startX;
        handleSwipe(offsetX);
    });

    card.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        currentX = startX;
        isDragging = true;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        onMove(e.clientX);
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        let offsetX = currentX - startX;
        handleSwipe(offsetX);
    });

    dislikeBtn.addEventListener('click', () => {
        handleSwipe(-101);
    });

    likeBtn.addEventListener('click', () => {
        handleSwipe(101); 
    });

    playBtn.addEventListener('click', () => {
      
        console.log('Play song:', songs[currentSongIndex]);
    });
});
