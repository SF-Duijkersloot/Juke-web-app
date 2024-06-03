document.querySelectorAll('.like, .dislike').forEach(button => {
    button.addEventListener('click', async function(e) {
        e.preventDefault();
        const input = this.parentElement.querySelector('.input');

        if (input.value === '') {
            return;
        }

        const baseUrl = 'http://localhost:3000';
        const action = this.classList.contains('like') ? 'like' : 'dislike';
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parcel: input.value,
                action: action
            })
        });
    });
});


// play song function

let currentAudio = new Audio();

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.preview-button').forEach(button => {
        button.addEventListener('click', () => {
            const previewUrl = button.getAttribute('data-preview-url');
            
            if (currentAudio.src !== previewUrl) {
                currentAudio.src = previewUrl;
                currentAudio.play();
                button.textContent = "Pause Preview";
            } else {
                if (currentAudio.paused) {
                    currentAudio.play();
                    button.textContent = "Pause Preview";
                } else {
                    currentAudio.pause();
                    button.textContent = "Play Preview";
                }
            }

            currentAudio.onended = () => {
                button.textContent = "Play Preview";
            };
        });
    });
});


