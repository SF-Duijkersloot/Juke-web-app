const likeButtons = document.querySelectorAll('.like-button');
const dislikeButtons = document.querySelectorAll('.dislike-button');

likeButtons.forEach(likeButton => {
    const input = likeButton.closest('form').querySelector('.input');

    likeButton.addEventListener('click', async function(e) {
        e.preventDefault();

        const trackId = input.value;

        // Send a request to the /like route
        const res = await fetch('/like', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ track_id: trackId })
        });
    });
});

dislikeButtons.forEach(dislikeButton => {
    const input = dislikeButton.closest('form').querySelector('.input');

    dislikeButton.addEventListener('click', async (e) => {
        e.preventDefault();

        const trackId = input.value;

        // Send a request to the /dislike route
        const res = await fetch('/dislike', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ track_id: trackId })
        });

        // // Handle the server response
        // const data = await res.json();
        // console.log(data.status);
    });
});