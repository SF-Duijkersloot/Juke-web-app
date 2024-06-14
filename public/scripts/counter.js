const counters = document.querySelectorAll('.counter');
const speed = 200;

counters.forEach(counter => {
    const updateCount = () => {
        const target = +counter.getAttribute('data-target');
        let count = +counter.innerText;

        const inc = target / speed;

        if (count < target) {
            count += inc;
            counter.innerText = Math.ceil(count); 
            setTimeout(updateCount, 50);
        } else {
            counter.innerText = target;
        }
    };

    updateCount();
});
