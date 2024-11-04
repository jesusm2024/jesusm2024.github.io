document.addEventListener("DOMContentLoaded", () => {
    const circles = document.querySelectorAll(".pulse-circle");

    circles.forEach(circle => {
        setRandomPosition(circle);

        // Update position at intervals
        setInterval(() => {
            setRandomPosition(circle);
        }, 8000); // Move each circle every 8 seconds
    });
});

// Function to set a random position for a circle across the full viewport
function setRandomPosition(circle) {
    const randomTop = Math.random() * 100; // Random value for top (0-100%)
    const randomLeft = Math.random() * 100; // Random value for left (0-100%)

    circle.style.top = `${randomTop}vh`;
    circle.style.left = `${randomLeft}vw`;
}
