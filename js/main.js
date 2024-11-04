document.getElementById('scrollButton').addEventListener('click', function() {
    window.scrollTo({top: 0, behavior: 'smooth'});
});

function copyEmail() {
    // Get the email address from the button text
    const email = document.querySelector('#email-block .main-text').innerText;

    // Create a temporary textarea to hold the email
    const textarea = document.createElement('textarea');
    textarea.value = email;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy'); // Copy the email to the clipboard
    document.body.removeChild(textarea); // Remove the textarea
    alert('Email copied to clipboard!'); // Optional alert for user feedback
}



