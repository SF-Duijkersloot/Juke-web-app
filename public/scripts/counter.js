const counters = document.querySelectorAll('.counter');
const speed = 200; // Hoe lager, hoe langzamer

counters.forEach(counter => {
    const updateCount = () => {
        const target = +counter.getAttribute('data-target');
        let count = +counter.innerText;

        // Lagere 'inc' om langzamer te gaan, hogere om sneller te gaan
        const inc = target / speed;

        // Check of het doel is bereikt
        if (count < target) {
            // Voeg 'inc' toe aan 'count' en toon in de teller
            count += inc;
            counter.innerText = Math.ceil(count); // Afronden naar boven om hele getallen te krijgen
            // Roep de functie elke milliseconde opnieuw aan
            setTimeout(updateCount, 50);
        } else {
            counter.innerText = target;
        }
    };

    updateCount();
});
