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
