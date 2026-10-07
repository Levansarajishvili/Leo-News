

const questions = document.querySelectorAll(".question");

questions.forEach(function (question) {
    const btn = question.querySelector(".question-btn");
    btn.addEventListener('click', function(){

        questions.forEach(function(item) {
         if (item !== question) {
            item.classList.remove("show-text");
         }
        });

        question.classList.toggle("show-text");
    });
});


// ---------- ჩამოსაშლელი პანელები (ძიება, მობილური მენიუ) ----------
// პანელი იხსნება/იხურება კლასით "is-open"; ღილაკის aria-expanded ბურგერის X-ანიმაციასაც მართავს.

const MOBILE_PANELS = ["mobileMenu", "mobSearchFoor"];

function setPanel(id, open) {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.classList.toggle("is-open", open);
    document.querySelectorAll('[aria-controls="' + id + '"]').forEach(function (btn) {
        btn.setAttribute("aria-expanded", open);
    });
}

function togglePanel(id, group) {
    const panel = document.getElementById(id);
    if (!panel) return;
    const open = !panel.classList.contains("is-open");
    // ერთდროულად ერთი პანელი: მენიუს გახსნა ძიებას ხურავს და პირიქით
    (group || []).forEach(function (other) {
        if (other !== id) setPanel(other, false);
    });
    setPanel(id, open);
}

function mySearchFunct() {
    togglePanel("searchFoor");
}

function mobSearchFunct() {
    togglePanel("mobSearchFoor", MOBILE_PANELS);
}

function mobMenuFunct() {
    togglePanel("mobileMenu", MOBILE_PANELS);
}

// Esc ხურავს ღია პანელს
document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    MOBILE_PANELS.concat("searchFoor").forEach(function (id) {
        setPanel(id, false);
    });
});
